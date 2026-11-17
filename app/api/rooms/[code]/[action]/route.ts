import { NextResponse } from 'next/server';
import { z } from 'zod';
import { admin, allow, authUser } from '@/lib/admin';
import { learnedKey, scoreRound, type Result } from '@/lib/engine';
import { applyTwist, pickTwist, scoreOptsFor } from '@/lib/twists';
import { timeFactor, type TwistId } from '@/lib/twistmeta';
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY';
const GRACE_MS = 3000; // network latency allowance for submissions
const VOTE_MS = 20000; // how long players have to vote on a challenge
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function POST(req: Request, { params }: { params: { code: string; action: string } }) {
  const user = await authUser(req);
  if (!user) return err('Sign in required', 401);
  const db = admin(), body = await req.json().catch(() => ({}));
  const limits: Record<string, number> = { submit: 12, join: 20, start: 20, kick: 20, review: 60, challenge: 15, vote: 60, resolve: 60 };
  if (!(await allow(db, user.id, 'api', 150, 60)) || !(await allow(db, user.id, params.action, limits[params.action] ?? 60, 60))) return err('Too many requests — slow down', 429);
  const { data: room } = await db.from('rooms').select('*').eq('code', params.code.toUpperCase()).maybeSingle();
  if (!room) return err('Room not found', 404);
  const { data: me } = await db.from('room_members').select('*').eq('room_id', room.id).eq('user_id', user.id).maybeSingle();
  const isHost = room.host_id === user.id;
  if (me?.kicked) return err('You were removed from this room', 403);
  const latest = async () => (await db.from('rounds').select('*').eq('room_id', room.id).order('number', { ascending: false }).limit(1)).data?.[0];

  if (params.action === 'join') {
    const p = z.object({ nickname: z.string().trim().min(2).max(20), avatar: z.string().max(8).default('🧠') }).safeParse(body);
    if (!p.success) return err('Pick a nickname (2–20 characters)');
    if (!me) {
      if (room.status !== 'lobby') return err('This game has already started', 409);
      const { count } = await db.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id).eq('kicked', false);
      if ((count ?? 0) >= 12) return err('Room is full', 409);
    }
    const { error } = await db.from('room_members').upsert({ room_id: room.id, user_id: user.id, ...p.data, ...(me ? {} : { total_score: 0 }) }, { onConflict: 'room_id,user_id', ignoreDuplicates: false });
    return error ? err(error.message, 500) : NextResponse.json({ ok: true });
  }
  if (!me) return err('Join the room first', 403);

  if (params.action === 'ready') { await db.from('room_members').update({ ready: !me.ready }).eq('room_id', room.id).eq('user_id', user.id); return NextResponse.json({ ok: true }); }
  if (params.action === 'kick') {
    if (!isHost) return err('Host only', 403);
    const t = z.object({ userId: z.string().uuid() }).safeParse(body);
    if (!t.success || t.data.userId === user.id) return err('Invalid target');
    await db.from('room_members').update({ kicked: true }).eq('room_id', room.id).eq('user_id', t.data.userId);
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'review') {
    if (!isHost) return err('Host only', 403);
    const p = z.object({ scoreId: z.number().int(), approve: z.boolean() }).safeParse(body);
    if (!p.success) return err('Invalid review');
    const { data: s } = await db.from('scores').select('*').eq('id', p.data.scoreId).eq('room_id', room.id).maybeSingle();
    if (!s || !s.flagged) return err('Nothing to review', 404);
    if (p.data.approve) await db.from('scores').update({ flagged: false, reason: s.reason + ' ✔ Approved by host.' }).eq('id', s.id);
    else {
      await db.from('scores').update({ flagged: false, status: 'invalid', points: 0, reason: 'Rejected by host review.' }).eq('id', s.id);
      const { data: m } = await db.from('room_members').select('total_score').eq('room_id', room.id).eq('user_id', s.user_id).single();
      await db.from('room_members').update({ total_score: Math.max(0, (m?.total_score ?? 0) - s.points) }).eq('room_id', room.id).eq('user_id', s.user_id);
      if (room.status === 'finished') {
        const { data: mh } = await db.from('match_history').select('*').eq('room_id', room.id);
        const upd = (mh ?? []).map((r) => (r.user_id === s.user_id ? { ...r, score: Math.max(0, r.score - s.points) } : r)).sort((a, b) => b.score - a.score);
        await Promise.all(upd.map((r, i) => db.from('match_history').update({ score: r.score, rank: i + 1 }).eq('id', r.id)));
      }
    }
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'start') {
    if (!isHost) return err('Host only', 403);
    const cur = await latest();
    if (room.status === 'finished' || (cur && cur.status !== 'done')) return err('Cannot start now', 409);
    if (cur && cur.number >= room.rounds) return err('All rounds played', 409);
    const used = (await db.from('rounds').select('letter').eq('room_id', room.id)).data?.map((r) => r.letter) ?? [];
    const pool = [...LETTERS].filter((l) => !used.includes(l)), pick = pool.length ? pool : [...LETTERS]; // letters recycle after all have been used
    const letter = pick[Math.floor(Math.random() * pick.length)];
    const { count: players } = await db.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id).eq('kicked', false);
    const number = (cur?.number ?? 0) + 1, tw = pickTwist(number, room.rounds, room.categories, players ?? 1, room.twists ?? undefined);
    const { error } = await db.from('rounds').insert({ room_id: room.id, number, letter, twist: tw.id, twist_data: tw.data, ends_at: new Date(Date.now() + room.duration * timeFactor(tw.id) * 1000).toISOString() });
    if (error) return err(error.code === '23505' ? 'Round already started' : error.message, 409);
    await db.from('rooms').update({ status: 'playing' }).eq('id', room.id);
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'submit') {
    const round = await latest();
    if (!round || round.status !== 'active') return err('No active round', 409);
    if (Date.now() > Date.parse(round.ends_at) + GRACE_MS) return err('Time is up — answers are locked', 409);
    const p = z.record(z.string(), z.string().max(80)).safeParse(body.answers);
    if (!p.success) return err('Invalid answers');
    const data: Record<string, string> = {};
    for (const c of room.categories) data[c] = (p.data[c] ?? '').slice(0, 80);
    const { error } = await db.from('answers').insert({ round_id: round.id, user_id: user.id, room_id: room.id, data });
    if (error) return err(error.code === '23505' ? 'Already submitted — answers cannot be changed' : error.message, error.code === '23505' ? 409 : 500);
    await db.from('room_members').update({ last_submitted_round: round.number }).eq('room_id', room.id).eq('user_id', user.id);
    if (room.first_close && room.categories.every((c: string) => (data[c] ?? '').trim().length > 0)) await db.from('rounds').update({ ends_at: new Date(Date.now() + 2000).toISOString() }).eq('id', round.id).gt('ends_at', new Date(Date.now() + 2000).toISOString()); // others get 2s to auto-submit // first finisher closes the round for everyone
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'finish') {
    const round = await latest();
    if (!round || round.status !== 'active') return NextResponse.json({ ok: true, already: true });
    const { data: members } = await db.from('room_members').select('*').eq('room_id', room.id).eq('kicked', false);
    const allIn = (members ?? []).every((m) => m.last_submitted_round >= round.number);
    if (!(isHost || allIn || Date.now() >= Date.parse(round.ends_at) + GRACE_MS)) return err('Round is still running', 409);
    const { data: won } = await db.from('rounds').update({ status: 'voting' }).eq('id', round.id).eq('status', 'active').select(); // atomic: only one caller closes the round
    if (!won?.length) return NextResponse.json({ ok: true, already: true });
    const { data: ans } = await db.from('answers').select('user_id,data').eq('round_id', round.id);
    const subs: Record<string, Record<string, string>> = {};
    (members ?? []).forEach((m) => (subs[m.user_id] = (ans?.find((a) => a.user_id === m.user_id)?.data as Record<string, string>) ?? {}));
    const { data: lw } = await db.from('learned_words').select('lk');
    const res = scoreRound(round.letter, room.categories, subs, { ...scoreOptsFor((round.twist ?? 'normal') as TwistId, room.unique_points), learned: new Set((lw ?? []).map((x) => x.lk as string)) });
    await db.from('scores').insert(Object.entries(res).flatMap(([uid, cells]) => Object.entries(cells).map(([category, c]) => ({ room_id: room.id, round_id: round.id, user_id: uid, category, answer: c.answer, status: c.status, points: c.points, reason: c.reason, flagged: c.flagged }))));
    if ((members ?? []).length < 2) await tally(db, room, round);
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'ballot') { // every player marks every opponent answer right or wrong; results wait until all have voted
    const p = z.object({ marks: z.array(z.object({ scoreId: z.number().int(), accept: z.boolean() })).max(500) }).safeParse(body);
    if (!p.success) return err('Invalid ballot');
    const round = await latest();
    if (!round || round.status !== 'voting') return err('Voting is not open', 409);
    const { data: targets } = await db.from('scores').select('id').eq('round_id', round.id).eq('status', 'accepted').neq('user_id', user.id).not('category', 'like', '✦%');
    const given = new Map(p.data.marks.map((m) => [m.scoreId, m.accept]));
    if (!(targets ?? []).every((t) => given.has(t.id))) return err('Mark every answer before submitting', 400);
    const { error } = await db.from('ballots').insert({ round_id: round.id, voter_id: user.id });
    if (error) return err(error.code === '23505' ? 'You already voted' : error.message, 409);
    if (targets?.length) await db.from('marks').insert(targets.map((t) => ({ round_id: round.id, score_id: t.id, voter_id: user.id, accept: given.get(t.id) as boolean })));
    const [{ data: mem }, { data: bal }] = await Promise.all([db.from('room_members').select('user_id').eq('room_id', room.id).eq('kicked', false), db.from('ballots').select('voter_id').eq('round_id', round.id)]);
    if ((mem ?? []).every((m) => bal?.some((b) => b.voter_id === m.user_id))) await tally(db, room, round);
    return NextResponse.json({ ok: true });
  }
  if (params.action === 'tally') { // host safety valve if someone has left mid-vote
    if (!isHost) return err('Host only', 403);
    const round = await latest();
    if (!round || round.status !== 'voting') return NextResponse.json({ ok: true, already: true });
    await tally(db, room, round);
    return NextResponse.json({ ok: true });
  }
  return err('Unknown action', 404);
}

/** Counts the votes (majority decides, a tie keeps the answer), applies the round twist, updates totals and moves the game on. */
async function tally(db: ReturnType<typeof admin>, room: any, round: any) {
  const { data: won } = await db.from('rounds').update({ status: 'done' }).eq('id', round.id).eq('status', 'voting').select();
  if (!won?.length) return;
  const [{ data: rows }, { data: marks }, { data: members }] = await Promise.all([db.from('scores').select('*').eq('round_id', round.id), db.from('marks').select('*').eq('round_id', round.id), db.from('room_members').select('*').eq('room_id', room.id).eq('kicked', false)]);
  const tid = (round.twist ?? 'normal') as TwistId, before = Object.fromEntries((members ?? []).map((m) => [m.user_id, m.total_score as number]));
  const res: Result = {}, learn: { lk: string }[] = [];
  (rows ?? []).forEach((r) => { (res[r.user_id] ??= {})[r.category] = { status: r.status, points: r.points, reason: r.reason, flagged: r.flagged, answer: r.answer }; });
  for (const r of rows ?? []) {
    if (r.status !== 'accepted' || r.category.startsWith('✦')) continue;
    const ms = (marks ?? []).filter((m) => m.score_id === r.id), right = ms.filter((m) => m.accept).length, wrong = ms.length - right, cell = res[r.user_id][r.category];
    if (wrong > right) { cell.status = 'invalid'; cell.points = 0; cell.flagged = false; cell.reason = `Rejected by player vote (${right} right, ${wrong} wrong).`; }
    else if (ms.length) { cell.reason += ` ✔ Voted right (${right} right, ${wrong} wrong).`; cell.flagged = false; if (r.flagged && right > 0) learn.push({ lk: learnedKey(r.category, r.answer) }); }
  }
  const bonuses = applyTwist(tid, round.twist_data ?? {}, res, before);
  await db.from('scores').upsert((rows ?? []).map((r) => ({ ...r, ...res[r.user_id][r.category] })));
  if (bonuses.length) await db.from('scores').insert(bonuses.map((b) => ({ room_id: room.id, round_id: round.id, user_id: b.userId, category: '✦ ' + b.label, answer: '', status: b.points >= 0 ? 'bonus' : 'penalty', points: b.points, reason: b.reason, flagged: false })));
  if (learn.length) await db.from('learned_words').upsert(learn, { onConflict: 'lk', ignoreDuplicates: true });
  const totals = (members ?? []).map((m) => ({ m, total: Math.max(0, m.total_score + Object.values(res[m.user_id] ?? {}).reduce((a, c) => a + c.points, 0) + bonuses.filter((b) => b.userId === m.user_id).reduce((a, b) => a + b.points, 0)) }));
  await Promise.all(totals.map((t) => db.from('room_members').update({ total_score: t.total }).eq('room_id', room.id).eq('user_id', t.m.user_id)));
  const last = round.number >= room.rounds;
  await db.from('rooms').update({ status: last ? 'finished' : 'between' }).eq('id', room.id);
  if (last) await db.from('match_history').insert([...totals].sort((a, b) => b.total - a.total).map((t, i) => ({ user_id: t.m.user_id, room_id: room.id, nickname: t.m.nickname, score: t.total, rank: i + 1 })));
}

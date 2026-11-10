'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb, session, api, AVATARS } from '@/lib/client';
import { beep } from '@/lib/sound';
const COLOR: Record<string, string> = { accepted: 'text-lime', duplicate: 'text-yellow-300', invalid: 'text-pink', empty: 'text-white/40' };
export default function Room({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase(), base = `/api/rooms/${code}`;
  const [uid, setUid] = useState(''), [room, setRoom] = useState<any>(), [members, setM] = useState<any[]>([]), [round, setRound] = useState<any>(), [scores, setS] = useState<any[]>([]);
  const [ans, setAns] = useState<Record<string, string>>({}), [err, setErr] = useState(''), [nick, setNick] = useState(''), [av, setAv] = useState('🧠'), [left, setLeft] = useState(0), [ready, setReady] = useState(false);
  const lastL = useRef(99), off = useRef(0), auto = useRef(''), fin = useRef(0), ansRef = useRef(ans); ansRef.current = ans;
  const load = useCallback(async () => {
    const s = sb();
    const { data: r } = await s.from('rooms').select('*').eq('code', code).maybeSingle(); setRoom(r); if (!r) return;
    const [m, rd] = await Promise.all([s.from('room_members').select('*').eq('room_id', r.id).eq('kicked', false).order('total_score', { ascending: false }), s.from('rounds').select('*').eq('room_id', r.id).order('number', { ascending: false }).limit(1)]);
    setM(m.data ?? []); const cur = rd.data?.[0]; setRound(cur);
    if (cur) setS((await s.from('scores').select('*').eq('round_id', cur.id)).data ?? []);
  }, [code]);
  const act = async (a: string, body?: unknown) => { setErr(''); try { await api(`${base}/${a}`, body); if (a === 'submit') beep('submit'); await load(); } catch (e: any) { setErr(e.message); } };
  useEffect(() => {
    let ch: any, t: any, dead = false;
    (async () => {
      const ss = await session(); setUid(ss.user.id); setNick(localStorage.getItem('bi_nick') ?? '');
      const t0 = Date.now(); const { now } = await (await fetch('/api/time')).json(); off.current = now - (t0 + Date.now()) / 2;
      await load(); if (dead) return;
      ch = sb().channel('room-' + code);
      for (const table of ['rooms', 'room_members', 'rounds', 'scores']) ch.on('postgres_changes', { event: '*', schema: 'public', table }, load);
      ch.subscribe(); t = setInterval(load, 4000); // polling fallback keeps reconnects safe
    })().catch((e) => setErr(e.message));
    return () => { dead = true; clearInterval(t); if (ch) sb().removeChannel(ch); };
  }, [code, load]);
  const me = members.find((m) => m.user_id === uid), isHost = room?.host_id === uid;
  const active = round?.status === 'active', submitted = !!me && !!round && me.last_submitted_round >= round.number;
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => {
      const l = Math.ceil((Date.parse(round.ends_at) - (Date.now() + off.current)) / 1000); setLeft(l); if (l > 0 && l <= 5 && l !== lastL.current) beep('tick'); lastL.current = l;
      if (l <= 0 && me && !submitted && auto.current !== round.id) { auto.current = round.id; api(`${base}/submit`, { answers: ansRef.current }).then(load).catch(() => {}); }
      if (l <= -3 && Date.now() - fin.current > 1500) { fin.current = Date.now(); api(`${base}/finish`).then(load).catch(() => {}); }
    }, 250);
    return () => clearInterval(i);
  }, [active, round, me, submitted, base, load]);
  useEffect(() => { setAns({}); }, [round?.id]);
  useEffect(() => { if (round?.status === 'active') beep('go'); if (round?.status === 'done') beep('end'); }, [round?.id, round?.status]);
  useEffect(() => { // everyone submitted -> end the round immediately
    if (active && members.length && members.every((m) => m.last_submitted_round >= round.number) && Date.now() - fin.current > 1500) { fin.current = Date.now(); api(`${base}/finish`).then(load).catch(() => {}); }
  }, [active, members, round, base, load]);

  if (!me) return (<div className="card mx-auto max-w-md space-y-3"><h1 className="text-2xl font-black">Join room {code}</h1>
    <input className="inp" placeholder="Your nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
    <div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAv(a)} className={`rounded-lg px-2 py-1 text-2xl ${av === a ? 'bg-lime' : 'bg-white/10'}`}>{a}</button>)}</div>
    <button className="btn-lime w-full" disabled={nick.trim().length < 2} onClick={() => { localStorage.setItem('bi_nick', nick); act('join', { nickname: nick, avatar: av }); }}>Join</button>{err && <p className="text-pink">{err}</p>}</div>);
  const doneRound = round && round.status === 'done';
  const board = <div className="card space-y-2"><h2 className="font-black">{room.status === 'finished' ? '🏆 Final leaderboard' : 'Leaderboard'}</h2>
    {members.map((m, i) => <div key={m.user_id} className="pop flex items-center justify-between rounded-xl bg-white/10 p-3"><span>{i + 1}. {m.avatar} <b>{m.nickname}</b> {m.user_id === room.host_id && '👑'} {room.status === 'playing' && m.last_submitted_round >= (round?.number ?? 99) && <span className="text-lime text-xs">✓ submitted</span>} {room.status === 'lobby' && m.ready && <span className="text-lime text-xs">ready</span>}</span>
      <span className="flex items-center gap-2"><b className="text-lime">{m.total_score}</b>{isHost && m.user_id !== uid && room.status === 'lobby' && <button className="text-xs text-pink" onClick={() => act('kick', { userId: m.user_id })}>remove</button>}</span></div>)}</div>;
  return (<div className="grid gap-4 md:grid-cols-3"><div className="space-y-4 md:col-span-2">
    <div className="card flex items-center justify-between"><div><div className="text-sm text-white/60">Room code</div><div className="text-3xl font-black tracking-widest">{code}</div></div>
      <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy invite link</button></div>
    {err && <p className="text-pink">{err}</p>}
    {room.status === 'lobby' && <div className="card space-y-3"><h2 className="font-black">Lobby</h2><p className="text-white/70">{room.categories.join(' · ')} — {room.rounds} rounds × {room.duration}s</p>
      <div className="flex gap-2"><button className="btn-ghost" onClick={() => act('ready')}>{me.ready ? 'Not ready' : "I'm ready"}</button>
        {isHost ? <button className="btn-lime" disabled={members.length < 1} onClick={() => act('start')}>Start game</button> : <span className="self-center text-white/60">Waiting for host…</span>}</div></div>}
    {active && <div className="card space-y-3"><div className="flex items-center justify-between"><div className="pop text-8xl font-black text-lime">{round.letter}</div>
      <div className={`text-5xl font-black ${left <= 10 ? 'text-pink' : ''}`}>{Math.max(left, 0)}s</div></div><p className="text-sm text-white/60">Round {round.number}/{room.rounds}</p>
      {room.categories.map((c: string) => <label key={c} className="block text-sm font-bold">{c}<input className="inp mt-1" disabled={submitted || left <= 0} maxLength={40} placeholder={`${c} starting with ${round.letter}`} value={ans[c] ?? ''} onChange={(e) => setAns({ ...ans, [c]: e.target.value })} /></label>)}
      <button className="btn-lime w-full" disabled={submitted || left <= 0} onClick={() => act('submit', { answers: ans })}>{submitted ? 'Submitted — locked ✓' : 'Submit answers'}</button></div>}
    {doneRound && <div className="card space-y-3"><h2 className="font-black">Round {round.number} results — letter {round.letter}</h2>
      {members.map((m) => { const mine = scores.filter((s) => s.user_id === m.user_id); return <div key={m.user_id} className="rounded-xl bg-white/5 p-3"><b>{m.avatar} {m.nickname}</b> <span className="text-lime">+{mine.reduce((a, s) => a + s.points, 0)}</span>
        {mine.map((s) => <div key={s.id} className="mt-1 text-sm"><span className="text-white/60">{s.category}:</span> <b>{s.answer || '—'}</b> <span className={COLOR[s.status]}>{s.status}{s.flagged && ' · flagged'} ({s.points})</span><div className="text-xs text-white/50">{s.reason}</div>{isHost && s.flagged && <div className="mt-1 flex gap-2"><button className="rounded bg-lime px-2 text-xs font-bold text-ink" onClick={() => act('review', { scoreId: s.id, approve: true })}>Approve</button><button className="rounded bg-pink px-2 text-xs font-bold" onClick={() => act('review', { scoreId: s.id, approve: false })}>Reject</button></div>}</div>)}</div>; })}
      {isHost && room.status === 'between' && <button className="btn-lime" onClick={() => act('start')}>Next round</button>}
      {room.status === 'finished' && <a href="/" className="btn-pink inline-block">Play again</a>}</div>}
  </div>{board}</div>);
}

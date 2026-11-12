'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb, session, api, AVATARS } from '@/lib/client';
import { beep } from '@/lib/sound';
import { TWISTS, REAL_NAME, timeFactor, type TwistId } from '@/lib/twistmeta';
import Tile from '@/components/Tile';
import Timer from '@/components/Timer';
import TwistBanner from '@/components/TwistBanner';
const COLOR: Record<string, string> = { accepted: 'text-okay', duplicate: 'text-brass', invalid: 'text-flame', empty: 'text-white/40', bonus: 'text-okay', penalty: 'text-flame' };
const MEDAL = ['bg-brass text-ink', 'bg-slate-300 text-ink', 'bg-amber-700 text-paper'];
export default function Room({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase(), base = `/api/rooms/${code}`;
  const [uid, setUid] = useState(''), [room, setRoom] = useState<any>(), [members, setM] = useState<any[]>([]), [round, setRound] = useState<any>(), [scores, setS] = useState<any[]>([]);
  const [ans, setAns] = useState<Record<string, string>>({}), [err, setErr] = useState(''), [nick, setNick] = useState(''), [av, setAv] = useState('🧠'), [left, setLeft] = useState(0);
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
      ch.subscribe(); t = setInterval(load, 4000);
    })().catch((e) => setErr(e.message));
    return () => { dead = true; clearInterval(t); if (ch) sb().removeChannel(ch); };
  }, [code, load]);
  const me = members.find((m) => m.user_id === uid), isHost = room?.host_id === uid;
  const active = round?.status === 'active', submitted = !!me && !!round && me.last_submitted_round >= round.number;
  const tw = (round?.twist ?? 'normal') as TwistId, jackpot: string | undefined = tw === 'jackpot' ? round?.twist_data?.category : undefined;
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => {
      const l = Math.ceil((Date.parse(round.ends_at) - (Date.now() + off.current)) / 1000); setLeft(l);
      if (l > 0 && l <= 5 && l !== lastL.current) beep('tick'); lastL.current = l;
      if (l <= 0 && me && !submitted && auto.current !== round.id) { auto.current = round.id; api(`${base}/submit`, { answers: ansRef.current }).then(load).catch(() => {}); }
      if (l <= -3 && Date.now() - fin.current > 1500) { fin.current = Date.now(); api(`${base}/finish`).then(load).catch(() => {}); }
    }, 250);
    return () => clearInterval(i);
  }, [active, round, me, submitted, base, load]);
  useEffect(() => { setAns({}); }, [round?.id]);
  useEffect(() => { if (round?.status === 'active') { beep('go'); if (round.twist !== 'normal') setTimeout(() => beep('twist'), 200); } if (round?.status === 'done') beep('end'); }, [round?.id, round?.status]);
  useEffect(() => {
    if (active && members.length && members.every((m) => m.last_submitted_round >= round.number) && Date.now() - fin.current > 1500) { fin.current = Date.now(); api(`${base}/finish`).then(load).catch(() => {}); }
  }, [active, members, round, base, load]);

  if (!me) return (<div className="card mx-auto max-w-md space-y-3"><h1 className="text-2xl font-black">Join room {code}</h1>
    <input className="inp" placeholder="Your nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
    <div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAv(a)} className={`rounded-lg border-2 border-ink px-2 py-1 text-2xl ${av === a ? 'bg-brass' : 'bg-paper/20'}`}>{a}</button>)}</div>
    <button className="btn-brass w-full" disabled={nick.trim().length < 2} onClick={() => { localStorage.setItem('bi_nick', nick); act('join', { nickname: nick, avatar: av }); }}>Join</button>{err && <p className="text-flame">{err}</p>}</div>);
  const doneRound = round && round.status === 'done', total = Math.round(room.duration * timeFactor(tw));
  const board = (<div className="card space-y-2"><h2 className="text-lg font-black">{room.status === 'finished' ? 'Final standings' : 'Standings'}</h2>
    {members.map((m, i) => (<div key={m.user_id} className="pop flex items-center justify-between rounded-lg border border-paper/10 bg-paper/10 p-2.5">
      <span className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-sm font-black ${MEDAL[i] ?? 'bg-feltdk text-paper'}`}>{i + 1}</span>{m.avatar} <b>{m.nickname}</b>{m.user_id === room.host_id && <span className="text-xs text-brass">HOST</span>}
        {room.status === 'playing' && round && m.last_submitted_round >= round.number && <span className="text-xs text-okay">✓ in</span>}{room.status === 'lobby' && m.ready && <span className="text-xs text-okay">ready</span>}</span>
      <span className="flex items-center gap-2"><b className="font-serif text-xl text-brass">{m.total_score}</b>{isHost && m.user_id !== uid && room.status === 'lobby' && <button className="text-xs text-flame" onClick={() => act('kick', { userId: m.user_id })}>remove</button>}</span></div>))}</div>);
  return (<div className="grid gap-4 md:grid-cols-3"><div className="space-y-4 md:col-span-2">
    <div className="card flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-widest text-paper/60">Room code</div><div className="font-serif text-4xl font-black tracking-widest text-brass">{code}</div></div>
      <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy invite link</button></div>
    {err && <p className="text-flame">{err}</p>}
    {room.status === 'lobby' && <div className="card space-y-3"><h2 className="text-xl font-black">Lobby</h2><p className="text-paper/70">{room.categories.join(' · ')}</p><p className="text-paper/70">{room.rounds} rounds × {room.duration}s. From round 2 on, every round can bring a twist.</p>
      <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => act('ready')}>{me.ready ? 'Not ready' : "I'm ready"}</button>
        {isHost ? <button className="btn-brass" onClick={() => act('start')}>Start game</button> : <span className="self-center text-paper/60">Waiting for the host…</span>}</div></div>}
    {active && <div className="space-y-4"><TwistBanner id={tw} category={jackpot} />
      <div className="card space-y-4"><div className="flex items-center gap-4"><span key={round.id} className="flip" data-testid="letter"><Tile ch={round.letter} /></span><div className="flex-1"><Timer left={left} total={total} /></div></div>
        <p className="text-xs font-black uppercase tracking-widest text-paper/60">Round {round.number} of {room.rounds}</p>
        {room.categories.map((c: string) => <label key={c} className="block text-sm font-black uppercase tracking-wide">{c}{c === jackpot && <span className="stamp ml-2 inline-block rounded px-1.5 text-xs">×3</span>}<input className="inp mt-1 normal-case" disabled={submitted || left <= 0} maxLength={40} placeholder={`Starts with ${round.letter}`} value={ans[c] ?? ''} onChange={(e) => setAns({ ...ans, [c]: e.target.value })} /></label>)}
        <button className="btn-brass w-full" disabled={submitted || left <= 0} onClick={() => act('submit', { answers: ans })}>{submitted ? 'Locked in ✓' : 'Submit answers'}</button></div></div>}
    {doneRound && <div className="card space-y-3"><div className="flex items-center gap-3"><Tile ch={round.letter} small brass /><h2 className="text-xl font-black">Round {round.number} results{tw !== 'normal' && <span className="text-brass"> · {REAL_NAME[tw] ?? TWISTS[tw].name}</span>}</h2></div>
      {members.map((m) => { const mine = scores.filter((s) => s.user_id === m.user_id), cells = mine.filter((s) => !s.category.startsWith('✦')), bon = mine.filter((s) => s.category.startsWith('✦')), pts = mine.reduce((a, s) => a + s.points, 0);
        return (<div key={m.user_id} className="rounded-lg border border-paper/10 bg-paper/5 p-3"><b>{m.avatar} {m.nickname}</b> <span className={`font-serif text-lg font-black ${pts < 0 ? 'text-flame' : 'text-brass'}`}>{pts > 0 ? '+' : ''}{pts}</span>
          {cells.map((s) => <div key={s.id} className="mt-1 text-sm"><span className="text-paper/60">{s.category}:</span> <b>{s.answer || '—'}</b> <span className={COLOR[s.status]}>{s.status}{s.flagged && ' · flagged'} ({s.points})</span><div className="text-xs text-paper/50">{s.reason}</div>
            {isHost && s.flagged && <div className="mt-1 flex gap-2"><button className="rounded border border-ink bg-brass px-2 text-xs font-bold text-ink" onClick={() => act('review', { scoreId: s.id, approve: true })}>Approve</button><button className="rounded border border-ink bg-brick px-2 text-xs font-bold" onClick={() => act('review', { scoreId: s.id, approve: false })}>Reject</button></div>}</div>)}
          {bon.map((s) => <div key={s.id} className="slam mt-2 rounded-md border-2 border-dashed border-brass/60 bg-feltdk p-2 text-sm"><b className={COLOR[s.status]}>{s.category.replace('✦ ', '')}: {s.points > 0 ? '+' : ''}{s.points}</b> <span className="text-paper/70">{s.reason}</span></div>)}</div>); })}
      {isHost && room.status === 'between' && <button className="btn-brass" onClick={() => act('start')}>Next round</button>}
      {room.status === 'finished' && <a href="/" className="btn-brick inline-block">Play again</a>}</div>}
  </div>{board}</div>);
}

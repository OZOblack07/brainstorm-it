'use client';
import { useEffect, useRef, useState } from 'react';
import { BOTS, botAnswers, type Level } from '@/lib/ai';
import { scoreRound, type Result } from '@/lib/engine';
import { applyTwist, pickTwist, scoreOptsFor, type Bonus, type Pick } from '@/lib/twists';
import { TWISTS, REAL_NAME, timeFactor } from '@/lib/twistmeta';
import { beep } from '@/lib/sound';
import Tile from '@/components/Tile';
import Timer from '@/components/Timer';
import TwistBanner from '@/components/TwistBanner';
const DEF = ['Name', 'Country', 'City', 'Animal', 'Food', 'Fruit', 'Thing', 'Occupation', 'Brand', 'Celebrity', 'Movie', 'Sport'];
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY';
const COLOR: Record<string, string> = { accepted: 'text-okay', duplicate: 'text-brass', invalid: 'text-flame', empty: 'text-white/40' };
const MEDAL = ['bg-brass text-ink', 'bg-slate-300 text-ink', 'bg-amber-700 text-paper'];
export default function Solo() {
  const [phase, setPhase] = useState<'setup' | 'play' | 'result' | 'end'>('setup');
  const [nick, setNick] = useState('You'), [cats, setCats] = useState(DEF.slice(0, 6)), [custom, setCustom] = useState('');
  const [dur, setDur] = useState(45), [rounds, setRounds] = useState(8), [level, setLevel] = useState<Level>('medium'), [nbots, setNbots] = useState(3);
  const [n, setN] = useState(0), [letter, setLetter] = useState(''), [left, setLeft] = useState(0), [secs, setSecs] = useState(45), [ans, setAns] = useState<Record<string, string>>({});
  const [tw, setTw] = useState<Pick>({ id: 'normal', data: {} }), [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [res, setRes] = useState<Result>({}), [totals, setTotals] = useState<Record<string, number>>({});
  const used = useRef<string[]>([]), endAt = useRef(0), done = useRef(false), ansRef = useRef(ans); ansRef.current = ans;
  useEffect(() => { setNick(localStorage.getItem('bi_nick') || 'You'); }, []);
  const bots = BOTS.slice(0, nbots), typed = nick.trim() || 'You', me = bots.some((b) => b.name === typed) ? typed + ' (you)' : typed;
  function start(round: number) {
    let pool = [...LETTERS].filter((l) => !used.current.includes(l)); if (!pool.length) { used.current = []; pool = [...LETTERS]; }
    const L = pool[Math.floor(Math.random() * pool.length)], pick = pickTwist(round, rounds, cats, nbots + 1), s = Math.round(dur * timeFactor(pick.id));
    used.current.push(L); setLetter(L); setTw(pick); setSecs(s); setN(round); setAns({}); done.current = false; endAt.current = Date.now() + s * 1000; setLeft(s); setPhase('play');
    beep('go'); if (pick.id !== 'normal') setTimeout(() => beep('twist'), 200);
  }
  function finish() {
    if (done.current) return; done.current = true;
    const subs: Record<string, Record<string, string>> = { [me]: ansRef.current };
    bots.forEach((b) => (subs[b.name] = botAnswers(b, letter, cats, level)));
    const r = scoreRound(letter, cats, subs, scoreOptsFor(tw.id, 10)); // same rules as multiplayer
    const bon = applyTwist(tw.id, tw.data, r, totals);
    setRes(r); setBonuses(bon);
    setTotals((t) => { const x = { ...t }; Object.entries(r).forEach(([p, cs]) => (x[p] = Math.max(0, (x[p] ?? 0) + Object.values(cs).reduce((a, c) => a + c.points, 0) + bon.filter((b) => b.userId === p).reduce((a, b) => a + b.points, 0)))); return x; });
    beep('end'); setPhase(n >= rounds ? 'end' : 'result');
  }
  useEffect(() => {
    if (phase !== 'play') return; let last = 99;
    const i = setInterval(() => { const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)); setLeft(l); if (l > 0 && l <= 5 && l !== last) beep('tick'); last = l; if (l <= 0) finish(); }, 250);
    return () => clearInterval(i);
  });
  const rank = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const board = (<div className="card space-y-2"><h2 className="text-lg font-black">{phase === 'end' ? 'Final standings' : 'Standings'}</h2>{rank.map(([p, s], i) => <div key={p} className="pop flex items-center justify-between rounded-lg border border-paper/10 bg-paper/10 p-2.5"><span className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-sm font-black ${MEDAL[i] ?? 'bg-feltdk text-paper'}`}>{i + 1}</span>{p === me ? '🧑' : BOTS.find((b) => b.name === p)?.avatar} <b>{p}</b></span><b className="font-serif text-xl text-brass">{s}</b></div>)}</div>);
  if (phase === 'setup') return (<div className="card mx-auto max-w-xl space-y-3"><h1 className="text-3xl font-black">Solo vs AI</h1>
    <input className="inp" placeholder="Your nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
    <div className="flex flex-wrap gap-2">{[...DEF, ...cats.filter((c) => !DEF.includes(c))].map((c) => <button key={c} onClick={() => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${cats.includes(c) ? 'bg-brass text-ink' : 'bg-paper/15'}`}>{c}</button>)}</div>
    <div className="flex gap-2"><input className="inp" placeholder="Custom category" maxLength={24} value={custom} onChange={(e) => setCustom(e.target.value)} /><button className="btn-ghost" onClick={() => { if (custom.trim().length > 1) { setCats((x) => [...x, custom.trim()]); setCustom(''); } }}>Add</button></div>
    <div className="grid grid-cols-2 gap-2 text-sm"><label>Seconds per round<input type="number" className="inp" min={20} max={300} value={dur} onChange={(e) => setDur(+e.target.value)} /></label><label>Rounds (1–25)<input type="number" className="inp" min={1} max={25} value={rounds} onChange={(e) => setRounds(Math.min(25, Math.max(1, +e.target.value)))} /></label></div>
    <div className="flex gap-2">{(['easy', 'medium', 'hard'] as Level[]).map((l) => <button key={l} onClick={() => setLevel(l)} className={`btn flex-1 capitalize ${level === l ? 'bg-brick text-paper' : 'bg-paper/15 text-paper'}`}>{l}</button>)}</div>
    <label className="block text-sm">Opponents: {nbots}<input type="range" min={1} max={4} value={nbots} onChange={(e) => setNbots(+e.target.value)} className="w-full" /></label>
    <div className="space-y-1 text-sm text-paper/70">{bots.map((b) => <div key={b.name}>{b.avatar} <b>{b.name}</b> — {b.blurb}</div>)}</div>
    <button className="btn-brass w-full" disabled={!cats.length || dur < 20 || rounds < 1} onClick={() => { used.current = []; setTotals(Object.fromEntries([me, ...bots.map((b) => b.name)].map((p) => [p, 0]))); start(1); }}>Start game</button></div>);
  const jackpot = tw.id === 'jackpot' ? tw.data.category : undefined;
  return (<div className="grid gap-4 md:grid-cols-3"><div className="space-y-4 md:col-span-2">
    {phase === 'play' && <div className="space-y-4"><TwistBanner id={tw.id} category={jackpot} />
      <div className="card space-y-4"><div className="flex items-center gap-4"><span key={n} className="flip" data-testid="letter"><Tile ch={letter} /></span><div className="flex-1"><Timer left={left} total={secs} /></div></div>
        <p className="text-xs font-black uppercase tracking-widest text-paper/60">Round {n} of {rounds}</p>
        {cats.map((c) => <label key={c} className="block text-sm font-black uppercase tracking-wide">{c}{c === jackpot && <span className="stamp ml-2 inline-block rounded px-1.5 text-xs">×3</span>}<input className="inp mt-1 normal-case" maxLength={40} placeholder={`${c} starting with ${letter}`} value={ans[c] ?? ''} onChange={(e) => setAns({ ...ans, [c]: e.target.value })} /></label>)}
        <button className="btn-brass w-full" onClick={() => { beep('submit'); finish(); }}>Submit answers</button></div></div>}
    {(phase === 'result' || phase === 'end') && <div className="card space-y-3"><div className="flex items-center gap-3"><Tile ch={letter} small brass /><h2 className="text-xl font-black">Round {n} results{tw.id !== 'normal' && <span className="text-brass"> · {REAL_NAME[tw.id] ?? TWISTS[tw.id].name}</span>}</h2></div>
      {Object.entries(res).map(([p, cs]) => { const bon = bonuses.filter((b) => b.userId === p), pts = Object.values(cs).reduce((a, c) => a + c.points, 0) + bon.reduce((a, b) => a + b.points, 0);
        return (<div key={p} className="rounded-lg border border-paper/10 bg-paper/5 p-3"><b>{p}</b> <span className={`font-serif text-lg font-black ${pts < 0 ? 'text-flame' : 'text-brass'}`}>{pts > 0 ? '+' : ''}{pts}</span>
          {Object.entries(cs).map(([c, x]) => <div key={c} className="mt-1 text-sm"><span className="text-paper/60">{c}:</span> <b>{x.answer || '—'}</b> <span className={COLOR[x.status]}>{x.status}{x.flagged && ' · flagged'} ({x.points})</span><div className="text-xs text-paper/50">{x.reason}</div></div>)}
          {bon.map((b, i) => <div key={i} className="slam mt-2 rounded-md border-2 border-dashed border-brass/60 bg-feltdk p-2 text-sm"><b className={b.points >= 0 ? 'text-okay' : 'text-flame'}>{b.label}: {b.points > 0 ? '+' : ''}{b.points}</b> <span className="text-paper/70">{b.reason}</span></div>)}</div>); })}
      {phase === 'result' ? <button className="btn-brass" onClick={() => start(n + 1)}>Next round</button> : <button className="btn-brick" onClick={() => setPhase('setup')}>Play again</button>}</div>}
  </div>{board}</div>);
}

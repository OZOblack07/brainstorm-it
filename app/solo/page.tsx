'use client';
import { useEffect, useRef, useState } from 'react';
import { BOTS, botAnswers, type Level } from '@/lib/ai';
import { scoreRound, type Result } from '@/lib/engine';
import { beep } from '@/lib/sound';
const DEF = ['Name', 'Country', 'City', 'Animal', 'Food', 'Fruit', 'Thing', 'Occupation', 'Brand', 'Celebrity', 'Movie', 'Sport'];
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY';
const COLOR: Record<string, string> = { accepted: 'text-lime', duplicate: 'text-yellow-300', invalid: 'text-pink', empty: 'text-white/40' };
export default function Solo() {
  const [phase, setPhase] = useState<'setup' | 'play' | 'result' | 'end'>('setup');
  const [nick, setNick] = useState('You'), [cats, setCats] = useState(DEF.slice(0, 6)), [custom, setCustom] = useState('');
  const [dur, setDur] = useState(45), [rounds, setRounds] = useState(5), [level, setLevel] = useState<Level>('medium'), [nbots, setNbots] = useState(3);
  const [n, setN] = useState(0), [letter, setLetter] = useState(''), [left, setLeft] = useState(0), [ans, setAns] = useState<Record<string, string>>({});
  const [res, setRes] = useState<Result>({}), [totals, setTotals] = useState<Record<string, number>>({}), used = useRef<string[]>([]), endAt = useRef(0), done = useRef(false), ansRef = useRef(ans); ansRef.current = ans;
  useEffect(() => { setNick(localStorage.getItem('bi_nick') || 'You'); }, []);
  const bots = BOTS.slice(0, nbots), me = nick.trim() || 'You';
  function start(round: number) {
    const pool = [...LETTERS].filter((l) => !used.current.includes(l)), L = pool[Math.floor(Math.random() * pool.length)];
    used.current.push(L); setLetter(L); setN(round); setAns({}); done.current = false; endAt.current = Date.now() + dur * 1000; setLeft(dur); setPhase('play'); beep('go');
  }
  function finish() {
    if (done.current) return; done.current = true;
    const subs: Record<string, Record<string, string>> = { [me]: ansRef.current };
    bots.forEach((b) => (subs[b.name] = botAnswers(b, letter, cats, level)));
    const r = scoreRound(letter, cats, subs, { unique: 10 }); // identical rules to multiplayer
    setRes(r); setTotals((t) => { const x = { ...t }; Object.entries(r).forEach(([p, cs]) => (x[p] = (x[p] ?? 0) + Object.values(cs).reduce((a, c) => a + c.points, 0))); return x; });
    beep('end'); setPhase(n >= rounds ? 'end' : 'result');
  }
  useEffect(() => {
    if (phase !== 'play') return; let last = 99;
    const i = setInterval(() => { const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)); setLeft(l); if (l > 0 && l <= 5 && l !== last) beep('tick'); last = l; if (l <= 0) finish(); }, 250);
    return () => clearInterval(i);
  });
  const rank = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const board = <div className="card space-y-2"><h2 className="font-black">{phase === 'end' ? '🏆 Final leaderboard' : 'Leaderboard'}</h2>{rank.map(([p, s], i) => <div key={p} className="pop flex justify-between rounded-xl bg-white/10 p-3"><span>{i + 1}. {p === me ? '🧑' : BOTS.find((b) => b.name === p)?.avatar} <b>{p}</b></span><b className="text-lime">{s}</b></div>)}</div>;
  if (phase === 'setup') return (<div className="card mx-auto max-w-xl space-y-3"><h1 className="text-3xl font-black">Solo vs AI</h1>
    <input className="inp" placeholder="Your nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
    <div className="flex flex-wrap gap-2">{[...DEF, ...cats.filter((c) => !DEF.includes(c))].map((c) => <button key={c} onClick={() => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} className={`rounded-full px-3 py-1 text-sm font-bold ${cats.includes(c) ? 'bg-lime text-ink' : 'bg-white/10'}`}>{c}</button>)}</div>
    <div className="flex gap-2"><input className="inp" placeholder="Custom category" maxLength={24} value={custom} onChange={(e) => setCustom(e.target.value)} /><button className="btn-ghost" onClick={() => { if (custom.trim().length > 1) { setCats((x) => [...x, custom.trim()]); setCustom(''); } }}>Add</button></div>
    <div className="grid grid-cols-2 gap-2 text-sm"><label>Seconds per round<input type="number" className="inp" min={20} max={300} value={dur} onChange={(e) => setDur(+e.target.value)} /></label><label>Rounds<input type="number" className="inp" min={1} max={15} value={rounds} onChange={(e) => setRounds(+e.target.value)} /></label></div>
    <div className="flex gap-2">{(['easy', 'medium', 'hard'] as Level[]).map((l) => <button key={l} onClick={() => setLevel(l)} className={`btn flex-1 capitalize ${level === l ? 'bg-pink' : 'bg-white/10'}`}>{l}</button>)}</div>
    <label className="block text-sm">Opponents: {nbots}<input type="range" min={1} max={4} value={nbots} onChange={(e) => setNbots(+e.target.value)} className="w-full" /></label>
    <div className="space-y-1 text-sm text-white/70">{bots.map((b) => <div key={b.name}>{b.avatar} <b>{b.name}</b> — {b.blurb}</div>)}</div>
    <button className="btn-lime w-full" disabled={!cats.length || dur < 20 || rounds < 1} onClick={() => { used.current = []; setTotals({}); start(1); }}>Start game</button></div>);
  return (<div className="grid gap-4 md:grid-cols-3"><div className="space-y-4 md:col-span-2">
    {phase === 'play' && <div className="card space-y-3"><div className="flex items-center justify-between"><div className="pop text-8xl font-black text-lime">{letter}</div><div className={`text-5xl font-black ${left <= 10 ? 'text-pink' : ''}`}>{left}s</div></div><p className="text-sm text-white/60">Round {n}/{rounds}</p>
      {cats.map((c) => <label key={c} className="block text-sm font-bold">{c}<input className="inp mt-1" maxLength={40} placeholder={`${c} starting with ${letter}`} value={ans[c] ?? ''} onChange={(e) => setAns({ ...ans, [c]: e.target.value })} /></label>)}
      <button className="btn-lime w-full" onClick={() => { beep('submit'); finish(); }}>Submit answers</button></div>}
    {(phase === 'result' || phase === 'end') && <div className="card space-y-3"><h2 className="font-black">Round {n} results — letter {letter}</h2>
      {Object.entries(res).map(([p, cs]) => <div key={p} className="rounded-xl bg-white/5 p-3"><b>{p}</b> <span className="text-lime">+{Object.values(cs).reduce((a, c) => a + c.points, 0)}</span>
        {Object.entries(cs).map(([c, x]) => <div key={c} className="mt-1 text-sm"><span className="text-white/60">{c}:</span> <b>{x.answer || '—'}</b> <span className={COLOR[x.status]}>{x.status}{x.flagged && ' · flagged'} ({x.points})</span><div className="text-xs text-white/50">{x.reason}</div></div>)}</div>)}
      {phase === 'result' ? <button className="btn-lime" onClick={() => start(n + 1)}>Next round</button> : <button className="btn-pink" onClick={() => setPhase('setup')}>Play again</button>}</div>}
  </div>{board}</div>);
}

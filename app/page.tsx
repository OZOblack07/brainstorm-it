'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, api, AVATARS } from '@/lib/client';
const DEF = ['Name', 'Country', 'City', 'Animal', 'Food', 'Fruit', 'Thing', 'Occupation', 'Brand', 'Celebrity', 'Movie', 'Sport'];
export default function Home() {
  const r = useRouter();
  const [nick, setNick] = useState(''), [av, setAv] = useState('🧠'), [cats, setCats] = useState(DEF.slice(0, 6)), [custom, setCustom] = useState('');
  const [dur, setDur] = useState(60), [rounds, setRounds] = useState(5), [pub, setPub] = useState(true), [uniq, setUniq] = useState(10);
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [open, setOpen] = useState<any[]>([]), [loaded, setLoaded] = useState(false);
  useEffect(() => { setNick(localStorage.getItem('bi_nick') ?? ''); sb().from('rooms').select('code,categories,rounds,duration').eq('is_public', true).eq('status', 'lobby').order('created_at', { ascending: false }).limit(12).then(({ data }) => { setOpen(data ?? []); setLoaded(true); }); }, []);
  const go = (p: string) => r.push(p);
  async function create() {
    setErr(''); setBusy(true); localStorage.setItem('bi_nick', nick);
    try { const j = await api('/api/rooms', { nickname: nick, avatar: av, categories: cats, duration: dur, rounds, isPublic: pub, unique: uniq }); go('/room/' + j.code); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  const toggle = (c: string) => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  return (<div className="space-y-6">
    <section className="py-4 text-center">
      <div className="flex justify-center gap-2">{[...'PLAY'].map((c, i) => <span key={i} className="flip" style={{ animationDelay: i * 120 + 'ms' }}><span className={`tile ${i === 3 ? 'tile-brass' : ''}`}>{c}</span></span>)}</div>
      <h1 className="mt-6 font-serif text-4xl font-black leading-tight sm:text-6xl">Think fast. Play smart.<br /><span className="text-brass">Beat everyone.</span></h1>
      <p className="mx-auto mt-3 max-w-xl text-paper/75">Name · Place · Animal · Thing, with a catch: every round can bring a twist. Double points, jackpots, heists and mystery stakes.</p>
      <a href="/solo" className="btn-brass mt-5 inline-block">Play solo vs AI</a>
      <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-3">{[['×2', 'Double Down'], ['×3', 'Jackpot'], ['HEIST', 'Rob the leader'], ['???', 'Mystery stakes']].map(([s, n]) => <div key={n} className="rounded-lg border-2 border-brass/40 bg-feltdk px-3 py-2 text-xs"><div className="stamp inline-block rounded px-2 font-serif font-black">{s}</div><div className="mt-1 text-paper/70">{n}</div></div>)}</div></section>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card space-y-3"><h2 className="text-xl font-black">Create room</h2>
        <input className="inp" placeholder="Your nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
        <div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAv(a)} className={`rounded-lg px-2 py-1 text-2xl ${av === a ? 'bg-brass' : 'bg-white/10'}`}>{a}</button>)}</div>
        <div className="flex flex-wrap gap-2">{[...DEF, ...cats.filter((c) => !DEF.includes(c))].map((c) => <button key={c} onClick={() => toggle(c)} className={`rounded-full px-3 py-1 text-sm font-bold ${cats.includes(c) ? 'bg-brass text-ink' : 'bg-white/10'}`}>{c}</button>)}</div>
        <div className="flex gap-2"><input className="inp" placeholder="Custom category" maxLength={24} value={custom} onChange={(e) => setCustom(e.target.value)} /><button className="btn-ghost" onClick={() => { if (custom.trim().length > 1) { setCats((x) => [...x, custom.trim()]); setCustom(''); } }}>Add</button></div>
        <div className="grid grid-cols-3 gap-2 text-sm"><label>Seconds<input type="number" className="inp" min={20} max={300} value={dur} onChange={(e) => setDur(+e.target.value)} /></label><label>Rounds<input type="number" className="inp" min={1} max={25} value={rounds} onChange={(e) => setRounds(+e.target.value)} /></label><label>Unique pts<input type="number" className="inp" min={1} max={100} value={uniq} onChange={(e) => setUniq(+e.target.value)} /></label></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Public room (listed for anyone)</label>
        <button className="btn-brass w-full" disabled={busy || nick.trim().length < 2 || !cats.length} onClick={create}>{busy ? 'Creating…' : 'Create room'}</button>{err && <p className="text-flame">{err}</p>}</section>
      <section className="space-y-4"><div className="card space-y-3"><h2 className="text-xl font-black">Join with a code</h2>
        <input className="inp uppercase tracking-widest" placeholder="ROOM CODE" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn-brick w-full" disabled={code.length < 4} onClick={() => go('/room/' + code)}>Join room</button></div>
        <div className="card space-y-2"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Public rooms</h2>
          <button className="btn-brass !py-2" disabled={!open.length} onClick={() => go('/room/' + open[Math.floor(Math.random() * open.length)].code)}>Quick match</button></div>
          {!loaded ? <p className="text-white/50">Loading…</p> : !open.length ? <p className="text-white/50">No open rooms right now. Create one!</p> :
            open.map((o) => <button key={o.code} onClick={() => go('/room/' + o.code)} className="flex w-full justify-between rounded-xl bg-white/10 p-3 text-left hover:bg-white/20"><b>{o.code}</b><span className="text-sm text-white/60">{o.categories.length} categories · {o.rounds} rounds · {o.duration}s</span></button>)}</div></section>
    </div></div>);
}

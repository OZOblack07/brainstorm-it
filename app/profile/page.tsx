'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb, session, AVATARS } from '@/lib/client';
export default function Profile() {
  const [u, setU] = useState<any>(), [p, setP] = useState<any>(), [hist, setHist] = useState<any[]>([]), [msg, setMsg] = useState('');
  useEffect(() => { (async () => { const s = await session(); setU(s.user); const c = sb();
    setP((await c.from('profiles').select('*').eq('id', s.user.id).maybeSingle()).data ?? { id: s.user.id, username: '', avatar: '🧠' });
    setHist((await c.from('match_history').select('*').order('played_at', { ascending: false }).limit(50)).data ?? []); })().catch((e) => setMsg(e.message)); }, []);
  if (!u || !p) return <p>{msg || 'Loading…'}</p>;
  const wins = hist.filter((h) => h.rank === 1).length, total = hist.reduce((a, h) => a + h.score, 0);
  async function save() { const { error } = await sb().from('profiles').update({ username: p.username, avatar: p.avatar }).eq('id', u.id); if (!error) localStorage.setItem('bi_nick', p.username); setMsg(error ? error.message : 'Saved ✓'); }
  return (<div className="space-y-4"><div className="card space-y-3"><h1 className="text-3xl font-black">{p.avatar} {p.username || 'Player'}</h1>
    <p className="text-sm text-white/60">{u.is_anonymous ? 'Playing as a guest.' : u.email}</p>
    <input className="inp" placeholder="Username" maxLength={20} value={p.username ?? ''} onChange={(e) => setP({ ...p, username: e.target.value })} />
    <div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setP({ ...p, avatar: a })} className={`rounded-lg px-2 py-1 text-2xl ${p.avatar === a ? 'bg-brass' : 'bg-white/10'}`}>{a}</button>)}</div>
    <div className="flex gap-2"><button className="btn-brass" onClick={save}>Save profile</button>
      {u.is_anonymous ? <Link href="/auth" className="btn-brick">Create account / log in</Link> : <button className="btn-ghost" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}>Log out</button>}</div>{msg && <p className="text-brass">{msg}</p>}</div>
    <div className="grid grid-cols-3 gap-3 text-center">{[['Games', hist.length], ['Wins', wins], ['Total points', total]].map(([k, v]) => <div key={k as string} className="card"><div className="text-3xl font-black text-brass">{v}</div><div className="text-sm text-white/60">{k}</div></div>)}</div>
    <div className="card space-y-2"><h2 className="font-black">Match history</h2>{!hist.length ? <p className="text-white/50">No finished games yet.</p> : hist.slice(0, 15).map((h) => <div key={h.id} className="flex justify-between rounded-xl bg-white/10 p-3"><span>#{h.rank} · room {h.room_id.slice(0, 4)}</span><span>{h.score} pts · {new Date(h.played_at).toLocaleDateString()}</span></div>)}</div></div>);
}

'use client';
import { useEffect, useState } from 'react';
import { isMuted, setMuted, getVol, setVol, beep } from '@/lib/sound';
import { AVATARS } from '@/lib/client';
export default function Settings() {
  const [mute, setM] = useState(false), [vol, setV] = useState(0.5), [nick, setNick] = useState(''), [av, setAv] = useState('🧠'), [ok, setOk] = useState(false);
  useEffect(() => { setM(isMuted()); setV(getVol()); setNick(localStorage.getItem('bi_nick') ?? ''); setAv(localStorage.getItem('bi_av') ?? '🧠'); }, []);
  return (<div className="card mx-auto max-w-md space-y-4"><h1 className="text-3xl font-black">Settings</h1>
    <label className="flex items-center gap-2"><input type="checkbox" checked={!mute} onChange={(e) => { setMuted(!e.target.checked); setM(!e.target.checked); }} /> Sound effects</label>
    <label className="block text-sm">Volume<input type="range" min={0} max={1} step={0.05} value={vol} className="w-full" onChange={(e) => { setVol(+e.target.value); setV(+e.target.value); }} onMouseUp={() => beep('go')} onTouchEnd={() => beep('go')} /></label>
    <label className="block text-sm">Default nickname<input className="inp" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAv(a)} className={`rounded-lg px-2 py-1 text-2xl ${av === a ? 'bg-lime' : 'bg-white/10'}`}>{a}</button>)}</div>
    <button className="btn-lime w-full" onClick={() => { localStorage.setItem('bi_nick', nick); localStorage.setItem('bi_av', av); setOk(true); }}>Save settings</button>{ok && <p className="text-lime">Saved ✓</p>}</div>);
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/client';
export default function Reset() {
  const r = useRouter(), [pw, setPw] = useState(''), [msg, setMsg] = useState('');
  return (<div className="card mx-auto max-w-md space-y-3"><h1 className="text-3xl font-black">Choose a new password</h1>
    <input className="inp" type="password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
    <button className="btn-brass w-full" disabled={pw.length < 8} onClick={async () => { const { error } = await sb().auth.updateUser({ password: pw }); if (error) setMsg(error.message); else r.push('/profile'); }}>Save password</button>
    {msg && <p className="text-flame">{msg}</p>}</div>);
}

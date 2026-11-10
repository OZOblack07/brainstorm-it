'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/client';
export default function LB() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { sb().from('leaderboard').select('*').order('total', { ascending: false }).limit(50).then(({ data }) => setRows(data ?? [])); }, []);
  return (<div className="card space-y-2"><h1 className="text-3xl font-black">Global leaderboard</h1>{rows === null ? <p>Loading…</p> : !rows.length ? <p className="text-white/60">No finished games yet. Be the first!</p> :
    rows.map((r, i) => <div key={r.user_id} className="flex justify-between rounded-xl bg-white/10 p-3"><span>{i + 1}. <b>{r.nickname}</b></span><span>{r.total} pts · {r.games} games · {r.wins} wins</span></div>)}</div>);
}

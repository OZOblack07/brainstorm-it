export default function Timer({ left, total }: { left: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (left / Math.max(total, 1)) * 100)), low = left <= 10;
  return (<div className="w-full"><div className="flex items-end justify-between"><span className="text-xs font-black uppercase tracking-widest text-paper/60">Time left</span>
    <span className={`font-serif text-5xl font-black tabular-nums ${low ? 'shake text-flame' : 'text-brass'}`}>{Math.max(left, 0)}</span></div>
    <div className="mt-1 h-4 overflow-hidden rounded border-2 border-ink bg-feltdk"><div className={`h-full transition-[width] duration-300 ease-linear ${low ? 'bg-brick' : 'bg-brass'}`} style={{ width: pct + '%' }} /></div></div>);
}

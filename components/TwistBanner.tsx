import { TWISTS, type TwistId } from '@/lib/twistmeta';
export default function TwistBanner({ id, category }: { id: TwistId; category?: string }) {
  if (id === 'normal') return null;
  const t = TWISTS[id];
  return (<div className="slam flex items-center gap-4 rounded-xl border-2 border-brass bg-feltdk p-4">
    <div className="stamp shrink-0 rounded-md px-3 py-2 text-center font-serif text-xl font-black">{t.stamp}</div>
    <div><div className="font-serif text-xl font-black text-brass">{t.name}</div>
      <div className="text-sm text-paper/80">{t.blurb}{category && <> Jackpot category: <b className="text-brass">{category}</b>.</>}</div></div></div>);
}

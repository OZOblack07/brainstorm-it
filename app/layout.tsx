import './globals.css';
import Link from 'next/link';
import MuteToggle from '@/components/MuteToggle';
import Tile from '@/components/Tile';
export const metadata = { title: 'Brainstorm It — Think Fast. Play Smart. Beat Everyone.', description: 'Competitive multiplayer Name, Place, Animal, Thing word game with twists, heists and fortune wheels.' };
export default function L({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
      <Link href="/" aria-label="Brainstorm It" className="flex items-center gap-0.5">
        {[...'BRAINSTORM'].map((c, i) => <Tile key={i} small ch={c} />)}<span className="w-2" />{[...'IT'].map((c, i) => <Tile key={i} small brass ch={c} />)}</Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-wide text-paper/80">
        <Link href="/solo" className="hover:text-brass">Solo</Link><Link href="/how-to-play" className="hover:text-brass">How to play</Link><Link href="/leaderboard" className="hover:text-brass">Leaderboard</Link><Link href="/profile" className="hover:text-brass">Profile</Link><Link href="/settings" className="hover:text-brass">Settings</Link><MuteToggle /></nav>
    </header><main className="mx-auto max-w-5xl p-4 pb-16">{children}</main></body></html>);
}

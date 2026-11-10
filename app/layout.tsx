import './globals.css';
import Link from 'next/link';
import MuteToggle from '@/components/MuteToggle';
export const metadata = { title: 'Brainstorm It — Think Fast. Play Smart. Beat Everyone.', description: 'Competitive multiplayer Name, Place, Animal, Thing word game.' };
export default function L({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
      <Link href="/" className="text-2xl font-black tracking-tight">BRAIN<span className="text-lime">STORM</span> <span className="rounded bg-pink px-2 text-white">IT</span></Link>
      <nav className="flex flex-wrap items-center gap-3 text-sm font-bold"><Link href="/solo">Solo</Link><Link href="/how-to-play">How to play</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link><MuteToggle /></nav>
    </header><main className="mx-auto max-w-5xl p-4">{children}</main></body></html>);
}

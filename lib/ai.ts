import { wordsFor } from './engine';
export type Level = 'easy' | 'medium' | 'hard';
export type Personality = 'speedy' | 'quirky' | 'scholar';
export interface Bot { name: string; avatar: string; personality: Personality; blurb: string }
export const BOTS: Bot[] = [
  { name: 'Zippy', avatar: '⚡', personality: 'speedy', blurb: 'Goes for the obvious answers' },
  { name: 'Quirk', avatar: '🎭', personality: 'quirky', blurb: 'Loves rare, unusual words' },
  { name: 'Prof', avatar: '🎓', personality: 'scholar', blurb: 'Knows a bit of everything' },
  { name: 'Nova', avatar: '🌟', personality: 'scholar', blurb: 'Balanced and steady' },
];
export const COVERAGE: Record<Level, number> = { easy: 0.5, medium: 0.75, hard: 0.95 };
/** Bots only ever answer from the validated reference lists, so they never submit invalid answers. */
export function botAnswers(bot: Bot, letter: string, cats: string[], level: Level, rnd: () => number = Math.random): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cats) {
    const pool = wordsFor(c, letter);
    if (!pool.length || rnd() > COVERAGE[level]) { out[c] = ''; continue; }
    const third = Math.max(1, Math.ceil(pool.length / 3));
    const slice = bot.personality === 'speedy' ? pool.slice(0, third) : bot.personality === 'quirky' ? pool.slice(-third) : pool;
    out[c] = slice[Math.floor(rnd() * slice.length)];
  }
  return out;
}

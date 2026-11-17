// Round twists: pure, testable logic shared by multiplayer (server) and solo mode.
import { letters, type Result } from './engine';
import { ALL_TWISTS, type TwistId } from './twistmeta';
export interface Bonus { userId: string; points: number; label: string; reason: string }
export interface Pick { id: TwistId; data: { category?: string } }
const WEIGHTS: [TwistId, number][] = [['normal', 14], ['double', 12], ['jackpot', 12], ['risky', 12], ['lightning', 10], ['heist', 12], ['wheel', 12], ['wordsmith', 8], ['curse', 8], ['underdog', 8]];

export function pickTwist(round: number, total: number, cats: string[], players: number, allowed: TwistId[] = ALL_TWISTS, rnd: () => number = Math.random): Pick {
  if (round === 1) return { id: 'normal', data: {} };
  if (round === total && total >= 3 && players >= 2 && allowed.includes('finale')) return { id: 'finale', data: {} };
  const ok = WEIGHTS.filter(([id]) => (id === 'normal' || allowed.includes(id)) && !(id === 'underdog' && players < 3) && !(id === 'heist' && players < 2));
  let r = rnd() * ok.reduce((s, [, w]) => s + w, 0), id: TwistId = ok[0][0];
  for (const [i, w] of ok) { r -= w; if (r < 0) { id = i; break; } }
  return { id, data: id === 'jackpot' ? { category: cats[Math.floor(rnd() * cats.length)] } : {} };
}
export const scoreOptsFor = (id: TwistId, unique: number) => ({ unique, duplicate: id === 'curse' ? -5 : 0 });

const WHEEL = [-15, -10, -5, 5, 5, 10, 10, 15, 25];
/** Mutates cell points for multiplier/penalty twists and returns extra bonus/penalty entries. Totals are clamped at 0 by the caller. */
export function applyTwist(id: TwistId, data: { category?: string }, res: Result, before: Record<string, number>, rnd: () => number = Math.random): Bonus[] {
  const users = Object.keys(res), out: Bonus[] = [];
  const rp = (u: string) => Object.values(res[u]).reduce((s, c) => s + c.points, 0);
  const mult = (m: number, name: string, only?: string) => users.forEach((u) => Object.entries(res[u]).forEach(([cat, c]) => {
    if (c.status === 'accepted' && c.points > 0 && (!only || cat === only)) { c.points *= m; c.reason += ` (×${m} ${name})`; }
  }));
  const heist = (amount: number) => {
    if (users.length < 2) return;
    const top = Math.max(...users.map((u) => before[u] ?? 0)), leaders = users.filter((u) => (before[u] ?? 0) === top);
    if (top <= 0 || leaders.length > 1) return;
    const L = leaders[0], best = Math.max(...users.map(rp)), winners = users.filter((u) => u !== L && rp(u) === best);
    if (best <= 0 || !winners.length) return;
    const take = Math.min(amount, top), share = Math.max(1, Math.floor(take / winners.length));
    out.push({ userId: L, points: -take, label: 'Heist', reason: `Robbed of ${take} points for leading the game.` });
    winners.forEach((w) => out.push({ userId: w, points: share, label: 'Heist', reason: `Stole ${share} points from the leader.` }));
  };
  switch (id) {
    case 'double': mult(2, 'Double Down'); break;
    case 'finale': mult(2, 'Grand Finale'); heist(15); break;
    case 'jackpot': mult(3, 'Jackpot', data.category); break;
    case 'risky': users.forEach((u) => Object.values(res[u]).forEach((c) => { if (c.status === 'invalid' && c.answer.trim()) { c.points = -5; c.reason += ' −5 for a wrong answer (Risky Business).'; } })); break;
    case 'curse': users.forEach((u) => Object.values(res[u]).forEach((c) => { if (c.status === 'duplicate') c.reason += ' Copycat Curse: −5.'; })); break;
    case 'heist': heist(10); break;
    case 'wheel': users.forEach((u) => {
      const floor = -Math.max(0, (before[u] ?? 0) + rp(u)), pts = Math.max(WHEEL[Math.floor(rnd() * WHEEL.length)], floor);
      out.push({ userId: u, points: pts, label: 'Fortune Wheel', reason: pts > 0 ? `The wheel landed on +${pts}!` : pts < 0 ? `The wheel took ${-pts} points.` : 'The wheel spared you.' });
    }); break;
    case 'wordsmith': {
      const len = (u: string) => Math.max(0, ...Object.values(res[u]).filter((c) => c.status === 'accepted').map((c) => letters(c.answer).length));
      const best = Math.max(...users.map(len));
      if (best > 0) users.filter((u) => len(u) === best).forEach((u) => out.push({ userId: u, points: 10, label: 'Wordsmith', reason: `Longest accepted answer (${best} letters): +10.` }));
      break;
    }
    case 'underdog': {
      const low = Math.min(...users.map((u) => before[u] ?? 0)), high = Math.max(...users.map((u) => before[u] ?? 0));
      if (users.length >= 3 && low < high) users.filter((u) => (before[u] ?? 0) === low).forEach((u) => out.push({ userId: u, points: 15, label: 'Underdog', reason: 'Last place gets a boost: +15.' }));
      break;
    }
    default: break;
  }
  return out;
}

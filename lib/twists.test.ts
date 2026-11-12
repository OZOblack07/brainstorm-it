import { describe, it, expect } from 'vitest';
import { scoreRound } from './engine';
import { applyTwist, pickTwist, scoreOptsFor } from './twists';
const base = () => scoreRound('D', ['Animal', 'Name'], { a: { Animal: 'Dog', Name: 'Daniel' }, b: { Animal: 'Deer', Name: 'Dayo' }, c: { Animal: '', Name: 'Xavier' } });
const sum = (r: ReturnType<typeof base>, u: string) => Object.values(r[u]).reduce((s, c) => s + c.points, 0);
describe('twists', () => {
  it('round 1 is normal and the last round is the finale', () => { expect(pickTwist(1, 5, ['A'], 3).id).toBe('normal'); expect(pickTwist(5, 5, ['A'], 3).id).toBe('finale'); });
  it('picks only legal twists', () => { for (let i = 0; i < 300; i++) { const t = pickTwist(2, 9, ['A', 'B'], 2); expect(t.id).not.toBe('underdog'); } });
  it('double doubles accepted points', () => { const r = base(); applyTwist('double', {}, r, {}); expect(sum(r, 'a')).toBe(40); });
  it('jackpot triples one category only', () => { const r = base(); applyTwist('jackpot', { category: 'Animal' }, r, {}); expect(r.a.Animal.points).toBe(30); expect(r.a.Name.points).toBe(10); });
  it('risky penalises wrong answers, not empty ones', () => { const r = base(); applyTwist('risky', {}, r, {}); expect(r.c.Name.points).toBe(-5); expect(r.c.Animal.points).toBe(0); });
  it('curse makes duplicates cost 5', () => { const r = scoreRound('D', ['Animal'], { a: { Animal: 'Dog' }, b: { Animal: 'DOGSS' } }, scoreOptsFor('curse', 10)); expect(r.a.Animal.points).toBe(-5); });
  it('heist moves points from the leader to the round winner', () => { const r = base(); const b = applyTwist('heist', {}, r, { a: 0, b: 50, c: 10 }); expect(b.find((x) => x.userId === 'b')!.points).toBe(-10); expect(b.find((x) => x.userId === 'a')!.points).toBe(10); });
  it('underdog boosts last place', () => { const b = applyTwist('underdog', {}, base(), { a: 30, b: 20, c: 5 }); expect(b).toEqual([expect.objectContaining({ userId: 'c', points: 15 })]); });
  it('wheel never drops a player below zero', () => { const r = base(); const b = applyTwist('wheel', {}, r, { a: 0, b: 0, c: 0 }, () => 0); b.forEach((x) => expect(sum(r, x.userId) + x.points).toBeGreaterThanOrEqual(0)); });
  it('wordsmith rewards the longest accepted answer', () => { const b = applyTwist('wordsmith', {}, base(), {}); expect(b).toEqual([expect.objectContaining({ userId: 'a', points: 10 })]); });
});

import { describe, it, expect } from 'vitest';
import { BOTS, botAnswers } from './ai';
import { scoreRound } from './engine';
const CATS = ['Name','Country','City','Animal','Food','Fruit','Thing','Occupation','Brand','Celebrity','Movie','Sport'];
describe('AI opponents follow the same rules', () => {
  it('never produce invalid answers on any letter', () => {
    for (const L of 'ABCDEFGHIJKLMNOPRSTUVWY') {
      const subs = Object.fromEntries(BOTS.map((b) => [b.name, botAnswers(b, L, CATS, 'hard')]));
      const r = scoreRound(L, CATS, subs);
      for (const p of Object.values(r)) for (const c of Object.values(p)) expect(c.status).not.toBe('invalid');
    }
  });
});

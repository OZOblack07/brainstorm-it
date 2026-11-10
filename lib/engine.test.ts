import { describe, it, expect } from 'vitest';
import { key, scoreRound, nearMiss } from './engine';
const same = (a: string, b: string) => expect(key(a)).toBe(key(b));
describe('disguised duplicates of DOG', () => {
  for (const v of ['DOGS','DOGSS','DOG’S',"DOG'S",'DOGSSS','DOOG','DOOOG','DOGG','DOGGG','D.O.G','D-O-G','D O G','DOG!','dog','  dog  ','D\u200BOG','DO\u200DG','\uFEFFdog','dоg','dоg','ＤＯＧ','dog ʼs'])
    it(JSON.stringify(v), () => same('DOG', v));
});
describe('plurals', () => {
  it('regular/irregular', () => { same('cat','cats'); same('book','books'); same('baby','babies'); same('mouse','mice'); same('child','children'); same('horse','horses'); same('box','boxes'); });
});
describe('different words stay different', () => {
  it('CAT/CAR, DOG/DEER', () => { expect(key('CAT')).not.toBe(key('CAR')); expect(key('DOG')).not.toBe(key('DEER')); });
  it('no fuzzy flag on short words', () => { expect(nearMiss(key('cat'), key('car'))).toBe(false); });
});
describe('scoring', () => {
  const r = scoreRound('D', ['Animal'], { a: { Animal: 'DOG' }, b: { Animal: 'DOGSS' }, c: { Animal: 'Deer' }, d: { Animal: 'Cat' }, e: { Animal: '' } });
  it('duplicates get 0 for both, no first-come advantage', () => { expect(r.a.Animal.status).toBe('duplicate'); expect(r.b.Animal.status).toBe('duplicate'); expect(r.a.Animal.points + r.b.Animal.points).toBe(0); });
  it('unique valid = 10', () => { expect(r.c.Animal.points).toBe(10); expect(r.c.Animal.flagged).toBe(false); });
  it('wrong letter invalid, empty empty', () => { expect(r.d.Animal.status).toBe('invalid'); expect(r.e.Animal.status).toBe('empty'); });
  it('APPLE vs APPLEE duplicates', () => { const x = scoreRound('A', ['Fruit'], { a: { Fruit: 'apple' }, b: { Fruit: 'applee' } }); expect(x.a.Fruit.status).toBe('duplicate'); });
  it('unknown unique answers are flagged, not rejected', () => { const x = scoreRound('O', ['Animal'], { a: { Animal: 'Okapi' } }); expect(x.a.Animal.status).toBe('accepted'); expect(x.a.Animal.flagged).toBe(true); });
  it('similar 5+ letter words are flagged for review, not disqualified', () => { const x = scoreRound('T', ['Thing'], { a: { Thing: 'Table' }, b: { Thing: 'Tablet' } }); expect(x.a.Thing.status).toBe('accepted'); expect(x.a.Thing.flagged).toBe(true); });
  it('custom host scoring', () => { expect(scoreRound('D', ['Animal'], { a: { Animal: 'dog' } }, { unique: 25 }).a.Animal.points).toBe(25); });
});

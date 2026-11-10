// Brainstorm It — answer normalisation, duplicate detection and scoring. Pure functions, no I/O.
import { WORDS } from './words';
const CONF: Record<string, string> = {
  'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x','і':'i','ј':'j','ѕ':'s','ԁ':'d','һ':'h','ɡ':'g','ı':'i',
  'α':'a','ε':'e','ι':'i','κ':'k','ν':'v','ο':'o','ρ':'p','τ':'t','υ':'u','χ':'x',
};
const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD\u180E]/;
export const MAX_LEN = 40;

export function normalize(raw: string): string {
  let s = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(HIDDEN, '').replace(/\p{C}/gu, '');
  s = [...s.toLowerCase()].map((c) => CONF[c] ?? c).join('');
  return s.replace(/[\u2018\u2019\u02BC\u2032`´]/g, "'").replace(/\s+/g, ' ').trim();
}
export const letters = (raw: string) => normalize(raw).replace(/[^\p{L}]/gu, '');
export const tampered = (raw: string) => HIDDEN.test(raw) || [...raw.toLowerCase()].some((c) => c in CONF);
const collapse = (w: string) => w.replace(/(.)\1+/g, '$1');

const IRR: Record<string, string> = { mice:'mouse', children:'child', men:'man', women:'woman', people:'person', geese:'goose', feet:'foot', teeth:'tooth', oxen:'ox', lice:'louse', fet:'foot', gese:'goose' };
function lemma(w: string): string {
  if (IRR[w]) return IRR[w];
  if (/.{2,}ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}
/** Canonical key: same key => same underlying word. */
export function key(raw: string): string {
  const l = letters(raw);
  let w = IRR[l] ?? collapse(l);
  w = lemma(w);
  w = IRR[w] ?? w;
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}
/** Controlled fuzzy: only 1-edit differences on words of 5+ letters sharing the first letter. */
export const nearMiss = (a: string, b: string) => a !== b && a.length >= 5 && b.length >= 5 && a[0] === b[0] && lev(a, b) === 1;

export type Cat = keyof typeof WORDS;
/** Map a (possibly custom/plural) category name to a reference list, if one exists. */
export function catOf(c: string): Cat | undefined {
  const n = normalize(c);
  if (/countr/.test(n)) return 'country'; if (/^cit/.test(n)) return 'city'; if (/animal/.test(n)) return 'animal'; if (/fruit/.test(n)) return 'fruit';
  if (/food|dish|meal/.test(n)) return 'food'; if (/occupation|job|profession|career/.test(n)) return 'occupation'; if (/brand|compan/.test(n)) return 'brand';
  if (/celebrit|famous/.test(n)) return 'celebrity'; if (/movie|film/.test(n)) return 'movie'; if (/sport/.test(n)) return 'sport';
  if (/^(first )?names?$/.test(n)) return 'name'; if (/^(things?|objects?)$/.test(n)) return 'thing';
  return undefined;
}
const KEYS: Partial<Record<Cat, Set<string>>> = {};
const keys = (c: Cat) => (KEYS[c] ??= new Set(WORDS[c].map(key)));
export const isKnown = (cat: string, raw: string) => { const c = catOf(cat); return !!c && keys(c).has(key(raw)); };
/** Open-ended categories (names, things) and custom categories are never reference-checked. */
export const hasReference = (cat: string) => { const c = catOf(cat); return !!c && c !== 'name' && c !== 'thing'; };
export const wordsFor = (cat: string, letter: string): string[] => { const c = catOf(cat); return c ? WORDS[c].filter((w) => letters(w)[0] === letter.toLowerCase()) : []; };

export type Status = 'accepted' | 'duplicate' | 'invalid' | 'empty';
export interface Cell { status: Status; points: number; reason: string; flagged: boolean; answer: string }
export type Subs = Record<string, Record<string, string>>;
export type Result = Record<string, Record<string, Cell>>;

export function scoreRound(letter: string, cats: string[], subs: Subs, opts: { unique?: number; duplicate?: number } = {}): Result {
  const U = opts.unique ?? 10, D = opts.duplicate ?? 0, L = letter.toLowerCase();
  const out: Result = {};
  const players = Object.keys(subs);
  players.forEach((p) => (out[p] = {}));
  for (const cat of cats) {
    const live: { p: string; k: string; f: string; raw: string }[] = [];
    for (const p of players) {
      const raw = String(subs[p]?.[cat] ?? ''), l = letters(raw);
      const put = (status: Status, points: number, reason: string, flagged = false) => (out[p][cat] = { status, points, reason, flagged, answer: raw });
      if (!l) put('empty', 0, 'No answer submitted.');
      else if (raw.length > MAX_LEN) put('invalid', 0, `Longer than ${MAX_LEN} characters.`);
      else if (/\d/.test(raw) || l.length < 2) put('invalid', 0, 'Answers must be words (at least 2 letters, no numbers).');
      else if (l[0] !== L) put('invalid', 0, `Must start with "${letter.toUpperCase()}".`);
      else live.push({ p, k: key(raw), f: collapse(l), raw });
    }
    const groups = new Map<string, typeof live>();
    live.forEach((x) => groups.set(x.k, [...(groups.get(x.k) ?? []), x]));
    const singles: typeof live = [];
    for (const [k, g] of groups) {
      if (g.length > 1) g.forEach((x) => (out[x.p][cat] = { status: 'duplicate', points: D, flagged: false, answer: x.raw,
        reason: `${g.length} answers resolve to the same underlying word (${g.map((y) => `"${y.raw.trim()}"`).join(", ")}), so nobody gets unique points.${tampered(x.raw) ? ' Hidden or look-alike characters were detected and removed.' : ''}` }));
      else {
        const x = g[0]; singles.push(x);
        const known = !hasReference(cat) || isKnown(cat, x.raw);
        out[x.p][cat] = { status: 'accepted', points: U, flagged: !known, answer: x.raw,
          reason: known ? 'Unique answer.' : 'Unique answer, but not in our reference list for this category — flagged for host review.' };
      }
    }
    for (const a of singles) for (const b of singles) if (a.p < b.p && nearMiss(a.f, b.f))
      for (const x of [a, b]) { const c = out[x.p][cat]; c.flagged = true; c.reason += ' Very similar to another answer — flagged for host review.'; }
  }
  return out;
}

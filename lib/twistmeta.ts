export type TwistId = 'normal' | 'double' | 'jackpot' | 'risky' | 'lightning' | 'heist' | 'wheel' | 'wordsmith' | 'curse' | 'underdog' | 'finale';
export interface TwistInfo { name: string; blurb: string; stamp: string; hidden?: boolean }
export const TWISTS: Record<TwistId, TwistInfo> = {
  normal: { name: 'Standard Round', blurb: 'No tricks. Unique answers score.', stamp: '—' },
  double: { name: 'Double Down', blurb: 'Every point scored this round counts twice.', stamp: '×2' },
  jackpot: { name: 'Jackpot Category', blurb: 'One category is worth triple points.', stamp: '×3' },
  risky: { name: 'Risky Business', blurb: 'Every wrong answer costs 5 points. Leaving a box empty is safe.', stamp: '−5' },
  lightning: { name: 'Lightning', blurb: 'Half the time. Same stakes.', stamp: '½ TIME' },
  heist: { name: 'The Heist', blurb: 'The leader loses 10 points to this round\'s top scorer.', stamp: 'HEIST' },
  wheel: { name: 'Mystery Round', blurb: 'The stakes are revealed after the buzzer. Someone gains, someone pays.', stamp: '???', hidden: true },
  wordsmith: { name: 'Mystery Round', blurb: 'The stakes are revealed after the buzzer. Something is up for grabs.', stamp: '???', hidden: true },
  curse: { name: 'Copycat Curse', blurb: 'Duplicate answers cost 5 points instead of scoring zero.', stamp: '−5 DUPES' },
  underdog: { name: 'Underdog\'s Day', blurb: 'Whoever is in last place gets 15 points.', stamp: '+15' },
  finale: { name: 'Grand Finale', blurb: 'Double points, and the leader gets robbed. Everything can change.', stamp: 'FINALE' },
};
export const REAL_NAME: Partial<Record<TwistId, string>> = { wheel: 'Fortune Wheel', wordsmith: 'Wordsmith' };
export const timeFactor = (id: TwistId) => (id === 'lightning' ? 0.5 : 1);

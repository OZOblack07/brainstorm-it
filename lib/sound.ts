'use client';
let ctx: AudioContext | undefined;
export const isMuted = () => typeof localStorage !== 'undefined' && localStorage.getItem('bi_mute') === '1';
export const setMuted = (m: boolean) => localStorage.setItem('bi_mute', m ? '1' : '0');
export const getVol = () => Number(typeof localStorage !== 'undefined' ? localStorage.getItem('bi_vol') ?? 0.5 : 0.5);
export const setVol = (v: number) => localStorage.setItem('bi_vol', String(v));
const TONES = { tick: [880, 0.06], go: [660, 0.25], submit: [520, 0.12], end: [220, 0.45], win: [990, 0.5], twist: [140, 0.4], bonus: [1175, 0.3], penalty: [160, 0.4] } as const;
export function beep(kind: keyof typeof TONES) {
  if (isMuted()) return;
  try {
    ctx ??= new AudioContext();
    const [f, d] = TONES[kind], o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f; o.type = kind === 'end' ? 'sawtooth' : 'sine';
    g.gain.value = 0.15 * getVol() * 2; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
  } catch { /* audio unavailable (autoplay policy) — safe to ignore */ }
}

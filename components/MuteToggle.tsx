'use client';
import { useEffect, useState } from 'react';
import { isMuted, setMuted, beep } from '@/lib/sound';
export default function MuteToggle() {
  const [m, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return <button aria-label="Toggle sound" className="text-xl" onClick={() => { setMuted(!m); setM(!m); if (m) beep('go'); }}>{m ? '🔇' : '🔊'}</button>;
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/client';
export default function Auth() {
  const r = useRouter(), [mode, setMode] = useState<'in' | 'up' | 'reset'>('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  async function submit() {
    setMsg(''); setBusy(true); const s = sb();
    try {
      if (mode === 'in') { const { error } = await s.auth.signInWithPassword({ email, password: pw }); if (error) throw error; r.push('/profile'); }
      else if (mode === 'up') {
        const { data } = await s.auth.getSession();
        const { error } = data.session?.user.is_anonymous ? await s.auth.updateUser({ email, password: pw }) : (await s.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin + '/profile' } })) as any; // guests keep their stats
        if (error) throw error; setMsg('Check your email to confirm your account.');
      } else { const { error } = await s.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth/reset' }); if (error) throw error; setMsg('Password reset link sent — check your email.'); }
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  return (<div className="card mx-auto max-w-md space-y-3"><h1 className="text-3xl font-black">{mode === 'in' ? 'Log in' : mode === 'up' ? 'Create account' : 'Reset password'}</h1>
    <input className="inp" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    {mode !== 'reset' && <input className="inp" type="password" placeholder="Password (8+ characters)" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />}
    <button className="btn-brass w-full" disabled={busy || !email || (mode !== 'reset' && pw.length < 8)} onClick={submit}>{busy ? 'Please wait…' : mode === 'in' ? 'Log in' : mode === 'up' ? 'Sign up' : 'Send reset link'}</button>
    {mode !== 'reset' && <button className="btn-ghost w-full" onClick={() => sb().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/profile' } })}>Continue with Google</button>}
    {msg && <p className="text-brass">{msg}</p>}
    <div className="flex justify-between text-sm text-white/70"><button onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Sign up' : 'Have an account? Log in'}</button><button onClick={() => setMode('reset')}>Forgot password?</button></div>
    <p className="text-xs text-white/40">Signing up while playing as a guest keeps your stats. Google sign-in works once enabled in Supabase.</p></div>);
}

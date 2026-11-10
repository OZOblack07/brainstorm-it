'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let c: SupabaseClient | undefined;
export const sb = () => (c ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
export async function session() {
  const s = sb();
  const cur = await s.auth.getSession();
  if (cur.data.session) return cur.data.session;
  const r = await s.auth.signInAnonymously(); // guest play
  if (r.error || !r.data.session) throw new Error('Could not start guest session. Enable Anonymous sign-ins in Supabase.');
  return r.data.session;
}
export async function api(path: string, body?: unknown) {
  const s = await session();
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
export const AVATARS = ['🧠', '🦊', '🐯', '🦉', '🐙', '🦄', '🐲', '🚀'];

import { createClient } from '@supabase/supabase-js';
export const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
/** Fixed-window rate limit stored in Postgres (works across serverless instances). */
export async function allow(db: ReturnType<typeof admin>, uid: string, bucket: string, max: number, windowSec: number) {
  const { data, error } = await db.rpc('hit_rate_limit', { p_user: uid, p_bucket: bucket, p_max: max, p_window: windowSec });
  if (error) { console.error('rate limiter error (did you run migration 002?)', error.message); return true; } // fail open, but loudly
  return data === true;
}
export async function authUser(req: Request) {
  const t = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!t) return null;
  const { data } = await admin().auth.getUser(t);
  return data.user ?? null;
}

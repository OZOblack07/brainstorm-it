import { NextResponse } from 'next/server';
import { z } from 'zod';
import { admin, allow, authUser } from '@/lib/admin';
const Body = z.object({
  nickname: z.string().trim().min(2).max(20), avatar: z.string().max(8).default('🧠'),
  categories: z.array(z.string().trim().min(2).max(24)).min(1).max(15), duration: z.number().int().min(20).max(300),
  rounds: z.number().int().min(1).max(25), isPublic: z.boolean(), unique: z.number().int().min(1).max(100).default(10),
});
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export async function POST(req: Request) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: 'Invalid settings: ' + p.error.issues[0].message }, { status: 400 });
  const b = p.data, db = admin();
  if (!(await allow(db, user.id, 'create', 6, 60))) return NextResponse.json({ error: 'Too many rooms created — wait a minute' }, { status: 429 });
  for (let i = 0; i < 5; i++) {
    const code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
    const { data: room, error } = await db.from('rooms').insert({ code, host_id: user.id, is_public: b.isPublic, categories: [...new Set(b.categories)], duration: b.duration, rounds: b.rounds, unique_points: b.unique }).select().single();
    if (error?.code === '23505') continue;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from('room_members').insert({ room_id: room.id, user_id: user.id, nickname: b.nickname, avatar: b.avatar });
    return NextResponse.json({ code });
  }
  return NextResponse.json({ error: 'Could not allocate room code' }, { status: 500 });
}

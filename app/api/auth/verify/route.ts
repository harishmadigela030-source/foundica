import { z } from 'zod';
import { setSession, verifyCode } from '@/lib/auth';
import { credits } from '@/lib/account';
import { clientIp, rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = z.object({ email: z.string().trim().max(254), code: z.string().trim().max(10) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  if (rateLimited('verify:' + clientIp(req), 30)) return Response.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  const u = await verifyCode(b.data.email, b.data.code);
  if (!u) return Response.json({ error: 'That code is wrong or has expired.' }, { status: 401 });
  await setSession(u.id);
  return Response.json({ user: { email: u.email, name: u.name, phone: u.phone, country: u.country }, credits: await credits(u.id) });
}

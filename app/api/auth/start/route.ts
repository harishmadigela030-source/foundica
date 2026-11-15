import { z } from 'zod';
import { authConfigured, startSignIn, validEmail } from '@/lib/auth';
import { clientIp, rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!authConfigured()) return Response.json({ error: 'Sign-in is not configured yet. (Admin: set AUTH_SECRET.)' }, { status: 500 });
  const b = z.object({ email: z.string().trim().max(254) }).safeParse(await req.json().catch(() => null));
  if (!b.success || !validEmail(b.data.email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (rateLimited('otp:' + clientIp(req), 10) || rateLimited('otpmail:' + b.data.email.toLowerCase(), 5)) return Response.json({ error: 'Too many codes requested. Please wait a few minutes.' }, { status: 429 });
  try {
    return Response.json({ sent: true, ...(await startSignIn(b.data.email)) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { credits } from '@/lib/account';
import { confirmReturn } from '@/lib/dodo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The browser calls this after returning from checkout. Safe to call many times. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  const b = z.object({ paymentId: z.string().max(80) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    const r = await confirmReturn(b.data.paymentId, u.id);
    return Response.json({ ...r, credits: await credits(u.id) });
  } catch (e) {
    const st = (e as { status?: number }).status;
    return Response.json({ error: 'Could not confirm the payment yet.', credits: await credits(u.id) }, { status: st === 400 || st === 404 ? st : 502 });
  }
}

import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { paymentsEnabled } from '@/lib/pricing';
import { createCheckout } from '@/lib/dodo';
import { clientIp, rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!paymentsEnabled()) return Response.json({ error: 'Payments are not enabled.' }, { status: 404 });
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Please sign in first.' }, { status: 401 });
  const b = z.object({ plan: z.enum(['single', 'pack']) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: 'Invalid plan.' }, { status: 400 });
  if (rateLimited('checkout:' + clientIp(req), 20)) return Response.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  try {
    const origin = process.env.FOUNDICA_SITE_URL || new URL(req.url).origin;
    return Response.json(await createCheckout(u, b.data.plan, origin));
  } catch (e) {
    console.error('checkout failed', e);
    return Response.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
}

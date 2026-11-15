import { z } from 'zod';
import { currentUser, saveUser } from '@/lib/auth';
import { credits, history } from '@/lib/account';
import { pricingPublic } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ user: null, pricing: pricingPublic() });
  return Response.json({ user: { email: u.email, name: u.name, phone: u.phone, country: u.country }, credits: await credits(u.id), items: await history(u.id), pricing: pricingPublic() });
}

/** Update profile: name, WhatsApp number (optional, for updates), marketing consent. */
export async function PATCH(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  const b = z
    .object({ name: z.string().trim().max(120).optional(), phone: z.string().trim().max(20).regex(/^\+?[0-9 ]{0,20}$/, 'Enter a phone number with country code, digits only.').optional(), consent: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: b.error.issues[0]?.message || 'Invalid details.' }, { status: 400 });
  const country = req.headers.get('x-vercel-ip-country') || u.country;
  const next = { ...u, ...b.data, country };
  await saveUser(next);
  return Response.json({ user: { email: next.email, name: next.name, phone: next.phone, country: next.country } });
}

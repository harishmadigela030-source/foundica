import { handleWebhook, verifyWebhook } from '@/lib/dodo';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Dodo Payments webhook. Add https://<your-domain>/api/pay/webhook in Dodo → Developer → Webhooks. */
export async function POST(req: Request) {
  const raw = await req.text();
  const h = { id: req.headers.get('webhook-id') || '', ts: req.headers.get('webhook-timestamp') || '', sig: req.headers.get('webhook-signature') || '' };
  if (!verifyWebhook(raw, h)) return new Response('Invalid signature', { status: 401 });
  if (!(await store.setnx(`wh:${h.id}`, 1, 7 * 86400))) return Response.json({ received: true, duplicate: true });
  try {
    const granted = await handleWebhook(JSON.parse(raw));
    return Response.json({ received: true, granted });
  } catch (e) {
    console.error('webhook failed', e);
    await store.del(`wh:${h.id}`); // let Dodo retry
    return new Response('Error', { status: 500 });
  }
}

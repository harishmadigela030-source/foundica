import crypto from 'crypto';
import { planDetails, type Plan } from './pricing';
import { addCredits } from './account';
import { store } from './store';
import type { User } from './auth';

/**
 * Dodo Payments (merchant of record: India UPI/cards + international cards, taxes handled).
 * Checkout: POST /checkouts → redirect to checkout_url. Credits are granted once per payment id,
 * from the webhook (payment.succeeded) or when the buyer returns (we re-check the payment by API).
 * Local tests: DODO_PAYMENTS_API_KEY=mock_… simulates checkout without network.
 */
const key = () => process.env.DODO_PAYMENTS_API_KEY || '';
export const isMockDodo = () => key().startsWith('mock');
const base = () => (process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com');

async function dodo<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const r = await fetch(base() + path, {
    method,
    headers: { authorization: `Bearer ${key()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { message?: string }).message || `Dodo error ${r.status}`), { status: r.status });
  return j as T;
}

type Payment = { payment_id: string; status?: string | null; metadata?: Record<string, string> | null; customer?: { email?: string } | null };

export async function createCheckout(u: User, plan: Plan, origin: string) {
  const d = planDetails(plan);
  const ret = `${origin}/app?paid=1`;
  if (isMockDodo()) {
    const pid = 'pay_mock' + crypto.randomBytes(5).toString('hex');
    await store.set(`mockpay:${pid}`, { payment_id: pid, status: 'succeeded', metadata: { uid: u.id, credits: String(d.credits), plan } }, 3600);
    return { url: `${ret}&payment_id=${pid}&status=succeeded` };
  }
  if (!d.productId) throw new Error(`Missing Dodo product id for plan "${plan}" (set DODO_PRODUCT_${plan.toUpperCase()}).`);
  const s = await dodo<{ checkout_url: string }>('POST', '/checkouts', {
    product_cart: [{ product_id: d.productId, quantity: 1 }],
    customer: { email: u.email, name: u.name || u.email.split('@')[0] },
    metadata: { uid: u.id, credits: String(d.credits), plan },
    return_url: ret,
    feature_flags: { redirect_immediately: true },
  });
  return { url: s.checkout_url };
}

async function fetchPayment(id: string): Promise<Payment> {
  if (isMockDodo()) {
    const p = await store.get<Payment>(`mockpay:${id}`);
    if (!p) throw Object.assign(new Error('Payment not found'), { status: 404 });
    return p;
  }
  return dodo<Payment>('GET', `/payments/${encodeURIComponent(id)}`);
}

/** Grant the credits of a succeeded payment exactly once. Returns credits granted now (0 if already done). */
export async function fulfil(p: Payment, expectUid?: string): Promise<number> {
  if (p.status !== 'succeeded') return 0;
  const uid = p.metadata?.uid;
  const n = Math.max(0, Math.min(10, Number(p.metadata?.credits) || 0));
  if (!uid || !n || (expectUid && uid !== expectUid)) return 0;
  if (!(await store.setnx(`paid:${p.payment_id}`, { uid, n, at: Date.now() }, 400 * 86400))) return 0;
  await addCredits(uid, n);
  return n;
}

/** Called when the buyer comes back from checkout with ?payment_id=… */
export async function confirmReturn(paymentId: string, uid: string) {
  if (!/^pay_[A-Za-z0-9]{4,60}$/.test(paymentId)) throw Object.assign(new Error('Invalid payment id'), { status: 400 });
  const p = await fetchPayment(paymentId);
  return { status: p.status || 'unknown', granted: await fulfil(p, uid) };
}

/* ---------- webhook (Standard Webhooks signature) ---------- */
export function verifyWebhook(raw: string, h: { id: string; ts: string; sig: string }): boolean {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY || '';
  if (!secret || !h.id || !h.ts || !h.sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(h.ts)) > 300) return false;
  const k = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const mine = crypto.createHmac('sha256', k).update(`${h.id}.${h.ts}.${raw}`).digest();
  return h.sig.split(' ').some((part) => {
    const [v, s] = part.split(',');
    if (v !== 'v1' || !s) return false;
    const theirs = Buffer.from(s, 'base64');
    return theirs.length === mine.length && crypto.timingSafeEqual(theirs, mine);
  });
}

export async function handleWebhook(evt: { type?: string; data?: Payment }) {
  if (evt.type === 'payment.succeeded' && evt.data?.payment_id) return fulfil({ ...evt.data, status: 'succeeded' });
  return 0;
}

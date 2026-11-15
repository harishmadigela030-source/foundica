import crypto from 'crypto';
import { cookies } from 'next/headers';
import { store } from './store';

/**
 * Email one-time-code sign-in. No passwords. Session = signed cookie (HMAC with AUTH_SECRET).
 * Codes are sent with Resend (RESEND_API_KEY + FOUNDICA_EMAIL_FROM). Without a Resend key
 * (local dev / tests) the code is returned to the browser as `devCode` and logged.
 */
export type User = { id: string; email: string; name: string; phone: string; country: string; createdAt: number; consent: boolean };

const COOKIE = 'fdc_session';
const DAY = 86400;
const secret = () => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Fallback: derive a server-only signing key from the Anthropic key that is already set in Vercel.
  if (process.env.ANTHROPIC_API_KEY) return crypto.createHash('sha256').update('foundica-session:' + process.env.ANTHROPIC_API_KEY).digest('hex');
  return process.env.NODE_ENV === 'production' && !process.env.MOCK_AI ? '' : 'dev-secret-change-me';
};
export const authConfigured = () => !!secret();

export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(e);
export const userId = (email: string) => 'u_' + crypto.createHash('sha256').update(normEmail(email)).digest('hex').slice(0, 20);
const hash = (s: string) => crypto.createHmac('sha256', secret()).update(s).digest('hex');

/** Codes are shown on screen only in local dev or demo mode, never on a real production site. */
export const devEmail = () => !process.env.RESEND_API_KEY && (process.env.NODE_ENV !== 'production' || !!process.env.MOCK_AI || process.env.FOUNDICA_SHOW_CODES === '1');
export const emailConfigured = () => !!process.env.RESEND_API_KEY || devEmail();

export async function startSignIn(email: string): Promise<{ devCode?: string }> {
  const e = normEmail(email);
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await store.set(`otp:${e}`, { h: hash(code + e), tries: 0 }, 600);
  if (!process.env.RESEND_API_KEY && !devEmail()) throw new Error('Email sign-in is not set up yet. (Admin: add RESEND_API_KEY.)');
  if (devEmail()) {
    console.log(`[foundica] sign-in code for ${e}: ${code}`);
    return { devCode: code };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FOUNDICA_EMAIL_FROM || 'Foundica <login@thefoundica.com>',
      to: [e],
      subject: `${code} is your Foundica sign-in code`,
      text: `Your Foundica sign-in code is ${code}\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.`,
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#0b1226"><p>Your Foundica sign-in code is</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p><p style="color:#5a6377">It expires in 10 minutes. If you did not ask for it, ignore this email.</p></div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    console.error('resend failed', r.status, await r.text().catch(() => ''));
    throw new Error('Could not send the email. Please try again.');
  }
  return {};
}

export async function verifyCode(email: string, code: string): Promise<User | null> {
  const e = normEmail(email);
  const rec = await store.get<{ h: string; tries: number }>(`otp:${e}`);
  if (!rec || rec.tries >= 5) return null;
  const ok = /^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(rec.h), Buffer.from(hash(code + e)));
  if (!ok) {
    await store.set(`otp:${e}`, { ...rec, tries: rec.tries + 1 }, 600);
    return null;
  }
  await store.del(`otp:${e}`);
  const id = userId(e);
  let u = await store.get<User>(`user:${id}`);
  if (!u) {
    u = { id, email: e, name: '', phone: '', country: '', createdAt: Date.now(), consent: false };
    await store.set(`user:${id}`, u);
    const welcome = Number(process.env.FOUNDICA_WELCOME_CREDITS || 0);
    if (welcome > 0) await store.incrby(`credits:${id}`, Math.min(welcome, 5));
  }
  return u;
}

/* ---------- session cookie ---------- */
function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}
export function sessionToken(uid: string, days = 30) {
  const p = `${uid}.${Math.floor(Date.now() / 1000) + days * DAY}`;
  return `${p}.${sign(p)}`;
}
export function readToken(t: string | undefined): string | null {
  if (!t || !secret()) return null;
  const i = t.lastIndexOf('.');
  if (i < 0) return null;
  const p = t.slice(0, i);
  const s = t.slice(i + 1);
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  const [uid, exp] = p.split('.');
  if (!uid || Number(exp) * 1000 < Date.now()) return null;
  return uid;
}

export async function setSession(uid: string) {
  (await cookies()).set(COOKIE, sessionToken(uid), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * DAY });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const uid = readToken((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  return store.get<User>(`user:${uid}`);
}

export async function saveUser(u: User) {
  await store.set(`user:${u.id}`, u);
}

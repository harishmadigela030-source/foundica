/**
 * Tiny key-value store. Production: Upstash Redis over REST (Vercel Marketplace sets
 * KV_REST_API_URL / KV_REST_API_TOKEN, or use UPSTASH_REDIS_REST_URL / _TOKEN).
 * Without them (local dev, tests) it falls back to memory, which resets on restart.
 */
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const hasStore = () => !!(url() && token());

type Mem = { kv: Map<string, { v: string; exp?: number }>; lists: Map<string, string[]> };
const g = globalThis as unknown as { __fdcStore?: Mem };
const mem = (): Mem => (g.__fdcStore ||= { kv: new Map(), lists: new Map() });

async function redis<T>(cmd: (string | number)[]): Promise<T> {
  const r = await fetch(url(), { method: 'POST', headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd), cache: 'no-store' });
  const j = (await r.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!r.ok || j.error) throw new Error('store: ' + (j.error || r.status));
  return j.result as T;
}

function memGet(k: string) {
  const e = mem().kv.get(k);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) {
    mem().kv.delete(k);
    return null;
  }
  return e.v;
}

export const store = {
  async get<T>(k: string): Promise<T | null> {
    const raw = hasStore() ? await redis<string | null>(['GET', k]) : memGet(k);
    return raw == null ? null : (JSON.parse(raw) as T);
  },
  async set(k: string, v: unknown, ttlSec?: number) {
    const s = JSON.stringify(v);
    if (hasStore()) await redis(ttlSec ? ['SET', k, s, 'EX', ttlSec] : ['SET', k, s]);
    else mem().kv.set(k, { v: s, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  },
  /** Set only if missing. Returns true when this call set it (used for idempotency). */
  async setnx(k: string, v: unknown, ttlSec: number): Promise<boolean> {
    const s = JSON.stringify(v);
    if (hasStore()) return (await redis<string | null>(['SET', k, s, 'NX', 'EX', ttlSec])) === 'OK';
    if (memGet(k) != null) return false;
    mem().kv.set(k, { v: s, exp: Date.now() + ttlSec * 1000 });
    return true;
  },
  async del(k: string) {
    if (hasStore()) await redis(['DEL', k]);
    else mem().kv.delete(k);
  },
  async incrby(k: string, n: number): Promise<number> {
    if (hasStore()) return redis<number>(['INCRBY', k, n]);
    const v = Number(memGet(k) || 0) + n;
    mem().kv.set(k, { v: String(v) });
    return v;
  },
  async num(k: string): Promise<number> {
    const raw = hasStore() ? await redis<string | null>(['GET', k]) : memGet(k);
    return Number(raw || 0);
  },
  /** Push to the front of a list, keep at most `max` items. */
  async lpush(k: string, v: string, max = 200) {
    if (hasStore()) {
      await redis(['LREM', k, 0, v]);
      await redis(['LPUSH', k, v]);
      await redis(['LTRIM', k, 0, max - 1]);
    } else {
      const l = (mem().lists.get(k) || []).filter((x) => x !== v);
      l.unshift(v);
      mem().lists.set(k, l.slice(0, max));
    }
  },
  async lrange(k: string, n = 50): Promise<string[]> {
    if (hasStore()) return redis<string[]>(['LRANGE', k, 0, n - 1]);
    return (mem().lists.get(k) || []).slice(0, n);
  },
};

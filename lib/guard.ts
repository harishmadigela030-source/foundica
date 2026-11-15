/** Simple per-IP limiter (in memory; resets when the server restarts). Good enough for a beta. */
const hits = new Map<string, number[]>();

export function rateLimited(ip: string, perHour?: number): boolean {
  const limit = perHour ?? Math.max(1, Number(process.env.FOUNDICA_RATE_LIMIT_PER_HOUR) || 5);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k);
  return false;
}

export function clientIp(req: Request): string {
  const f = req.headers.get('x-forwarded-for');
  return (f ? f.split(',')[0] : req.headers.get('x-real-ip')) || 'local';
}

export function accessOk(code: string): boolean {
  const need = process.env.FOUNDICA_ACCESS_CODE;
  return !need || code === need;
}

/** Send opted-in founders to the team's webhook. Never blocks or fails the request. */
export async function sendLead(payload: Record<string, unknown>) {
  const url = process.env.FOUNDICA_LEAD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) });
  } catch {
    /* ignore */
  }
}

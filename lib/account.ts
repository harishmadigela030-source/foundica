import { store } from './store';
import type { Report } from './types';
import type { ProblemMap } from './journey';

/** Credits, and the user's saved reports and problem maps (the "chat history"). */
export const credits = (uid: string) => store.num(`credits:${uid}`);

export async function addCredits(uid: string, n: number) {
  return store.incrby(`credits:${uid}`, n);
}

/** Take one credit. Returns the balance after, or throws 402 if there was none. */
export async function takeCredit(uid: string): Promise<number> {
  const left = await store.incrby(`credits:${uid}`, -1);
  if (left < 0) {
    await store.incrby(`credits:${uid}`, 1);
    throw Object.assign(new Error('You have no report credits left.'), { status: 402 });
  }
  return left;
}
export const giveBackCredit = (uid: string) => store.incrby(`credits:${uid}`, 1);

export type Item = { kind: 'report' | 'map'; id: string; title: string; at: number; meta: string };

export async function saveReport(uid: string, r: Report) {
  await store.set(`report:${r.id}`, { uid, report: r });
  await store.set(`item:${uid}:report:${r.id}`, { kind: 'report', id: r.id, title: r.startup.name || 'Founder report', at: r.createdAt, meta: `FMF ${r.fmf.score} · Durability ${r.durability.score}` } satisfies Item);
  await store.lpush(`items:${uid}`, `report:${r.id}`);
}
export async function getReport(uid: string, id: string): Promise<Report | null> {
  const x = await store.get<{ uid: string; report: Report }>(`report:${id}`);
  return x && x.uid === uid ? x.report : null;
}

export async function saveMap(uid: string, m: ProblemMap) {
  await store.set(`map:${m.id}`, { uid, map: m });
  await store.set(`item:${uid}:map:${m.id}`, { kind: 'map', id: m.id, title: `${m.startup.name} · problem map`, at: m.createdAt, meta: `${m.interviews.length} interviews · evidence ${m.evidence}` } satisfies Item);
  await store.lpush(`items:${uid}`, `map:${m.id}`);
}
export async function getMap(uid: string, id: string): Promise<ProblemMap | null> {
  const x = await store.get<{ uid: string; map: ProblemMap }>(`map:${id}`);
  return x && x.uid === uid ? x.map : null;
}

export async function history(uid: string): Promise<Item[]> {
  const keys = await store.lrange(`items:${uid}`, 60);
  const items = await Promise.all(keys.map((k) => store.get<Item>(`item:${uid}:${k}`)));
  return items.filter((x): x is Item => !!x);
}

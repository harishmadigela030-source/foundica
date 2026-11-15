import { z } from 'zod';
import { learnFromInterview } from '@/lib/journey';
import { clientIp, rateLimited } from '@/lib/guard';
import { isMock } from '@/lib/llm';
import { friendly } from '@/lib/stream';
import { currentUser } from '@/lib/auth';
import { getMap, saveMap } from '@/lib/account';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const t = (n: number) => z.string().trim().max(n).catch('');
const Body = z.object({
  mapId: z.string().max(60),
  interview: z.object({ id: t(20), date: t(20), who: t(120), role: t(120), notes: z.string().trim().min(20, 'Write at least a few sentences of notes.').max(6000) }),
});

/** Stage 3: learn from one logged customer interview and update the saved problem map. Free. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues.find((i) => i.path.includes('notes'))?.message;
    return Response.json({ error: msg || 'Invalid interview.' }, { status: 400 });
  }
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Please sign in.', needLogin: true }, { status: 401 });
  if (!isMock() && rateLimited('learn:' + u.id + clientIp(req), 40)) return Response.json({ error: 'Too many updates this hour. Please try again later.' }, { status: 429 });
  const current = await getMap(u.id, parsed.data.mapId);
  if (!current) return Response.json({ error: 'Problem map not found.' }, { status: 404 });
  try {
    const map = await learnFromInterview(current, parsed.data.interview);
    await saveMap(u.id, map);
    return Response.json({ map });
  } catch (e) {
    console.error('learn failed', e);
    return Response.json({ error: friendly(e) }, { status: 502 });
  }
}

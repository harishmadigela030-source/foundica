import { currentUser } from '@/lib/auth';
import { getMap, getReport } from '@/lib/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Load one saved report or problem map: /api/items?kind=report&id=… */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const id = (q.get('id') || '').slice(0, 60);
  if (q.get('kind') === 'map') {
    const map = await getMap(u.id, id);
    return map ? Response.json({ map }) : Response.json({ error: 'Not found.' }, { status: 404 });
  }
  const report = await getReport(u.id, id);
  return report ? Response.json({ report }) : Response.json({ error: 'Not found.' }, { status: 404 });
}

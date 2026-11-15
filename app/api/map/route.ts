import { z } from 'zod';
import { IntakeSchema } from '@/lib/types';
import { buildProblemMap } from '@/lib/journey';
import { accessOk, clientIp } from '@/lib/guard';
import { startRun } from '@/lib/charge';
import { saveMap } from '@/lib/account';
import { friendly, ndjson } from '@/lib/stream';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const Body = z.object({ intake: IntakeSchema, target: z.string().trim().max(400).default('') });

/** Stage 2: problem map with live buyer research. Uses one credit when payments are on. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Some answers are too long or invalid.' }, { status: 400 });
  const { intake, target } = parsed.data;
  const missing = (['startupName', 'sector', 'problem', 'solution'] as const).filter((k) => !intake[k].trim());
  if (missing.length || !(target || intake.customer).trim()) return Response.json({ error: 'Please fill in your startup, problem, solution and target customer.' }, { status: 400 });
  if (!accessOk(intake.accessCode)) return Response.json({ error: 'That access code is not valid.' }, { status: 403 });

  const run = await startRun(clientIp(req));
  if (run instanceof Response) return run;

  return ndjson(async (emit) => {
    try {
      const map = await buildProblemMap(intake, target, emit);
      await saveMap(run.user.id, map);
      emit({ type: 'map', map, creditsLeft: run.left });
    } catch (e) {
      console.error('problem map failed', e);
      await run.refund();
      emit({ type: 'error', message: friendly(e) + (run.paid ? ' Your credit was not used.' : '') });
    }
  });
}

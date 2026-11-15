import { IntakeSchema, REQUIRED_FIELDS } from '@/lib/types';
import { runAssessment } from '@/lib/pipeline';
import { accessOk, clientIp, sendLead } from '@/lib/guard';
import { startRun } from '@/lib/charge';
import { saveReport } from '@/lib/account';
import { friendly, ndjson } from '@/lib/stream';

export const runtime = 'nodejs';
export const maxDuration = 300; // seconds (Vercel): research with web search can take 1-3 minutes
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const parsed = IntakeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Some answers are too long or invalid.' }, { status: 400 });
  const intake = parsed.data;
  const missing = REQUIRED_FIELDS.filter((k) => !String(intake[k] || '').trim());
  if (missing.length) return Response.json({ error: 'Some required answers are missing.', missing }, { status: 400 });
  if (!accessOk(intake.accessCode)) return Response.json({ error: 'That access code is not valid.' }, { status: 403 });

  const run = await startRun(clientIp(req));
  if (run instanceof Response) return run;

  return ndjson(async (emit) => {
    try {
      const report = await runAssessment(intake, emit, 'full');
      await saveReport(run.user.id, report);
      emit({ type: 'report', report, creditsLeft: run.left });
      void sendLead({ email: run.user.email, phone: run.user.phone, founder: intake.founderName, startup: intake.startupName, sector: intake.sector, stage: intake.stage, fmf: report.fmf.score, durability: report.durability.score, halfLife: report.durability.halfLife, at: new Date().toISOString() });
    } catch (e) {
      console.error('assessment failed', e);
      await run.refund();
      emit({ type: 'error', message: friendly(e) + (run.paid ? ' Your credit was not used.' : '') });
    }
  });
}

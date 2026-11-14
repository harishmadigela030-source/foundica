import { IntakeSchema, REQUIRED_FIELDS, type StreamEvent } from '@/lib/types';
import { runAssessment } from '@/lib/pipeline';
import { accessOk, clientIp, rateLimited, sendLead } from '@/lib/guard';
import { isMock } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 300; // seconds (Vercel): research with web search can take 1-3 minutes
export const dynamic = 'force-dynamic';

function friendly(e: unknown): string {
  const err = e as { status?: number; message?: string };
  if (err?.status === 401) return 'The server API key is invalid. (Admin: check ANTHROPIC_API_KEY.)';
  if (err?.status === 429) return 'The AI is busy right now. Please try again in a minute.';
  if (err?.status === 529 || err?.status === 503) return 'The AI service is overloaded. Please try again shortly.';
  if (err?.message?.includes('ANTHROPIC_API_KEY')) return 'The server is not configured yet. (Admin: set ANTHROPIC_API_KEY.)';
  return 'Something went wrong while generating your report. Please try again.';
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Some answers are too long or invalid.' }, { status: 400 });
  const intake = parsed.data;
  const missing = REQUIRED_FIELDS.filter((k) => !String(intake[k] || '').trim());
  if (missing.length) return Response.json({ error: 'Please fill in all required fields.', missing }, { status: 400 });
  if (!accessOk(intake.accessCode)) return Response.json({ error: 'That access code is not valid.' }, { status: 403 });
  if (!isMock() && rateLimited(clientIp(req))) return Response.json({ error: 'You have reached the free limit for this hour. Please try again later.' }, { status: 429 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const emit = (e: StreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + '\n'));
        } catch {
          open = false;
        }
      };
      // keep-alive so proxies don't drop a quiet connection during long searches
      const ka = setInterval(() => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode('\n'));
        } catch {
          open = false;
        }
      }, 15000);
      try {
        const report = await runAssessment(intake, emit);
        emit({ type: 'report', report });
        if (intake.consent && intake.email) {
          void sendLead({ email: intake.email, founder: intake.founderName, startup: intake.startupName, sector: intake.sector, stage: intake.stage, fmf: report.fmf.score, durability: report.durability.score, halfLife: report.durability.halfLife, at: new Date().toISOString() });
        }
      } catch (e) {
        console.error('assessment failed', e);
        emit({ type: 'error', message: friendly(e) });
      } finally {
        clearInterval(ka);
        open = false;
        try {
          controller.close();
        } catch {
          /* closed */
        }
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}

import { z } from 'zod';
import { reportPdf } from '@/lib/pdf';
import type { Report } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const t = (max: number) => z.string().max(max).catch('');
const n = (lo: number, hi: number) => z.number().min(lo).max(hi).catch(lo);
const ids = z.array(z.number().int()).max(10).catch([]);
const lvl = z.enum(['low', 'medium', 'high']).catch('medium');

// The client sends back the report it received; re-validate every field before drawing it.
const ReportSchema = z.object({
  id: t(40),
  createdAt: z.number().catch(Date.now()),
  mock: z.boolean().catch(false),
  startup: z.object({ name: t(120), sector: t(120), stage: t(60), geography: t(120), website: t(200), founder: t(120) }),
  fmf: z.object({
    score: n(0, 100), summary: t(1000),
    signals: z.array(z.object({ key: t(40), name: t(60), weight: n(0, 1), score: n(0, 10), evidence: t(500), improve: t(400), adjusted: t(300).optional() })).max(10),
    topMoves: z.array(t(300)).max(5).catch([]), redFlags: z.array(t(300)).max(5).catch([]),
  }),
  durability: z.object({
    score: n(0, 100), halfLife: z.object({ low: n(0, 20), high: n(0, 20) }), verdict: t(600), biggestThreat: t(400),
    tests: z.array(z.object({ key: t(40), name: t(60), score: n(0, 10), finding: t(500), sourceIds: ids, adjusted: t(300).optional() })).max(10),
    timeline: z.array(z.object({ year: z.number().int().catch(2026), outlook: t(300), risk: lvl })).max(10).catch([]),
    moves: z.array(z.object({ move: t(300), impact: t(80) })).max(5).catch([]),
  }),
  competition: z.object({
    intensity: n(0, 10),
    competitors: z.array(z.object({ name: t(120), type: z.enum(['direct', 'indirect', 'big_platform']).catch('direct'), what: t(300), scale: t(200), threat: lvl, sourceIds: ids })).max(12).catch([]),
    facts: z.array(z.object({ claim: t(400), sourceIds: ids })).max(8).catch([]),
  }),
  research: z.object({
    segments: z.array(z.object({ text: t(4000), sourceIds: ids })).max(300).catch([]),
    sources: z.array(z.object({ id: z.number().int(), url: z.string().url().max(2000), title: t(300), citedText: t(400), pageAge: z.string().max(80).nullable().optional() })).max(80).catch([]),
    queries: z.array(t(300)).max(30).catch([]),
  }),
  critic: z.object({ confidence: n(0, 100), warnings: z.array(t(300)).max(6).catch([]), unsupported: z.array(t(300)).max(6).catch([]) }),
  nextSteps: z.array(t(300)).max(6).catch([]),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 800_000) return Response.json({ error: 'Report too large.' }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid report.' }, { status: 400 });
  }
  const parsed = ReportSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: 'Invalid report.' }, { status: 400 });
  const r = parsed.data as Report;
  r.research.sources = r.research.sources.filter((s) => /^https?:\/\//i.test(s.url));
  try {
    const pdf = await reportPdf(r);
    const name = (r.startup.name || 'startup').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'startup';
    return new Response(new Uint8Array(pdf), {
      headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="foundica-report-${name}.pdf"`, 'cache-control': 'no-store' },
    });
  } catch (e) {
    console.error('pdf failed', e);
    return Response.json({ error: 'Could not create the PDF.' }, { status: 500 });
  }
}

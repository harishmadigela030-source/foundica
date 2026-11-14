import { describe, expect, it, beforeAll } from 'vitest';
import { briefWithMarkers, extractResearch, parseJsonObject, validIds } from '../lib/citations';
import { applyCritic, normDurability, normFmf, runAssessment } from '../lib/pipeline';
import { pdfText } from '../lib/pdf';
import { IntakeSchema, type StreamEvent } from '../lib/types';

describe('citation extraction', () => {
  const blocks = [
    { type: 'text', text: "I'll search for that." },
    { type: 'server_tool_use', name: 'web_search', input: { query: 'ai triage india' } },
    { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://a.com/x#frag', title: 'A', page_age: 'May 2026' }] },
    { type: 'text', text: 'Company A does triage', citations: [{ type: 'web_search_result_location', url: 'https://a.com/x', title: 'A page', cited_text: 'A does triage' }] },
    { type: 'text', text: ' and B raised money', citations: [{ type: 'web_search_result_location', url: 'https://b.com', title: null, cited_text: 'B raised' }, { type: 'web_search_result_location', url: 'https://a.com/x', title: 'A page', cited_text: 'dup' }] },
    { type: 'text', text: '.' },
    { type: 'text', text: ' Bad link', citations: [{ type: 'web_search_result_location', url: 'javascript:alert(1)', title: 'x', cited_text: 'x' }] },
  ];
  const r = extractResearch(blocks as never);
  it('drops pre-search narration', () => expect(r.segments[0].text).toBe('Company A does triage'));
  it('numbers sources by first citation and dedupes', () => {
    expect(r.sources.map((s) => s.url)).toEqual(['https://a.com/x', 'https://b.com/']);
    expect(r.segments[1].sourceIds).toEqual([2, 1]);
  });
  it('uses host when title is missing, keeps page age', () => {
    expect(r.sources[1].title).toBe('b.com');
    expect(r.sources[0].pageAge).toBe('May 2026');
  });
  it('captures queries', () => expect(r.queries).toEqual(['ai triage india']));
  it('rejects non-http urls', () => expect(r.sources.some((s) => s.url.startsWith('javascript'))).toBe(false));
  it('builds a marked brief', () => {
    const b = briefWithMarkers(r);
    expect(b).toContain('Company A does triage [1]');
    expect(b).toContain('[2] b.com — https://b.com/');
  });
  it('validIds filters unknown ids', () => expect(validIds([1, 2, 9, '2', 'x'], r.sources)).toEqual([1, 2]));
});

describe('json parsing', () => {
  it('parses fenced and embedded json', () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('Sure! {"a":2} hope that helps')).toEqual({ a: 2 });
    expect(parseJsonObject('no json')).toBeNull();
  });
});

describe('normalisation', () => {
  it('FMF: clamps, fills missing signals and computes weighted score in code', () => {
    const f = normFmf({ signals: [{ key: 'insight', score: 99 }, { key: 'bogus', score: 5 }], summary: 'x' });
    expect(f.signals).toHaveLength(7);
    expect(f.signals[0].score).toBe(10);
    expect(f.score).toBe(22); // only insight = 10 * 0.22 * 10
  });
  it('durability: fixes swapped half-life and averages tests', () => {
    const d = normDurability({ tests: [{ key: 'cost_collapse', score: 8, source_ids: [1, 5] }], half_life_years: { low: 9, high: 2 } }, { segments: [], sources: [{ id: 1, url: 'https://a.com', title: 'a', citedText: '' }], queries: [] });
    expect(d.halfLife).toEqual({ low: 2, high: 9 });
    expect(d.score).toBe(10); // 8 / 8 tests * 10
    expect(d.tests.find((t) => t.key === 'cost_collapse')!.sourceIds).toEqual([1]);
  });
  it('critic adjustments recompute scores and are labelled', () => {
    const f = normFmf({ signals: [{ key: 'insight', score: 10 }] });
    const d = normDurability({ tests: [] }, { segments: [], sources: [], queries: [] });
    const c = applyCritic({ confidence: 140, fmf_adjustments: [{ key: 'insight', score: 5, why: 'thin' }] }, f, d);
    expect(f.score).toBe(11);
    expect(f.signals[0].adjusted).toBe('thin');
    expect(c.confidence).toBe(100);
  });
});

describe('pdf text', () => {
  it('maps characters the built-in fonts cannot draw', () => {
    expect(pdfText('₹2 Cr → seed ✓ 日本')).toBe('Rs.2 Cr -> seed v ');
    expect(pdfText('“quote” – dash')).toBe('“quote” – dash');
  });
});

describe('full pipeline (mock AI)', () => {
  beforeAll(() => {
    process.env.MOCK_AI = '1';
  });
  it('runs all agents, streams progress and returns a consistent report', async () => {
    const events: StreamEvent[] = [];
    const intake = IntakeSchema.parse({ founderName: 'A', experience: 'x', insight: 'y', startupName: 'Acme', sector: 'Health', problem: 'p', solution: 's', aiUsage: 'a' });
    const r = await runAssessment(intake, (e) => events.push(e));
    expect(events.filter((e) => e.type === 'step' && e.status === 'done')).toHaveLength(5);
    expect(events.some((e) => e.type === 'query')).toBe(true);
    expect(events.some((e) => e.type === 'source')).toBe(true);
    expect(r.mock).toBe(true);
    expect(r.research.sources).toHaveLength(4);
    // competitor with an invalid source id (99) keeps only the valid one
    expect(r.competition.competitors[2].sourceIds).toEqual([4]);
    // critic lowered distribution 3 -> 2 and platform_feature 4 -> 3
    expect(r.fmf.signals.find((s) => s.key === 'distribution')!.score).toBe(2);
    expect(r.durability.tests.find((t) => t.key === 'platform_feature')!.score).toBe(3);
    // scores computed in code from the adjusted signals
    expect(r.fmf.score).toBe(Math.round(r.fmf.signals.reduce((t, s) => t + s.weight * s.score * 10, 0)));
    expect(r.durability.score).toBe(Math.round((r.durability.tests.reduce((t, x) => t + x.score, 0) / 8) * 10));
    expect(r.nextSteps.length).toBeGreaterThan(0);
  });
});

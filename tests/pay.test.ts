import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

beforeAll(() => {
  process.env.MOCK_AI = '1';
});

describe('pricing', () => {
  it('defaults and env overrides', async () => {
    const { prices, planDetails } = await import('../lib/pricing');
    expect(prices().single).toBe(499);
    expect(planDetails('pack').credits).toBe(3);
    process.env.FOUNDICA_PRICE_SINGLE_INR = '699';
    expect(prices().single).toBe(699);
    delete process.env.FOUNDICA_PRICE_SINGLE_INR;
  });
});

describe('auth', () => {
  it('email code sign-in and signed sessions', async () => {
    const a = await import('../lib/auth');
    const { devCode } = await a.startSignIn('Founder@Example.com');
    expect(devCode).toMatch(/^\d{6}$/);
    expect(await a.verifyCode('founder@example.com', '000000' === devCode ? '111111' : '000000')).toBeNull();
    const u = await a.verifyCode('founder@example.com', devCode!);
    expect(u?.email).toBe('founder@example.com');
    expect(await a.verifyCode('founder@example.com', devCode!)).toBeNull(); // single use
    const t = a.sessionToken(u!.id);
    expect(a.readToken(t)).toBe(u!.id);
    expect(a.readToken(t.slice(0, -2) + 'xx')).toBeNull();
    expect(a.readToken(a.sessionToken(u!.id, -1))).toBeNull(); // expired
  });
  it('locks a code after 5 wrong tries', async () => {
    const a = await import('../lib/auth');
    const { devCode } = await a.startSignIn('lock@example.com');
    for (let i = 0; i < 5; i++) await a.verifyCode('lock@example.com', '999999' === devCode ? '888888' : '999999');
    expect(await a.verifyCode('lock@example.com', devCode!)).toBeNull();
  });
});

describe('credits and payments', () => {
  it('take / give back credits; never below zero', async () => {
    const acc = await import('../lib/account');
    await acc.addCredits('u_t1', 1);
    expect(await acc.takeCredit('u_t1')).toBe(0);
    await expect(acc.takeCredit('u_t1')).rejects.toMatchObject({ status: 402 });
    expect(await acc.credits('u_t1')).toBe(0);
    await acc.giveBackCredit('u_t1');
    expect(await acc.credits('u_t1')).toBe(1);
  });
  it('a payment grants credits once, only to its owner', async () => {
    const d = await import('../lib/dodo');
    const acc = await import('../lib/account');
    const p = { payment_id: 'pay_abc123', status: 'succeeded', metadata: { uid: 'u_t2', credits: '3' } };
    expect(await d.fulfil(p, 'u_other')).toBe(0);
    expect(await d.fulfil(p, 'u_t2')).toBe(3);
    expect(await d.fulfil(p)).toBe(0); // webhook after return: no double grant
    expect(await acc.credits('u_t2')).toBe(3);
    expect(await d.fulfil({ ...p, payment_id: 'pay_x2', status: 'failed' })).toBe(0);
  });
  it('verifies Standard Webhooks signatures', async () => {
    const crypto = await import('crypto');
    const d = await import('../lib/dodo');
    const key = crypto.randomBytes(24);
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = 'whsec_' + key.toString('base64');
    const id = 'msg_1', ts = String(Math.floor(Date.now() / 1000)), body = '{"type":"payment.succeeded"}';
    const sig = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
    expect(d.verifyWebhook(body, { id, ts, sig: `v1,${sig}` })).toBe(true);
    expect(d.verifyWebhook(body + ' ', { id, ts, sig: `v1,${sig}` })).toBe(false);
    expect(d.verifyWebhook(body, { id, ts: String(Number(ts) - 1000), sig: `v1,${sig}` })).toBe(false);
  });
});

describe('quick tier pipeline', () => {
  it('skips research and competitors', async () => {
    const { runAssessment } = await import('../lib/pipeline');
    const { IntakeSchema } = await import('../lib/types');
    const i = IntakeSchema.parse({ founderName: 'A', experience: 'x', insight: 'y', startupName: 'S', sector: 'Health', problem: 'p', solution: 's', aiUsage: 'a' });
    const ev: string[] = [];
    const rep = await runAssessment(i, (e) => ev.push(e.type === 'query' ? 'query' : e.type), 'quick');
    expect(rep.tier).toBe('quick');
    expect(rep.research.sources.length).toBe(0);
    expect(rep.competition.competitors.length).toBe(0);
    expect(ev).not.toContain('query');
    expect(rep.fmf.score).toBeGreaterThan(0);
  });
});

describe('journey: problem map + customer loop', () => {
  it('builds a map, learns from an interview, and the evidence score rises', async () => {
    const { buildProblemMap, learnFromInterview, evidenceScore, gate3 } = await import('../lib/journey');
    const { IntakeSchema } = await import('../lib/types');
    const i = IntakeSchema.parse({ startupName: 'TriageAI', sector: 'Health', problem: 'p', solution: 's', customer: 'ER heads' });
    const ev: string[] = [];
    const m = await buildProblemMap(i, 'ER nursing heads', (e) => ev.push(e.type));
    expect(m.assumptions.length).toBe(6);
    expect(m.assumptions.every((a) => a.status === 'unknown')).toBe(true);
    expect(m.evidence).toBe(0);
    expect(ev).toContain('query');
    // a source id that does not exist is dropped
    expect(m.whereBuyers.every((b) => b.sourceIds.every((id) => m.research.sources.some((s) => s.id === id)))).toBe(true);
    const m2 = await learnFromInterview(m, { id: 'x', date: '2026-11-15', who: 'R', role: 'Nurse', notes: 'We never track time to triage. We use tablets for drug charts already.' });
    expect(m2.interviews.length).toBe(1);
    expect(m2.assumptions[0].status).toBe('killed');
    expect(m2.assumptions[2].status).toBe('validated');
    expect(m2.assumptions.length).toBe(7);
    expect(m2.evidence).toBe(evidenceScore(m2));
    expect(m2.evidence).toBeGreaterThan(m.evidence);
    expect(m2.nextQuestions.length).toBeGreaterThan(0);
    expect(gate3(m2).open).toBe(false);
  });
});

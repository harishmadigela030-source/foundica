import { z } from 'zod';

/* ---------- founder intake ---------- */
const s = (max: number) => z.string().trim().max(max).default('');

export const IntakeSchema = z.object({
  // step 1: founder
  founderName: s(120),
  role: s(120),
  yearsInIndustry: s(40),
  experience: s(2000),
  priorStartups: s(1000),
  buyerAccess: s(60),
  network: s(1000),
  commitment: s(60),
  technical: s(80),
  audience: s(500),
  insight: s(2000),
  // step 2: startup
  startupName: s(120),
  website: s(200),
  sector: s(120),
  stage: s(60),
  problem: s(2000),
  customer: s(600),
  solution: s(2000),
  aiUsage: s(2000),
  dataMoat: s(1500),
  traction: s(1500),
  businessModel: s(1000),
  // step 3: market
  geography: s(120),
  knownCompetitors: s(800),
  fundingGoal: s(200),
  email: s(200),
  consent: z.boolean().default(false),
  accessCode: s(100),
});
export type Intake = z.infer<typeof IntakeSchema>;

export const REQUIRED_FIELDS: (keyof Intake)[] = ['founderName', 'experience', 'insight', 'startupName', 'sector', 'problem', 'solution', 'aiUsage'];

/* ---------- sources & citations ---------- */
export type Source = {
  id: number; // 1-based, as shown to the founder: [1], [2]
  url: string;
  title: string;
  citedText: string;
  pageAge?: string | null;
};
export type Segment = { text: string; sourceIds: number[] };

export type Research = {
  segments: Segment[];
  sources: Source[];
  queries: string[];
};

/* ---------- scores ---------- */
export const FMF_SIGNALS = [
  { key: 'insight', name: 'Earned insight', weight: 0.22, what: 'Do you know something about this problem that most people do not?' },
  { key: 'access', name: 'Buyer access', weight: 0.2, what: 'Can you personally reach your first 50 target buyers?' },
  { key: 'credibility', name: 'Credibility', weight: 0.14, what: 'Would buyers trust you with this problem and their data?' },
  { key: 'commitment', name: 'Commitment', weight: 0.12, what: 'Full-time, personal stake, follow-through.' },
  { key: 'learning_speed', name: 'Learning speed', weight: 0.12, what: 'How fast you ship and learn, using AI.' },
  { key: 'distribution', name: 'Distribution advantage', weight: 0.1, what: 'An audience, community or channel you own.' },
  { key: 'technical', name: 'Technical depth', weight: 0.1, what: 'Can your team build and run the product?' },
] as const;
export type FmfKey = (typeof FMF_SIGNALS)[number]['key'];

export const DURABILITY_TESTS = [
  { key: 'model_improvement', name: 'Model-improvement test', q: 'Does the product get better (not obsolete) when frontier models improve?' },
  { key: 'cost_collapse', name: 'Cost-collapse test', q: 'If AI becomes nearly free, is the value still there?' },
  { key: 'platform_feature', name: 'Platform-feature test', q: 'How hard is it for OpenAI, Google, Microsoft or a big SaaS to ship this as a feature?' },
  { key: 'personal_agent', name: 'Personal-agent test', q: "Will customers' own AI agents use this product rather than replace it?" },
  { key: 'data_flywheel', name: 'Data flywheel test', q: 'Does every customer make the product better in a way competitors cannot copy?' },
  { key: 'real_world_anchor', name: 'Real-world anchor test', q: 'Is it tied to hardware, operations, regulation, licences, liability or money flows?' },
  { key: 'workflow_ownership', name: 'Workflow-ownership test', q: 'Is it the system of record where work happens and data lives?' },
  { key: 'trust_network', name: 'Trust & network test', q: 'Does it have network effects, community or reputation that grows with use?' },
] as const;
export type DurKey = (typeof DURABILITY_TESTS)[number]['key'];

export type FmfSignal = { key: FmfKey; name: string; weight: number; score: number; evidence: string; improve: string; adjusted?: string };
export type Fmf = { score: number; summary: string; signals: FmfSignal[]; topMoves: string[]; redFlags: string[] };

export type Competitor = {
  name: string;
  type: 'direct' | 'indirect' | 'big_platform';
  what: string;
  scale: string;
  threat: 'low' | 'medium' | 'high';
  sourceIds: number[];
};
export type MarketFact = { claim: string; sourceIds: number[] };

export type DurTest = { key: DurKey; name: string; score: number; finding: string; sourceIds: number[]; adjusted?: string };
export type Durability = {
  score: number;
  halfLife: { low: number; high: number };
  verdict: string;
  biggestThreat: string;
  tests: DurTest[];
  timeline: { year: number; outlook: string; risk: 'low' | 'medium' | 'high' }[];
  moves: { move: string; impact: string }[];
};

export type Critic = { confidence: number; warnings: string[]; unsupported: string[] };

export type Report = {
  id: string;
  createdAt: number;
  mock: boolean;
  startup: { name: string; sector: string; stage: string; geography: string; website: string; founder: string };
  fmf: Fmf;
  durability: Durability;
  competition: { intensity: number; competitors: Competitor[]; facts: MarketFact[] };
  research: Research;
  critic: Critic;
  nextSteps: string[];
};

/* ---------- stream events ---------- */
export type StreamEvent =
  | { type: 'step'; step: number; status: 'run' | 'done' | 'error'; note?: string }
  | { type: 'query'; q: string }
  | { type: 'source'; source: { url: string; title: string } }
  | { type: 'report'; report: Report }
  | { type: 'error'; message: string };

export const STEPS = [
  'Founder-Market Fit agent',
  'Market research agent (live web search)',
  'Competitor mapping',
  'AI-durability agent (5–10 year test)',
  'Critic agent (checks every claim)',
];

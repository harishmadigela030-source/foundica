/**
 * Sample data for MOCK_AI=1 (demo and tests). Every source points at
 * example.com so it can never be mistaken for real research.
 */
export function mockResearchBlocks(): unknown[] {
  const cite = (n: number, text: string) => ({
    type: 'web_search_result_location',
    url: `https://example.com/sample-source-${n}`,
    title: `Sample source ${n} (demo data)`,
    cited_text: text,
    encrypted_index: 'x',
  });
  return [
    { type: 'text', text: "I'll research the market." },
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'AI triage software hospitals India competitors' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 's1',
      content: [1, 2, 3].map((n) => ({ type: 'web_search_result', url: `https://example.com/sample-source-${n}`, title: `Sample source ${n} (demo data)`, page_age: 'Demo' })),
    },
    { type: 'server_tool_use', id: 's2', name: 'web_search', input: { query: 'clinical decision support AI funding 2026' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 's2',
      content: [4].map((n) => ({ type: 'web_search_result', url: `https://example.com/sample-source-${n}`, title: `Sample source ${n} (demo data)`, page_age: 'Demo' })),
    },
    { type: 'text', text: '## Competitors\n' },
    { type: 'text', text: 'Demo Competitor A sells AI triage to large hospital chains', citations: [cite(1, 'Demo Competitor A provides AI triage...')] },
    { type: 'text', text: ', and Demo Competitor B raised a seed round for clinical copilots', citations: [cite(2, 'Demo Competitor B raised...')] },
    { type: 'text', text: '.\n\n## Market\nHospitals are increasing spend on clinical AI tools', citations: [cite(3, 'Spend on clinical AI is rising...'), cite(1, 'x')] },
    { type: 'text', text: ', while general-purpose AI assistants are adding medical features', citations: [cite(4, 'Assistants add medical features...')] },
    { type: 'text', text: '.\n' },
  ];
}

export function mockJSON(kind: string): Record<string, unknown> {
  switch (kind) {
    case 'fmf':
      return {
        summary: 'Demo: strong domain insight from years in emergency medicine; buyer access is good locally but unproven at scale.',
        signals: [
          { key: 'insight', score: 8, evidence: 'Worked 6 years as an ER doctor.', improve: 'Write down the 3 things you know that others do not.' },
          { key: 'access', score: 6, evidence: 'Knows ER heads at 4 hospitals.', improve: 'Get 10 warm intros to hospital procurement heads.' },
          { key: 'credibility', score: 7, evidence: 'Clinician background.', improve: 'Publish one case study.' },
          { key: 'commitment', score: 5, evidence: 'Part-time.', improve: 'Set a date to go full-time.' },
          { key: 'learning_speed', score: 6, evidence: 'Prototype in 6 weeks.', improve: 'Ship weekly.' },
          { key: 'distribution', score: 3, evidence: 'No audience.', improve: 'Start posting ER insights weekly.' },
          { key: 'technical', score: 5, evidence: 'Freelance developer.', improve: 'Find a technical co-founder.' },
        ],
        top_moves: ['Go full-time by a set date', 'Get 10 warm intros to buyers', 'Find a technical co-founder'],
        red_flags: ['No technical co-founder'],
      };
    case 'structure':
      return {
        competitors: [
          { name: 'Demo Competitor A', type: 'direct', what: 'AI triage for hospital chains', scale: 'Unknown', threat: 'high', source_ids: [1] },
          { name: 'Demo Competitor B', type: 'indirect', what: 'Clinical copilots', scale: 'Seed-funded', threat: 'medium', source_ids: [2] },
          { name: 'General AI assistants', type: 'big_platform', what: 'Adding medical features', scale: 'Global', threat: 'medium', source_ids: [4, 99] },
        ],
        market_facts: [{ claim: 'Hospital spend on clinical AI is rising.', source_ids: [3] }],
        competition_intensity: 7,
      };
    case 'durability':
      return {
        tests: [
          { key: 'model_improvement', score: 7, finding: 'Better models improve triage accuracy.', source_ids: [] },
          { key: 'cost_collapse', score: 6, finding: 'Value is in workflow, not tokens.', source_ids: [] },
          { key: 'platform_feature', score: 4, finding: 'Assistants are adding medical features.', source_ids: [4] },
          { key: 'personal_agent', score: 5, finding: 'Could be an API used by hospital agents.', source_ids: [] },
          { key: 'data_flywheel', score: 7, finding: 'Outcome data from hospitals improves the model.', source_ids: [] },
          { key: 'real_world_anchor', score: 8, finding: 'Clinical regulation and hospital integration.', source_ids: [] },
          { key: 'workflow_ownership', score: 6, finding: 'Sits inside the ER workflow.', source_ids: [] },
          { key: 'trust_network', score: 5, finding: 'Clinician trust builds slowly.', source_ids: [] },
        ],
        half_life_years: { low: 3, high: 6 },
        verdict: 'Demo: durable if it owns hospital outcome data and gets regulatory clearance.',
        biggest_threat: 'General AI assistants adding triage features.',
        timeline: [2026, 2027, 2028, 2029, 2030, 2031].map((y, i) => ({ year: y, outlook: `Demo outlook for ${y}`, risk: i < 2 ? 'low' : i < 4 ? 'medium' : 'high' })),
        moves: [
          { move: 'Sign data-sharing pilots with 3 hospitals', impact: '+2 years' },
          { move: 'Start regulatory clearance', impact: '+1–2 years' },
          { move: 'Expose an API for hospital agents', impact: '+1 year' },
        ],
      };
    case 'critic':
      return {
        confidence: 72,
        warnings: ['Demo: traction claims are self-reported.'],
        unsupported: ['Demo: market size not sourced.'],
        fmf_adjustments: [{ key: 'distribution', score: 2, why: 'No evidence of any audience.' }],
        durability_adjustments: [{ key: 'platform_feature', score: 3, why: 'Big assistants already ship medical features.' }],
        half_life_years: null,
      };
    case 'problemmap':
      return {
        summary: 'Demo: ER nurses lose time re-triaging walk-ins because vitals and history arrive late; the hospital pays through its quality budget.',
        workflow: [
          { step: 'Patient arrives, registration desk', pain: 'Wait 10-25 min before anyone checks vitals' },
          { step: 'Nurse triage (paper or HIS form)', pain: 'Inconsistent scoring between nurses' },
          { step: 'Doctor review', pain: 'Re-asks the same questions' },
        ],
        who_pays: { user: 'ER nurses', buyer: 'Medical superintendent', budget_owner: 'Hospital quality / operations head', budget: 'Not found: ask in interviews' },
        workaround: 'Paper triage sheets and senior nurse judgment',
        cost_of_problem: 'Delays in critical cases; NABH audit risk (to verify)',
        layers: ['Symptom: long ER waits', 'Cause: triage is manual and inconsistent', 'Root: no structured data at the door, so no one can measure or improve triage'],
        assumptions: [
          { text: 'Hospitals measure ER door-to-triage time today', risk: 'high' },
          { text: 'The medical superintendent can approve a pilot without a tender', risk: 'high' },
          { text: 'Nurses will enter vitals on a tablet at the door', risk: 'high' },
          { text: 'Hospitals will pay for faster triage, not just accept it free', risk: 'medium' },
          { text: 'NABH accreditation creates pressure to fix triage', risk: 'medium' },
          { text: 'HIS vendors do not already offer this', risk: 'low' },
        ],
        where_buyers: [
          { segment: 'Private multi-specialty hospitals, 200+ beds', where: 'Demo: state hospital association events', source_ids: [1] },
          { segment: 'Emergency medicine leaders', where: 'Demo: emergency medicine society conferences', source_ids: [2] },
        ],
        interview_script: ['Walk me through the last busy night in your ER.', 'What happened the last time triage went wrong?', 'How do you measure triage today?', 'Who would sign off on trying a new tool?', 'What have you tried already?'],
      };
    case 'loop':
      return {
        updates: [
          { index: 0, status: 'killed', evidence: 'Demo: the nurse said nobody tracks door-to-triage time.' },
          { index: 2, status: 'validated', evidence: 'Demo: nurses already use tablets for drug charts.' },
        ],
        new_assumptions: [{ text: 'Quality heads care more about audit scores than waiting time', risk: 'medium' }],
        learnings: ['Demo: the pain is felt by nurses, but the budget sits with the quality head.'],
        next_questions: ['Who gets blamed when a critical patient waits too long?', 'What do NABH auditors check in the ER?'],
      };
    default:
      return {};
  }
}

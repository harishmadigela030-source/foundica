/** The conversational intake: which answer we still need, and how we ask for it. Shared by browser and server. */
import type { Intake } from './types';

export type Q = { key: keyof Intake; ask: string; chips?: string[]; optional?: boolean; long?: boolean };

export const OPENING = "Tell me about what you're building: the problem, who has it, and how you use AI. Write it like you'd tell a friend. I'll ask only for what's missing.";

export const QUESTIONS: Q[] = [
  { key: 'startupName', ask: "What's your startup called? (A working name is fine.)" },
  { key: 'sector', ask: 'Which sector is it in?', chips: ['Healthtech', 'Fintech', 'Climate / Energy', 'Agritech', 'Edtech', 'Manufacturing', 'Enterprise SaaS', 'Legal / Gov'] },
  { key: 'problem', ask: 'What problem are you solving, and who has it?', long: true },
  { key: 'customer', ask: 'Who pays? Be specific: role, type of organisation and size.' },
  { key: 'solution', ask: 'What is your solution, in two or three sentences?', long: true },
  { key: 'aiUsage', ask: 'How do you use AI/ML, and why does this need AI rather than normal software?', long: true },
  { key: 'founderName', ask: "Now about you. What's your name?" },
  { key: 'experience', ask: 'What have you done that is directly related to this problem? Years, roles, numbers.', long: true },
  { key: 'insight', ask: 'What do you know about this problem that most people, including big companies, do not?', long: true },
  { key: 'stage', ask: 'Where are you today?', chips: ['Idea', 'Prototype / MVP', 'Pilots with customers', 'Early revenue', 'Growing revenue'], optional: true },
  { key: 'buyerAccess', ask: 'How many target buyers can you personally reach?', chips: ['None yet', '1–10', '10–50', '50–200', '200+'], optional: true },
  { key: 'commitment', ask: 'How committed are you right now?', chips: ['Full-time', 'Part-time, going full-time soon', 'Part-time', 'Exploring'], optional: true },
  { key: 'traction', ask: 'Any traction? Users, pilots, revenue, letters of intent. Real numbers only.', optional: true, long: true },
  { key: 'geography', ask: 'Which market first?', chips: ['India', 'India + global', 'US', 'Europe', 'South-East Asia', 'Middle East', 'Global'], optional: true },
];

export const SKIP = 'Skip';

/** Next question to ask, given the answers so far and which optional ones were skipped or asked. */
export function nextQuestion(f: Partial<Intake>, asked: string[]): Q | null {
  for (const q of QUESTIONS) {
    const has = String(f[q.key] ?? '').trim();
    if (has) continue;
    if (q.optional && asked.includes(q.key)) continue;
    return q;
  }
  return null;
}

export const FIELD_LABELS: Partial<Record<keyof Intake, string>> = {
  startupName: 'Startup', sector: 'Sector', problem: 'Problem', customer: 'Who pays', solution: 'Solution', aiUsage: 'AI use', founderName: 'Founder',
  experience: 'Experience', insight: 'Unfair insight', stage: 'Stage', buyerAccess: 'Buyer access', commitment: 'Commitment', traction: 'Traction', geography: 'Market',
};

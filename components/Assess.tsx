'use client';
import { useEffect, useRef, useState } from 'react';
import { REQUIRED_FIELDS, STEPS, type Intake, type Report, type StreamEvent } from '@/lib/types';
import ReportView from './ReportView';
import { Favicon, hostOf } from './Cite';

type F = { k: keyof Intake; label: string; hint?: string; ta?: boolean; options?: string[]; ph?: string };
const SECTIONS: { title: string; intro: string; fields: F[] }[] = [
  {
    title: 'You, the founder',
    intro: 'Founder-Market Fit is about what you know and who you can reach. Be specific: years, names of roles, numbers.',
    fields: [
      { k: 'founderName', label: 'Your name' },
      { k: 'role', label: 'Your role', ph: 'e.g. CEO, ex-ER doctor' },
      { k: 'yearsInIndustry', label: 'Years in this industry', options: ['', 'Less than 1', '1–3', '3–7', '7–15', '15+'] },
      { k: 'experience', label: 'Relevant experience', ta: true, hint: 'What have you done that is directly related to this problem?' },
      { k: 'insight', label: 'Your unfair insight', ta: true, hint: 'What do you know about this problem that most people, including big companies, do not?' },
      { k: 'buyerAccess', label: 'How many target buyers can you personally reach?', options: ['', 'None yet', '1–10', '10–50', '50–200', '200+'] },
      { k: 'network', label: 'Network & communities', ta: true, hint: 'Industry groups, associations, alumni, partners that give you access.' },
      { k: 'commitment', label: 'Commitment', options: ['', 'Full-time', 'Part-time, going full-time soon', 'Part-time', 'Exploring'] },
      { k: 'technical', label: 'Who builds the product?', options: ['', 'I build it myself', 'Technical co-founder', 'Small in-house team', 'Freelancers / agency', 'Not decided yet'] },
      { k: 'priorStartups', label: 'Previous startups or exits', hint: 'Optional' },
      { k: 'audience', label: 'Audience you own', hint: 'Optional: followers, newsletter, community size' },
    ],
  },
  {
    title: 'Your startup',
    intro: 'The more evidence (customers, numbers, data) you give, the more useful the report.',
    fields: [
      { k: 'startupName', label: 'Startup name' },
      { k: 'website', label: 'Website', hint: 'Optional. Helps the research agent find you and your competitors.', ph: 'https://' },
      { k: 'sector', label: 'Sector', ph: 'e.g. Healthtech, Fintech, Manufacturing, Climate' },
      { k: 'stage', label: 'Stage', options: ['', 'Idea', 'Prototype / MVP', 'Pilots with customers', 'Early revenue', 'Growing revenue'] },
      { k: 'problem', label: 'Problem, and who has it', ta: true },
      { k: 'customer', label: 'Who pays?', ph: 'e.g. procurement heads at 200+ bed hospitals' },
      { k: 'solution', label: 'Your solution', ta: true },
      { k: 'aiUsage', label: 'How you use AI/ML, and why it is necessary', ta: true, hint: 'Models (API, fine-tuned, your own), what AI does that normal software cannot.' },
      { k: 'dataMoat', label: 'Data & defensibility', ta: true, hint: 'Optional: what data you own or collect, integrations, regulation, partnerships.' },
      { k: 'traction', label: 'Traction', ta: true, hint: 'Optional: users, pilots, revenue, retention, LOIs. Real numbers only.' },
      { k: 'businessModel', label: 'Business model', hint: 'Optional: how you charge, and rough cost to serve incl. AI costs.' },
    ],
  },
  {
    title: 'Your market',
    intro: 'The research agent searches the web live for competitors, big-platform moves and trends.',
    fields: [
      { k: 'geography', label: 'Main market', options: ['India', 'India + global', 'South-East Asia', 'Middle East', 'US', 'Europe', 'Global'] },
      { k: 'knownCompetitors', label: 'Competitors you know about', hint: 'Optional, comma-separated. The agent will look for more.' },
      { k: 'fundingGoal', label: 'Funding status / goal', hint: 'Optional', ph: 'e.g. Bootstrapped; raising pre-seed' },
      { k: 'email', label: 'Email', hint: 'Optional: to get your report updates and expert-review offers from Foundica.', ph: 'you@startup.com' },
    ],
  },
];

const EMPTY: Intake = {
  founderName: '', role: '', yearsInIndustry: '', experience: '', priorStartups: '', buyerAccess: '', network: '', commitment: '', technical: '', audience: '', insight: '',
  startupName: '', website: '', sector: '', stage: '', problem: '', customer: '', solution: '', aiUsage: '', dataMoat: '', traction: '', businessModel: '',
  geography: 'India', knownCompetitors: '', fundingGoal: '', email: '', consent: false, accessCode: '',
};
const DRAFT = 'foundica.draft.v1';
const REPORTS = 'foundica.reports.v1';

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
}

type StepState = { status: 'wait' | 'run' | 'done' | 'error'; note?: string };

export default function Assess({ needsCode }: { needsCode: boolean }) {
  const [view, setView] = useState<'form' | 'run' | 'report'>('form');
  const [sec, setSec] = useState(0);
  const [form, setForm] = useState<Intake>(EMPTY);
  const [missing, setMissing] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepState[]>(STEPS.map(() => ({ status: 'wait' })));
  const [queries, setQueries] = useState<string[]>([]);
  const [found, setFound] = useState<{ url: string; title: string }[]>([]);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [past, setPast] = useState<Report[]>([]);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setForm({ ...EMPTY, ...load<Partial<Intake>>(DRAFT, {}), accessCode: '' });
    setPast(load<Report[]>(REPORTS, []));
  }, []);
  useEffect(() => {
    if (view === 'form') save(DRAFT, { ...form, accessCode: '' });
  }, [form, view]);
  useEffect(() => {
    if (view !== 'run') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view]);
  useEffect(() => {
    headRef.current?.focus();
  }, [view, sec]);

  const set = (k: keyof Intake, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const reqIn = (i: number) => SECTIONS[i].fields.filter((f) => REQUIRED_FIELDS.includes(f.k)).map((f) => f.k);

  function next() {
    const miss = reqIn(sec).filter((k) => !String(form[k] || '').trim());
    setMissing(miss as string[]);
    if (miss.length) {
      document.getElementById(`f_${miss[0]}`)?.focus();
      return;
    }
    if (sec < SECTIONS.length - 1) {
      setSec(sec + 1);
      window.scrollTo(0, 0);
    } else run();
  }

  async function run() {
    setView('run');
    window.scrollTo(0, 0);
    setSteps(STEPS.map(() => ({ status: 'wait' })));
    setQueries([]);
    setFound([]);
    setError('');
    setStarted(Date.now());
    setNow(Date.now());
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const res = await fetch('/api/assess', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form), signal: ctl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'The server could not start your report.');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let got: Report | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: StreamEvent;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'step') setSteps((s) => s.map((x, i) => (i === ev.step ? { status: ev.status, note: ev.note } : x)));
          else if (ev.type === 'query') setQueries((q) => (q.includes(ev.q) ? q : [...q, ev.q]));
          else if (ev.type === 'source') setFound((f) => (f.some((x) => x.url === ev.source.url) ? f : [...f, ev.source].slice(-60)));
          else if (ev.type === 'error') throw new Error(ev.message);
          else if (ev.type === 'report') got = ev.report;
        }
      }
      if (!got) throw new Error('The connection closed before the report was ready. Please try again.');
      const list = [got, ...load<Report[]>(REPORTS, []).filter((r) => r.id !== got!.id)].slice(0, 5);
      save(REPORTS, list);
      setPast(list);
      setReport(got);
      setView('report');
      window.scrollTo(0, 0);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Something went wrong.');
      setSteps((s) => s.map((x) => (x.status === 'run' ? { ...x, status: 'error' } : x)));
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setView('form');
  }

  /* ---------- views ---------- */
  if (view === 'report' && report)
    return (
      <main className="wrap">
        <ReportView report={report} onNew={() => { setView('form'); setSec(0); window.scrollTo(0, 0); }} />
      </main>
    );

  if (view === 'run') {
    const secs = Math.max(0, Math.round((now - started) / 1000));
    return (
      <main className="wrap">
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <section className="stack" aria-live="polite">
            <h1 ref={headRef} tabIndex={-1} style={{ fontSize: 30 }}>Researching {form.startupName}</h1>
            <p className="muted" style={{ margin: 0 }}>Five agents are working. Live web research usually takes 1–3 minutes. {secs}s elapsed.</p>
            <div className="steps">
              {STEPS.map((t, i) => (
                <div className="step" key={t}>
                  <span className={`dot ${steps[i].status === 'wait' ? '' : steps[i].status}`} aria-hidden="true">{steps[i].status === 'done' ? '✓' : steps[i].status === 'error' ? '!' : ''}</span>
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>{t}</strong>
                    <span className="small muted">{steps[i].note || { wait: 'Waiting', run: 'Working…', done: 'Done', error: 'Failed' }[steps[i].status]}</span>
                  </div>
                </div>
              ))}
            </div>
            {error ? (
              <div className="stack">
                <div className="banner" role="alert">{error}</div>
                <div className="row"><button className="btn" onClick={run}>Try again</button><button className="btn ghost" onClick={() => setView('form')}>Edit answers</button></div>
              </div>
            ) : (
              <div><button className="btn ghost sm" onClick={cancel}>Cancel</button></div>
            )}
          </section>
          <section className="card stack" aria-label="Live research">
            <strong>Searching the web</strong>
            <div className="feed">
              {queries.length ? queries.map((q) => <div key={q} className="feed-item"><span aria-hidden="true">🔍</span>{q}</div>) : <span className="hint">Searches will appear here.</span>}
            </div>
            <strong>Pages found ({found.length})</strong>
            <div className="feed">
              {found.map((s) => (
                <a key={s.url} className="feed-item" href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Favicon url={s.url} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span className="hint" style={{ marginLeft: 'auto', flex: 'none' }}>{hostOf(s.url)}</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const S = SECTIONS[sec];
  return (
    <main className="wrap narrow">
      <div className="stack" style={{ gap: 20 }}>
        {sec === 0 && past.length ? (
          <div className="card stack">
            <strong>Your recent reports</strong>
            {past.map((p) => (
              <div key={p.id} className="row between">
                <span>{p.startup.name} <span className="hint">· FMF {p.fmf.score} · Durability {p.durability.score} · {new Date(p.createdAt).toLocaleDateString()}</span></span>
                <button className="btn ghost sm" onClick={() => { setReport(p); setView('report'); }}>Open</button>
              </div>
            ))}
            <span className="hint">Saved only in this browser.</span>
          </div>
        ) : null}
        <div className="progress" aria-hidden="true">{SECTIONS.map((_, i) => <span key={i} className={i <= sec ? 'on' : ''} />)}</div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="muted small">Step {sec + 1} of {SECTIONS.length}</span>
          <h1 ref={headRef} tabIndex={-1} style={{ fontSize: 30 }}>{S.title}</h1>
          <p className="muted" style={{ margin: 0 }}>{S.intro}</p>
        </div>
        <form className="card stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
          {S.fields.map((f) => {
            const req = REQUIRED_FIELDS.includes(f.k);
            const bad = missing.includes(f.k as string);
            const id = `f_${f.k}`;
            const common = { id, value: String(form[f.k] ?? ''), 'aria-invalid': bad || undefined, 'aria-describedby': f.hint || bad ? `${id}_h` : undefined } as const;
            return (
              <div key={f.k} className="field">
                <label htmlFor={id}>{f.label}{req ? <span className="req"> *</span> : null}</label>
                {f.options ? (
                  <select {...common} onChange={(e) => set(f.k, e.target.value)}>{f.options.map((o) => <option key={o} value={o}>{o || 'Choose…'}</option>)}</select>
                ) : f.ta ? (
                  <textarea {...common} placeholder={f.ph} maxLength={2000} onChange={(e) => set(f.k, e.target.value)} />
                ) : (
                  <input {...common} placeholder={f.ph} maxLength={f.k === 'website' ? 200 : 600} type={f.k === 'email' ? 'email' : f.k === 'website' ? 'url' : 'text'} onChange={(e) => set(f.k, e.target.value)} />
                )}
                {f.hint || bad ? <span id={`${id}_h`} className="hint" style={bad ? { color: 'var(--bad)' } : undefined}>{bad ? 'This is required. ' : ''}{f.hint}</span> : null}
              </div>
            );
          })}
          {sec === SECTIONS.length - 1 ? (
            <>
              {form.email ? (
                <label className="check"><input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />I agree that Foundica may email me about my report and expert reviews. I can unsubscribe any time.</label>
              ) : null}
              {needsCode ? (
                <div className="field"><label htmlFor="f_code">Access code<span className="req"> *</span></label><input id="f_code" value={form.accessCode} onChange={(e) => set('accessCode', e.target.value)} /><span className="hint">Foundica is in private beta. Enter the code you were given.</span></div>
              ) : null}
              <p className="hint" style={{ margin: 0 }}>Your answers are sent to the AI agents to create your report. They are not shown to anyone else.</p>
            </>
          ) : null}
          {missing.length ? <div className="banner" role="alert">Please fill in the required fields marked *.</div> : null}
          <div className="row">
            {sec > 0 ? <button type="button" className="btn ghost" onClick={() => { setSec(sec - 1); setMissing([]); }}>Back</button> : null}
            <button type="submit" className="btn">{sec < SECTIONS.length - 1 ? 'Continue' : 'Generate my free report'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}

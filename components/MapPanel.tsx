'use client';
import { useState } from 'react';
import type { Intake } from '@/lib/types';
import { gate3, type AStatus, type Interview, type ProblemMap } from '@/lib/journey';
import { Cites, hostOf } from './Cite';
import { MicButton, useDictation } from './Voice';

const STATUS: Record<AStatus, { label: string; cls: string }> = {
  unknown: { label: 'Not tested', cls: 'grey' },
  validated: { label: 'Validated', cls: 'ok' },
  killed: { label: 'Killed', cls: 'bad' },
};

export function Stages({ at }: { at: number }) {
  const names = ['Fundamentals', 'Problem map', 'Customer loop', 'First pilot', 'Capital & team'];
  return (
    <ol className="stages" aria-label="Your founder journey">
      {names.map((n, i) => (
        <li key={n} className={i + 1 < at ? 'done' : i + 1 === at ? 'now' : ''} aria-current={i + 1 === at ? 'step' : undefined}>
          <span className="num">{i + 1 < at ? '✓' : i + 1}</span>
          <span>{n}</span>
        </li>
      ))}
    </ol>
  );
}

export type MapForm = Pick<Intake, 'startupName' | 'sector' | 'problem' | 'solution' | 'customer' | 'traction'>;

/** Stage 2 start: a short form, prefilled from the founder's report answers. */
export function MapStart({ initial, priceLabel, onSubmit, busy }: { initial: Partial<Intake>; priceLabel: string; onSubmit: (f: MapForm) => void; busy: boolean }) {
  const [f, setF] = useState<MapForm>({ startupName: initial.startupName || '', sector: initial.sector || '', problem: initial.problem || '', solution: initial.solution || '', customer: initial.customer || '', traction: initial.traction || '' });
  const [err, setErr] = useState('');
  const fields: { k: keyof MapForm; label: string; ta?: boolean; req?: boolean; hint?: string }[] = [
    { k: 'startupName', label: 'Startup name', req: true },
    { k: 'sector', label: 'Sector', req: true },
    { k: 'customer', label: 'Who exactly is your customer?', req: true, hint: 'Be narrow: role + type of organisation + size. e.g. "ER nursing heads at private hospitals with 200+ beds in Telangana".' },
    { k: 'problem', label: 'Problem you think they have', ta: true, req: true },
    { k: 'solution', label: 'Your solution', ta: true, req: true },
    { k: 'traction', label: 'What you have learned from customers so far', ta: true, hint: 'Optional. Real conversations, pilots, numbers.' },
  ];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Stages at={2} />
      <div className="stack" style={{ gap: 6 }}>
        <span className="muted small">Stage 2 · Problem map</span>
        <h1 style={{ fontSize: 28 }}>Get the full picture of your customer&apos;s problem</h1>
        <p className="muted" style={{ margin: 0 }}>Understand your customer&apos;s business well enough to run it. Agents map their workflow, who pays, what the problem costs, the 6 riskiest assumptions and where to find these buyers, with sources. Then every customer conversation you log updates the map.</p>
      </div>
      <form
        className="card stack"
        style={{ gap: 16 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const need = (['startupName', 'sector', 'customer', 'problem', 'solution'] as const).filter((k) => !f[k].trim());
          if (need.length) {
            setErr('Please fill in all fields marked *.');
            document.getElementById(`j_${need[0]}`)?.focus();
            return;
          }
          setErr('');
          onSubmit(f);
        }}
      >
        {fields.map((x) => (
          <div className="field" key={x.k}>
            <label htmlFor={`j_${x.k}`}>{x.label}{x.req ? <span className="req"> *</span> : null}</label>
            {x.ta ? (
              <textarea id={`j_${x.k}`} value={f[x.k]} maxLength={2000} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} aria-describedby={x.hint ? `j_${x.k}_h` : undefined} />
            ) : (
              <input id={`j_${x.k}`} value={f[x.k]} maxLength={400} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} aria-describedby={x.hint ? `j_${x.k}_h` : undefined} />
            )}
            {x.hint ? <span id={`j_${x.k}_h`} className="hint">{x.hint}</span> : null}
          </div>
        ))}
        {err ? <div className="banner" role="alert">{err}</div> : null}
        <div className="row"><button type="submit" className="btn" disabled={busy}>{priceLabel}</button><span className="hint">Logging interviews afterwards is free.</span></div>
      </form>
    </div>
  );
}

/* ---------- the problem map + customer loop ---------- */
export function MapView({ map: m, onChange, onNeedLogin }: { map: ProblemMap; onChange: (m: ProblemMap) => void; onNeedLogin: () => void }) {
  const S = m.research.sources;
  const g = gate3(m);
  const today = new Date().toISOString().slice(0, 10);
  const [iv, setIv] = useState<Omit<Interview, 'id'>>({ date: today, who: '', role: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const contact = process.env.NEXT_PUBLIC_FOUNDICA_CONTACT_EMAIL;
  const dict = useDictation((t) => setIv((x) => ({ ...x, notes: t })));

  async function learn(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (iv.notes.trim().length < 20) {
      setErr('Write at least a few sentences: what they did, said, and what it cost them.');
      document.getElementById('iv_notes')?.focus();
      return;
    }
    if (dict.listening) dict.stop();
    setBusy(true);
    try {
      const before = m.evidence;
      const r = await fetch('/api/map/learn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mapId: m.id, interview: { ...iv, id: Math.random().toString(36).slice(2, 9) } }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        onNeedLogin();
        throw new Error('Please sign in again.');
      }
      if (!r.ok) throw new Error(j.error || 'Could not update your map.');
      onChange(j.map);
      setIv({ date: today, who: '', role: '', notes: '' });
      setMsg(`Map updated. Evidence ${before} → ${j.map.evidence}. Check the assumptions and the next questions.`);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mapview">
      <section className="stack" style={{ gap: 20 }}>
        <Stages at={m.interviews.length ? 3 : 2} />
        {m.mock ? <div className="banner">Demo mode: this map uses sample data, not real research.</div> : null}
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="muted small">Problem map · {new Date(m.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <h1 style={{ fontSize: 30 }}>{m.startup.name}</h1>
            <span className="muted">Customer: {m.startup.customer}</span>
          </div>
          <div className="row">
            <button className="btn" onClick={() => document.getElementById('loop')?.scrollIntoView({ behavior: 'smooth' })}>Log an interview</button>
          </div>
        </div>

        <div className="grid g4">
          <div className="card stack" style={{ gap: 6 }}>
            <span className="muted small">Evidence score</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big">{m.evidence}</span><span className="muted">/ 100</span></div>
            <div className="bar" role="img" aria-label={`Evidence ${m.evidence} of 100`}><div className={m.evidence < 50 ? "low" : ""} style={{ width: `${m.evidence}%` }} /></div>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="muted small">Interviews logged</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big">{m.interviews.length}</span><span className="muted">/ 10</span></div>
            <span className="hint">Gate 3 needs 10.</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="muted small">Risky assumptions</span>
            <span className="small"><span className="pill ok">{m.assumptions.filter((a) => a.status === 'validated').length} validated</span> <span className="pill bad">{m.assumptions.filter((a) => a.status === 'killed').length} killed</span> <span className="pill grey">{m.assumptions.filter((a) => a.status === 'unknown').length} open</span></span>
          </div>
          <div className={`card stack ${g.open ? '' : 'locked'}`} style={{ gap: 6 }}>
            <span className="muted small">Gate 3 → First pilot</span>
            {g.open ? (
              <>
                <strong>Open: you have the evidence</strong>
                {contact ? <a className="btn sm" href={`mailto:${contact}?subject=${encodeURIComponent('Stage 4 expert review: ' + m.startup.name)}`}>Book an expert review</a> : <span className="hint">Stage 4 opens soon.</span>}
              </>
            ) : (
              <span className="hint">Needs 10 interviews, evidence 60+, and 2 high-risk assumptions validated. Now: {g.interviews} interview{g.interviews === 1 ? "" : "s"}, evidence {g.evidence}, {g.highValid} validated.</span>
            )}
          </div>
        </div>

        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>The problem, in short</h2>
              <p style={{ margin: 0 }}>{m.summary}</p>
              {m.layers.length ? (
                <ol className="layers">{m.layers.map((l, i) => <li key={i}>{l}</li>)}</ol>
              ) : null}
            </div>
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>How your customer works today</h2>
              <div className="tablebox">
                <table>
                  <thead><tr><th>Step</th><th>What goes wrong</th></tr></thead>
                  <tbody>{m.workflow.map((w, i) => <tr key={i}><td>{w.step}</td><td>{w.pain}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="small"><strong>Workaround today:</strong> {m.workaround}</div>
              <div className="small"><strong>Cost of the problem:</strong> {m.costOfProblem}</div>
            </div>
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Who pays</h2>
              <div className="grid g2" style={{ gap: 10 }}>
                {[['Uses it', m.whoPays.user], ['Buys it', m.whoPays.buyer], ['Owns the budget', m.whoPays.budgetOwner], ['Budget today', m.whoPays.budget]].map(([a, b]) => (
                  <div key={a} className="stack" style={{ gap: 2 }}><span className="muted small">{a}</span><span>{b || '—'}</span></div>
                ))}
              </div>
            </div>
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Where to find these buyers</h2>
              {m.whereBuyers.length ? m.whereBuyers.map((b, i) => (
                <div key={i} className="small"><strong>{b.segment}:</strong> {b.where} {b.sourceIds.length ? <Cites ids={b.sourceIds} sources={S} /> : <span className="pill grey">unverified</span>}</div>
              )) : <span className="muted">No named places were found in the research.</span>}
              {S.length ? <details><summary className="small">Sources ({S.length})</summary><ol className="small">{S.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> <span className="hint">{hostOf(s.url)}</span></li>)}</ol></details> : null}
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Assumptions to test</h2>
              <span className="hint">Your startup depends on these. Interviews move them from &quot;Not tested&quot; to validated or killed. A killed assumption is progress.</span>
              {m.assumptions.map((a) => (
                <div key={a.id} className="assume">
                  <div className="row between" style={{ gap: 8 }}>
                    <span>{a.text}</span>
                    <span className="row" style={{ gap: 6 }}><span className={`pill ${a.risk === 'high' ? 'bad' : a.risk === 'medium' ? 'warn' : 'grey'}`}>{a.risk} risk</span><span className={`pill ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span></span>
                  </div>
                  {a.evidence ? <span className="hint">Evidence: {a.evidence}</span> : null}
                </div>
              ))}
            </div>
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>{m.nextQuestions.length ? 'Ask in your next interview' : 'Interview script'}</h2>
              <span className="hint">Ask about what they did, not what they would do. Never pitch in the first 20 minutes.</span>
              <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">{(m.nextQuestions.length ? m.nextQuestions : m.script).map((q, i) => <li key={i}>{q}</li>)}</ol>
              {m.nextQuestions.length ? <details><summary className="small">Full starting script</summary><ol className="small">{m.script.map((q, i) => <li key={i}>{q}</li>)}</ol></details> : null}
            </div>
          </div>
        </div>

        <div className="grid g2" style={{ alignItems: 'start', scrollMarginTop: 16 }} id="loop">
          <form className="card stack" onSubmit={learn} noValidate>
            <h2 style={{ fontSize: 19 }}>Log a customer interview</h2>
            <span className="hint">The customer-loop agent reads your notes, updates the assumptions and evidence score, and writes your next questions.</span>
            <div className="grid g3" style={{ gap: 10 }}>
              <div className="field"><label htmlFor="iv_who">Who</label><input id="iv_who" value={iv.who} maxLength={120} placeholder="Name or initials" onChange={(e) => setIv({ ...iv, who: e.target.value })} /></div>
              <div className="field"><label htmlFor="iv_role">Role & organisation</label><input id="iv_role" value={iv.role} maxLength={120} onChange={(e) => setIv({ ...iv, role: e.target.value })} /></div>
              <div className="field"><label htmlFor="iv_date">Date</label><input id="iv_date" type="date" value={iv.date} onChange={(e) => setIv({ ...iv, date: e.target.value })} /></div>
            </div>
            <div className="field">
              <span className="row between"><label htmlFor="iv_notes">Notes<span className="req"> *</span></label><span className="row small muted" style={{ gap: 6 }}>{dict.supported ? (dict.listening ? 'Listening…' : 'Dictate') : null}<MicButton d={dict} value={iv.notes} size={34} /></span></span>
              <textarea id="iv_notes" value={iv.notes} maxLength={6000} style={{ minHeight: 160 }} onChange={(e) => setIv({ ...iv, notes: e.target.value })} aria-describedby="iv_notes_h" />
              {dict.error ? <span className="hint" role="alert" style={{ color: 'var(--bad)' }}>{dict.error}</span> : null}
              <span id="iv_notes_h" className="hint">What they do today, the last time the problem happened, what it cost, what they tried, who decides. Quotes are best.</span>
            </div>
            {err ? <div className="banner" role="alert">{err}</div> : null}
            {msg ? <div className="banner info" role="status">{msg}</div> : null}
            <div><button className="btn" type="submit" disabled={busy}>{busy ? 'Updating your map…' : 'Update my problem map'}</button></div>
          </form>
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>What you have learned</h2>
            {m.learnings.length ? <ul style={{ margin: 0, paddingLeft: 18 }} className="stack">{m.learnings.slice().reverse().map((l, i) => <li key={i}>{l}</li>)}</ul> : <span className="muted">Nothing yet. Log your first interview.</span>}
            <strong>Interview log ({m.interviews.length})</strong>
            {m.interviews.slice().reverse().map((x) => (
              <details key={x.id}><summary className="small">{x.date} · {x.who || 'Anonymous'}{x.role ? ` · ${x.role}` : ''}</summary><p className="small" style={{ whiteSpace: 'pre-wrap' }}>{x.notes}</p></details>
            ))}
            <span className="hint">Saved to your account.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

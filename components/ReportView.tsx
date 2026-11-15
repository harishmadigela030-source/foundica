'use client';
import { useState } from 'react';
import type { Report } from '@/lib/types';
import { Brief, Cites, Favicon, hostOf } from './Cite';

const tone = (n: number, max = 10) => (n / max >= 0.7 ? 'ok' : n / max >= 0.4 ? 'warn' : 'bad');
const threatTone = (t: string) => (t === 'high' ? 'bad' : t === 'medium' ? 'warn' : 'ok');
const CONTACT = process.env.NEXT_PUBLIC_FOUNDICA_CONTACT_EMAIL || '';
const TYPE: Record<string, string> = { direct: 'Direct', indirect: 'Indirect', big_platform: 'Big platform / AI lab' };

function Bar({ v, max = 10, label }: { v: number; max?: number; label: string }) {
  return (
    <div className="bar" role="img" aria-label={`${label}: ${v} out of ${max}`}>
      <div className={v / max < 0.5 ? 'low' : ''} style={{ width: `${(v / max) * 100}%` }} />
    </div>
  );
}

function Locked({ what, onUpgrade, price }: { what: string; onUpgrade?: () => void; price?: string }) {
  return (
    <div className="card stack locked">
      <strong>🔒 {what} is in the Full Report</strong>
      <span className="muted small">The Full Report runs live web research, maps your real competitors with clickable sources, and has every claim checked against them.</span>
      {onUpgrade ? <div><button className="btn sm" onClick={onUpgrade}>Get the Full Report{price ? ` · ${price}` : ''}</button></div> : null}
    </div>
  );
}

export default function ReportView({ report: r, onNew, onUpgrade, price, onMap }: { report: Report; onNew?: () => void; onUpgrade?: () => void; price?: string; onMap?: () => void }) {
  const quick = r.tier === 'quick';
  const [tab, setTab] = useState<'overview' | 'fmf' | 'durability' | 'competitors' | 'sources'>('overview');
  const [dl, setDl] = useState<'idle' | 'busy' | 'error'>('idle');
  const S = r.research.sources;

  async function download() {
    setDl('busy');
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foundica-report-${(r.startup.name || 'startup').replace(/[^a-z0-9]+/gi, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDl('idle');
    } catch {
      setDl('error');
    }
  }

  const tabs = [
    ['overview', 'Overview'],
    ['fmf', 'Founder-Market Fit'],
    ['durability', 'AI-Durability'],
    ['competitors', quick ? 'Competitors 🔒' : `Competitors (${r.competition.competitors.length})`],
    ['sources', quick ? 'Sources 🔒' : `Sources (${S.length})`],
  ] as const;

  return (
    <section className="stack" style={{ gap: 20 }}>
      {quick ? (
        <div className="banner info row between" style={{ gap: 12 }}>
          <span><strong>Free Quick Score.</strong> Founder-Market Fit and AI-durability from your answers only. Live competitor research and sources are in the Full Report.</span>
          {onUpgrade ? <button className="btn sm" onClick={onUpgrade}>Upgrade{price ? ` · ${price}` : ''}</button> : null}
        </div>
      ) : null}
      {r.mock ? <div className="banner">Demo mode: this report uses sample data and example.com sources, not real research.</div> : null}
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <span className="muted small">Foundica {quick ? 'Quick Score' : 'Founder Report'} · {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <h1 style={{ fontSize: 34 }}>{r.startup.name}</h1>
          <span className="muted">{[r.startup.sector, r.startup.stage, r.startup.geography].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="row">
          <button className="btn" onClick={download} disabled={dl === 'busy'}>{dl === 'busy' ? 'Preparing PDF…' : 'Download PDF'}</button>
          {onNew ? <button className="btn ghost" onClick={onNew}>New report</button> : null}
        </div>
      </div>
      {dl === 'error' ? <div className="banner" role="alert">The PDF could not be created. Please try again.</div> : null}

      <div className="grid g4">
        <div className="card stack" style={{ gap: 6 }}>
          <span className="muted small">Founder-Market Fit</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big">{r.fmf.score}</span><span className="muted">/ 100</span></div>
          <Bar v={r.fmf.score} max={100} label="Founder-Market Fit" />
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="muted small">AI-Durability</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big">{r.durability.score}</span><span className="muted">/ 100</span></div>
          <Bar v={r.durability.score} max={100} label="AI-Durability" />
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="muted small">Market half-life</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big" style={{ fontSize: 40 }}>{r.durability.halfLife.low}–{r.durability.halfLife.high}</span><span className="muted">years</span></div>
          <span className="hint">Until it is likely copied or commoditised, as positioned today.</span>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="muted small">Competition intensity</span>
          {quick ? (
            <><div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big" aria-hidden="true">🔒</span></div><span className="hint">Needs live research (Full Report).</span></>
          ) : (
            <><div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="big">{r.competition.intensity}</span><span className="muted">/ 10</span></div>
            <span className="hint">{r.competition.competitors.length} competitors found · {S.length} sources</span></>
          )}
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Report sections">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-controls={`panel-${k}`} aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && (
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <div className="stack">
              <div className="card stack">
                <h2 style={{ fontSize: 19 }}>Verdict</h2>
                <p style={{ margin: 0 }}>{r.durability.verdict}</p>
                <p style={{ margin: 0 }}>{r.fmf.summary}</p>
                <div className="banner info">Biggest threat: {r.durability.biggestThreat}</div>
              </div>
              <div className="card stack" style={{ borderColor: 'var(--blue)' }}>
                <span className="muted small">Next: Stage 2</span>
                <strong>Get the full picture of your customer&apos;s problem</strong>
                <span className="small muted">Map how your customer works, who pays, your riskiest assumptions and where to find buyers. Then log interviews and watch the map learn.</span>
                <div>{onMap ? <button className="btn sm" onClick={onMap}>Map my customer&apos;s problem</button> : <a className="btn sm" href="/app?new=map">Map my customer&apos;s problem</a>}</div>
              </div>
              <div className="card stack">
                <h2 style={{ fontSize: 19 }}>Your next steps</h2>
                <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">{r.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </div>
              <div className="card stack">
                <div className="row between"><h2 style={{ fontSize: 19 }}>How sure is this?</h2><span className={`pill ${tone(r.critic.confidence, 100)}`}>{r.critic.confidence}% confidence</span></div>
                <span className="hint">An independent critic agent checked every score and claim.</span>
                {r.critic.warnings.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{r.critic.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
                {r.critic.unsupported.length ? <div className="small"><strong>Not backed by evidence yet:</strong> {r.critic.unsupported.join(' · ')}</div> : null}
              </div>
            </div>
            {quick ? <Locked what="Live market research" onUpgrade={onUpgrade} price={price} /> : <div className="card stack">
              <div className="row between"><h2 style={{ fontSize: 19 }}>Market research</h2><span className="hint">{r.research.queries.length} live searches</span></div>
              {r.research.segments.length ? <Brief segments={r.research.segments} sources={S} /> : <span className="muted">No research text was returned.</span>}
              {r.competition.facts.length ? (
                <div className="stack" style={{ gap: 6 }}>
                  <strong>Key market facts</strong>
                  {r.competition.facts.map((f, i) => <div key={i} className="small">• {f.claim} <Cites ids={f.sourceIds} sources={S} /></div>)}
                </div>
              ) : null}
            </div>}
          </div>
        )}

        {tab === 'fmf' && (
          <div className="stack">
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Are you the right founder for this market?</h2>
              <p style={{ margin: 0 }}>{r.fmf.summary}</p>
              <span className="hint">Weights reflect the AI era: insight and buyer access matter more than coding, because building is getting cheap.</span>
            </div>
            <div className="grid g2">
              {r.fmf.signals.map((s) => (
                <div key={s.key} className="card stack" style={{ gap: 8 }}>
                  <div className="row between"><strong>{s.name}</strong><span className={`pill ${tone(s.score)}`}>{s.score}/10 · weight {Math.round(s.weight * 100)}%</span></div>
                  <Bar v={s.score} label={s.name} />
                  <div className="small"><strong>Evidence:</strong> {s.evidence}</div>
                  {s.improve ? <div className="small"><strong>Improve in 30 days:</strong> {s.improve}</div> : null}
                  {s.adjusted ? <div className="small muted"><strong>Critic adjusted:</strong> {s.adjusted}</div> : null}
                </div>
              ))}
            </div>
            {r.fmf.redFlags.length ? <div className="banner"><strong>Red flags:</strong> {r.fmf.redFlags.join(' · ')}</div> : null}
          </div>
        )}

        {tab === 'durability' && (
          <div className="stack">
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Will this last 5–10 years of AI progress?</h2>
              <p style={{ margin: 0 }}>{r.durability.verdict}</p>
              <strong>Outlook by year</strong>
              <div className="timeline">
                {r.durability.timeline.map((y) => (
                  <div key={y.year} className={`tl ${y.risk}`}>
                    <div className="row between"><strong>{y.year}</strong><span className={`pill ${threatTone(y.risk)}`}>{y.risk} risk</span></div>
                    <span className="small">{y.outlook}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid g2">
              {r.durability.tests.map((t) => (
                <div key={t.key} className="card stack" style={{ gap: 8 }}>
                  <div className="row between"><strong>{t.name}</strong><span className={`pill ${tone(t.score)}`}>{t.score}/10</span></div>
                  <Bar v={t.score} label={t.name} />
                  <div className="small">{t.finding} <Cites ids={t.sourceIds} sources={S} /></div>
                  {t.adjusted ? <div className="small muted"><strong>Critic adjusted:</strong> {t.adjusted}</div> : null}
                </div>
              ))}
            </div>
            <div className="card stack">
              <h2 style={{ fontSize: 19 }}>Moves that extend your half-life</h2>
              {r.durability.moves.map((m, i) => (
                <div key={i} className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                  <span>{i + 1}. {m.move}</span>
                  {m.impact ? <span className="pill ok">{m.impact}</span> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {quick && tab === 'competitors' && <Locked what="Your competitor map" onUpgrade={onUpgrade} price={price} />}
        {quick && tab === 'sources' && <Locked what="Cited sources" onUpgrade={onUpgrade} price={price} />}
        {!quick && tab === 'competitors' && (
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>Competitor map</h2>
            <span className="hint">Only companies found in the live research are listed. Click a number to open its source.</span>
            {r.competition.competitors.length ? (
              <div className="tablebox">
                <table>
                  <thead><tr><th scope="col">Company</th><th scope="col">Type</th><th scope="col">What they do</th><th scope="col">Scale</th><th scope="col">Threat</th><th scope="col">Sources</th></tr></thead>
                  <tbody>
                    {r.competition.competitors.map((c, i) => (
                      <tr key={i}>
                        <td><strong>{c.name}</strong></td>
                        <td>{TYPE[c.type]}</td>
                        <td>{c.what}</td>
                        <td>{c.scale}</td>
                        <td><span className={`pill ${threatTone(c.threat)}`}>{c.threat}</span></td>
                        <td>{c.sourceIds.length ? <Cites ids={c.sourceIds} sources={S} /> : <span className="pill grey">unverified</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <span className="muted">No competitors were found in the research.</span>}
          </div>
        )}

        {!quick && tab === 'sources' && (
          <div className="stack">
            <div className="grid g2">
              {S.map((s) => (
                <a key={s.id} className="src" href={s.url} target="_blank" rel="noopener noreferrer">
                  <span className="src-n">{s.id}</span>
                  <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="row" style={{ gap: 6 }}><Favicon url={s.url} /><span className="small muted">{hostOf(s.url)}{s.pageAge ? ` · ${s.pageAge}` : ''}</span></span>
                    <strong style={{ fontSize: 14 }}>{s.title}</strong>
                    {s.citedText ? <span className="small muted">“{s.citedText}”</span> : null}
                  </span>
                </a>
              ))}
            </div>
            {!S.length ? <span className="muted">No sources were cited.</span> : null}
            {r.research.queries.length ? <div className="hint"><strong>Searches run:</strong> {r.research.queries.join(' · ')}</div> : null}
          </div>
        )}
      </div>

      {CONTACT ? (
        <div className="card row between" style={{ background: 'var(--ink)', color: '#fff', border: 0 }}>
          <div className="stack" style={{ gap: 4 }}>
            <strong style={{ fontSize: 18 }}>Want a human to check this?</strong>
            <span style={{ color: '#c3cad8' }}>Foundica experts who have built in your sector can review your report and help you raise your scores. Email {CONTACT}.</span>
          </div>
          <a className="btn ghost" href={`mailto:${CONTACT}?subject=${encodeURIComponent('Foundica expert review: ' + r.startup.name)}`}>Request an expert review</a>
        </div>
      ) : null}
    </section>
  );
}

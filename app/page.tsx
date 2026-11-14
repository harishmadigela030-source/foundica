import Link from 'next/link';

const scores = [
  { k: 'Founder', t: 'Founder-Market Fit', d: 'Are you the right person to win this market? Scored on insight, buyer access and credibility, the signals that matter when AI makes building cheap.' },
  { k: 'Future', t: 'AI-Durability', d: 'Will your product survive 5–10 years of AI progress? Eight tests, a market "half-life" in years, and the moves that extend it.' },
  { k: 'Field', t: 'Cited competitor map', d: 'Live web research on competitors, big platforms and market trends. Every claim links to its source, so you can check it.' },
];

const steps = [
  ['Answer 3 short sections', 'About you, your startup and your market. About 8 minutes.'],
  ['Watch the agents work', 'See every web search and every source as it is found.'],
  ['Get your report', 'Scores, competitors, a year-by-year outlook and next steps, with numbered citations.'],
  ['Download it free', 'A PDF with all sources, ready to share with co-founders or investors.'],
];

export default function Home() {
  return (
    <main>
      <section className="wrap hero">
        <div className="grid g2" style={{ alignItems: 'center', gap: 40 }}>
          <div className="stack" style={{ gap: 18 }}>
            <span className="pill" style={{ alignSelf: 'flex-start' }}>FOUNDICA · FOR AI/ML &amp; DEEPTECH FOUNDERS</span>
            <h1>The science of founders.</h1>
            <p style={{ fontSize: 22, margin: 0, fontWeight: 500 }}>They teach you the math. We show you the real founder path.</p>
            <p className="muted" style={{ fontSize: 17, margin: 0 }}>
              Everyone can build now. What decides who wins is founder-market fit, a product that survives the next wave of AI, and the market around you.
              Get all three, researched live with cited sources, in one free report.
            </p>
            <div className="row">
              <Link href="/assess" className="btn">Get your free report</Link>
              <Link href="#how" className="btn ghost">How it works</Link>
            </div>
            <span className="hint">Free · No sign-up · Download as PDF</span>
          </div>
          <div className="card stack" aria-label="What the report contains">
            <span className="muted small">Your report</span>
            {[['Founder-Market Fit', '0–100'], ['AI-Durability', '0–100'], ['Market half-life', 'years'], ['Competition intensity', '0–10']].map(([a, b]) => (
              <div key={a} className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <strong>{a}</strong>
                <span className="pill grey">{b}</span>
              </div>
            ))}
            <p className="small muted" style={{ margin: 0 }}>Plus a cited competitor map, a year-by-year outlook and your next steps.</p>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--ink)', color: '#fff' }}>
        <div className="wrap grid g3" style={{ paddingTop: 56, paddingBottom: 56 }}>
          {scores.map((s) => (
            <div key={s.t} className="stack" style={{ gap: 8 }}>
              <span className="small" style={{ color: '#9fb4f5', fontWeight: 600, letterSpacing: '0.06em' }}>{s.k.toUpperCase()}</span>
              <h2 style={{ fontSize: 22 }}>{s.t}</h2>
              <p style={{ margin: 0, color: '#c3cad8' }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="wrap stack" style={{ gap: 24 }}>
        <h2 style={{ fontSize: 34 }}>How it works</h2>
        <div className="grid g4">
          {steps.map(([t, d], i) => (
            <div key={t} className="card stack" style={{ gap: 8 }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--blue)' }}>{String(i + 1).padStart(2, '0')}</span>
              <strong style={{ fontSize: 17 }}>{t}</strong>
              <span className="muted">{d}</span>
            </div>
          ))}
        </div>
        <div className="card row between" style={{ background: 'var(--blue)', color: '#fff', border: 0 }}>
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 26 }}>Math is theory. This is what works.</h2>
            <span style={{ color: '#e6ecfc' }}>Foundica is the science of founders. Start with the free report, then get verified by experts and introduced to investors.</span>
          </div>
          <Link href="/assess" className="btn ghost">Start now</Link>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { prices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pricing – Foundica' };

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export default function Pricing() {
  const p = prices();
  const included = [
    'Founder-Market Fit score across 7 signals, with reasons',
    'AI-durability score (8 tests), market half-life and year-by-year outlook',
    'Live web research: competitors, big platforms and market facts',
    'Every market claim linked to its source',
    'Critic agent checks every score and claim',
    'PDF download, and the report saved to your account',
  ];
  return (
    <main className="wrap">
      <div className="stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="pill" style={{ alignSelf: 'flex-start' }}>PILOT PRICING</span>
          <h1 style={{ fontSize: 36 }}>The price of a coffee for a researched answer</h1>
          <p className="muted" style={{ margin: 0, fontSize: 17 }}>One-time payments. No subscription. A credit runs one Founder Report or one Problem Map.</p>
        </div>
        <div className="plans" style={{ maxWidth: 760 }}>
          <div className="plan" style={{ cursor: 'default', borderColor: 'var(--blue)' }}>
            <span className="tag">Pilot</span>
            <strong>1 credit</strong><span className="price">{inr(p.single)}</span>
            <span className="muted small">≈ ${p.singleUsd} outside India, charged in your local currency.</span>
            <Link href="/app" className="btn sm" style={{ marginTop: 'auto' }}>Start a report</Link>
          </div>
          <div className="plan" style={{ cursor: 'default' }}>
            <strong>{p.packCredits} credits</strong><span className="price">{inr(p.pack)}</span>
            <span className="muted small">{inr(Math.round(p.pack / p.packCredits))} each (≈ ${p.packUsd} total). Re-run after a pivot, or map your customer&apos;s problem. Credits never expire.</span>
            <Link href="/app" className="btn ghost sm" style={{ marginTop: 'auto' }}>Start with 3</Link>
          </div>
        </div>
        <div className="grid g2">
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>Every Founder Report includes</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }} className="stack">{included.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>Problem Map and customer loop</h2>
            <p className="muted" style={{ margin: 0 }}>A Problem Map (1 credit) maps your customer&apos;s workflow, who pays, what the problem costs, your 6 riskiest assumptions and where to find buyers, with sources. Logging customer interviews afterwards is free: the map updates with every conversation.</p>
          </div>
        </div>
        <div className="grid g2">
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>Payments</h2>
            <p className="muted" style={{ margin: 0 }}>UPI, cards and wallets in India; international cards everywhere else. Checkout is run by Dodo Payments, our merchant of record, which also handles taxes. We never see your card details.</p>
          </div>
          <div className="card stack">
            <h2 style={{ fontSize: 19 }}>Not useful? We fix it or refund it</h2>
            <p className="muted" style={{ margin: 0 }}>If a report fails, your credit comes back automatically. If it is not useful, write to us within 7 days: we re-run it, and if it is still not useful we refund you. <Link href="/refunds">Refund policy</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}

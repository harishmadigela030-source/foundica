import Link from 'next/link';
import { BUSINESS } from '@/lib/business';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
        <header className="top">
          <div className="top-in">
            <Link href="/" className="brand" aria-label="Foundica home">
              <span className="logo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V4h12" /><path d="M6 12h8" /></svg></span>Foundica
            </Link>
            <nav aria-label="Main" className="row">
              <Link href="/#how" className="muted" style={{ textDecoration: 'none' }}>How it works</Link>
                            <Link href="/pricing" className="muted" style={{ textDecoration: 'none' }}>Pricing</Link>
              <Link href="/app" className="btn sm">Open Foundica</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="footer-in">
            <span>© {new Date().getFullYear()} {BUSINESS.legalName}</span>
            <nav aria-label="Legal" className="row" style={{ gap: '6px 16px' }}>
              {[['/about', 'About'], ['/pricing', 'Pricing'], ['/contact', 'Contact'], ['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/refunds', 'Refunds & cancellation'], ['/shipping', 'Delivery']].map(([h, l]) => (
                <Link key={h} href={h} className="muted" style={{ textDecoration: 'none' }}>{l}</Link>
              ))}
            </nav>
            <span style={{ flexBasis: '100%' }}>AI-generated reports can be wrong. Always check the sources. Not investment, legal or financial advice.</span>
          </div>
        </footer>
    </>
  );
}

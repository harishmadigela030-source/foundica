import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Foundica – The science of founders',
  description: 'Free report for AI/ML and deeptech founders: Founder-Market Fit score, how long your market position lasts against AI, and competitors with cited sources.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="top">
          <div className="top-in">
            <Link href="/" className="brand" aria-label="Foundica home">
              <span className="logo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V4h12" /><path d="M6 12h8" /></svg></span>Foundica
            </Link>
            <nav aria-label="Main" className="row">
              <Link href="/#how" className="muted" style={{ textDecoration: 'none' }}>How it works</Link>
              <Link href="/assess" className="btn sm">Get your free report</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="footer-in">
            <span>© Foundica</span>
            <span>AI-generated reports can be wrong. Always check the sources. Not investment, legal or financial advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foundica – The science of founders',
  description: 'Reports for AI/ML and deeptech founders: Founder-Market Fit score, how long your market position lasts against AI, and competitors with cited sources.',
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
        {children}
      </body>
    </html>
  );
}

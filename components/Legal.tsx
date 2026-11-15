import { BUSINESS } from '@/lib/business';

export default function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="wrap">
      <article className="prose stack" style={{ gap: 10 }}>
        <h1 style={{ fontSize: 34 }}>{title}</h1>
        <span className="hint">Last updated {BUSINESS.updated}</span>
        {children}
      </article>
    </main>
  );
}

export function ContactBlock() {
  return (
    <ul>
      <li><strong>Business:</strong> {BUSINESS.legalName}</li>
      <li><strong>Address:</strong> {BUSINESS.address}</li>
      <li><strong>Email:</strong> {BUSINESS.email.startsWith('[') ? BUSINESS.email : <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>}</li>
      <li><strong>Phone:</strong> {BUSINESS.phone}</li>
    </ul>
  );
}

import Legal, { ContactBlock } from '@/components/Legal';

export const metadata = { title: 'Shipping and delivery policy – Foundica' };

export default function Page() {
  return (
    <Legal title="Shipping and delivery policy">
      <p>Foundica sells digital reports only. Nothing is shipped physically.</p>
      <p>A report is delivered on screen in about 1–3 minutes after payment, with a PDF you can download immediately. Reports are also saved in your browser so you can reopen them.</p>
      <p>If you paid and did not receive your report, contact us with your order or payment ID and we will deliver it or refund you.</p>
      <ContactBlock />
    </Legal>
  );
}

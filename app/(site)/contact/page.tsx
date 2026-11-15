import Legal, { ContactBlock } from '@/components/Legal';

export const metadata = { title: 'Contact – Foundica' };

export default function Page() {
  return (
    <Legal title="Contact us">
      <p>Questions about a report, a payment or a refund? Write to us and we reply within 2 business days (Monday–Friday, 10:00–18:00 IST).</p>
      <ContactBlock />
      <p>For a payment question, include the email you paid with and the payment or order ID from your Razorpay receipt.</p>
    </Legal>
  );
}

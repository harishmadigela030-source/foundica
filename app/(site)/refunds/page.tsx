import Legal, { ContactBlock } from '@/components/Legal';

export const metadata = { title: 'Refund and cancellation policy – Foundica' };

export default function Page() {
  return (
    <Legal title="Refund and cancellation policy">
      <h2>If a report fails</h2>
      <p>If a Full Report cannot be generated (for example, a technical error), the credit is returned to you automatically and you can try again at no cost.</p>
      <h2>If a report is not useful</h2>
      <p>Write to us within 7 days of purchase with your order or payment ID and what was wrong. We first re-run or correct the report. If it is still not useful, we give a full refund of that purchase.</p>
      <h2>Unused credits</h2>
      <p>For a multi-report pack, you can ask within 7 days of purchase for a refund of the unused credits, at the per-report price you paid.</p>
      <h2>Cancellation</h2>
      <p>There is no subscription, so there is nothing to cancel. You can cancel a purchase before using any credit by writing to us within 7 days; we refund it in full.</p>
      <h2>Timeline</h2>
      <p>Approved refunds are made to the original payment method within 5–7 business days. Your bank may take a few more days to show it.</p>
      <h2>Contact</h2>
      <ContactBlock />
    </Legal>
  );
}

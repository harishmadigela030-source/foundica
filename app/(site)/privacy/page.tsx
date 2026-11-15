import Legal, { ContactBlock } from '@/components/Legal';
import { BUSINESS } from '@/lib/business';

export const metadata = { title: 'Privacy policy – Foundica' };

export default function Page() {
  return (
    <Legal title="Privacy policy">
      <p>This policy explains what {BUSINESS.legalName} collects on {BUSINESS.site}, why, and your choices.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your answers</strong> about you, your startup and your market, to create your report.</li>
        <li><strong>Your email</strong>, to sign you in and send your reports. <strong>Your WhatsApp number</strong> only if you add it, and messages only if you agree.</li>
        <li><strong>Payment details</strong>: payments are handled by Dodo Payments (merchant of record). We receive the payment ID and the email you used, never your card, UPI or bank details.</li>
        <li><strong>Basic technical data</strong> such as IP address, used to prevent abuse (rate limits).</li>
      </ul>
      <h2>How we use it</h2>
      <p>To generate your report, to process payments and refunds, to reply to you, and (with consent) to tell you about expert reviews and updates. We do not sell your data.</p>
      <h2>Who processes it</h2>
      <p>Your answers are sent to our AI provider (Anthropic) to create the report, and to web search during a Full Report. Payments go through Dodo Payments. Your account, reports and maps are stored with our database provider (Upstash). Sign-in emails are sent by Resend. The site is hosted on Vercel. These providers process data only to deliver the service.</p>
      <h2>Your account and saved work</h2>
      <p>You sign in with your email. Your reports, problem maps and interview notes are saved to your account so you can open them on any device. You can ask us to delete your account and everything in it at any time.</p>
      <h2>Your choices</h2>
      <p>You can ask us to see, correct or delete your data, or unsubscribe at any time, by writing to us. You can clear saved reports by clearing this site&apos;s data in your browser.</p>
      <h2>Contact</h2>
      <ContactBlock />
    </Legal>
  );
}

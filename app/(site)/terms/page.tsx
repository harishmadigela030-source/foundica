import Legal, { ContactBlock } from '@/components/Legal';
import { BUSINESS } from '@/lib/business';

export const metadata = { title: 'Terms and conditions – Foundica' };

export default function Page() {
  return (
    <Legal title="Terms and conditions">
      <p>These terms apply to your use of {BUSINESS.site} and the reports it produces, provided by {BUSINESS.legalName} (&quot;Foundica&quot;, &quot;we&quot;). By using the site you agree to them.</p>
      <h2>The service</h2>
      <p>Foundica produces AI-generated reports about a startup from the answers you give. Each report and problem map uses live web research. Reports are delivered on screen and as a PDF download as soon as they are generated.</p>
      <h2>No professional advice</h2>
      <p>Reports are produced by AI and can contain mistakes. They are for information only and are not investment, legal, tax or financial advice. Check the cited sources and use your own judgment before making decisions.</p>
      <h2>Your content</h2>
      <p>You keep all rights to what you submit. You give us permission to process it to create your report. Do not submit information you have no right to share, such as another company&apos;s confidential data.</p>
      <h2>Payments and credits</h2>
      <p>Prices are shown in Indian rupees, including taxes, before you pay. Payments are processed by Dodo Payments, which acts as the merchant of record and handles taxes. A purchase gives you report credits; one credit creates one Full Report. Credits do not expire and cannot be exchanged for cash, except as described in our refund policy.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the service: no automated scraping, no attempts to bypass payment, no unlawful content, and no use of reports to mislead investors or customers.</p>
      <h2>Liability</h2>
      <p>To the extent the law allows, our total liability for any claim related to the service is limited to the amount you paid us in the 3 months before the claim.</p>
      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. Continued use after a change means you accept it.</p>
      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts in {BUSINESS.city} have jurisdiction. Please contact us first so we can try to resolve any issue.</p>
      <h2>Contact</h2>
      <ContactBlock />
    </Legal>
  );
}

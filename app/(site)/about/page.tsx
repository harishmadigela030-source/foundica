import Legal from '@/components/Legal';
import { BUSINESS } from '@/lib/business';

export const metadata = { title: 'About – Foundica' };

export default function Page() {
  return (
    <Legal title="About Foundica">
      <p>Foundica is the science of founders. We help AI/ML and deeptech founders, aspiring founders and investors see the real founding path: whether the founder fits the market, whether the product survives the next 5–10 years of AI progress, and who else is in the market.</p>
      <p>Our AI agents research each startup live on the web and produce a report where every market claim links to its source. A separate critic agent checks every score. Founders can then be reviewed by experts and introduced to investors.</p>
      <p>{BUSINESS.legalName} is based in {BUSINESS.city}, India, and serves founders in India and around the world.</p>
    </Legal>
  );
}

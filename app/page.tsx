import AppShell from '@/components/AppShell';
import { pricingPublic } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** thefoundica.com opens straight into the Foundica workspace. The old landing page lives at /welcome. */
export default function Home() {
  return <AppShell initialPricing={pricingPublic()} needsCode={!!process.env.FOUNDICA_ACCESS_CODE} />;
}

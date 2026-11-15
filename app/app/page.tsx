import AppShell from '@/components/AppShell';
import { pricingPublic } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Foundica – your founder agents' };

export default function Page() {
  return <AppShell initialPricing={pricingPublic()} needsCode={!!process.env.FOUNDICA_ACCESS_CODE} />;
}

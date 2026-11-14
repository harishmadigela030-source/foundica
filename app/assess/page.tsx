import Assess from '@/components/Assess';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Get your free report – Foundica' };

export default function Page() {
  return <Assess needsCode={!!process.env.FOUNDICA_ACCESS_CODE} />;
}

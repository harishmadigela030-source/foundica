/** Pilot pricing. Prices shown on the site come from env; the amount charged is the Dodo product's price. */
export type Plan = 'single' | 'pack';

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : d;
};

export function prices() {
  return {
    currency: 'INR',
    single: num(process.env.FOUNDICA_PRICE_SINGLE_INR, 499),
    pack: num(process.env.FOUNDICA_PRICE_PACK_INR, 999),
    packCredits: Math.min(10, num(process.env.FOUNDICA_PACK_CREDITS, 3)),
    singleUsd: num(process.env.FOUNDICA_PRICE_SINGLE_USD, 6),
    packUsd: num(process.env.FOUNDICA_PRICE_PACK_USD, 12),
  };
}

export function planDetails(plan: Plan) {
  const p = prices();
  return plan === 'pack'
    ? { plan, credits: p.packCredits, productId: process.env.DODO_PRODUCT_PACK || '', label: `${p.packCredits} Foundica reports` }
    : { plan, credits: 1, productId: process.env.DODO_PRODUCT_SINGLE || '', label: 'Foundica report' };
}

/** Payments are on when a Dodo API key is set. Without it, reports are free (dev / private beta). */
export const paymentsEnabled = () => !!process.env.DODO_PAYMENTS_API_KEY;
export const pricingPublic = () => ({ payments: paymentsEnabled(), ...prices() });
export type PricingCfg = ReturnType<typeof pricingPublic>;

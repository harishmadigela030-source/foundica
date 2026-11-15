/**
 * Business details shown on the Contact, Terms, Privacy and Refund pages.
 * Razorpay checks these pages before activating payments, so set real values in Vercel:
 * FOUNDICA_LEGAL_NAME, FOUNDICA_ADDRESS, FOUNDICA_PHONE, NEXT_PUBLIC_FOUNDICA_CONTACT_EMAIL.
 */
export const BUSINESS = {
  brand: 'Foundica',
  legalName: process.env.FOUNDICA_LEGAL_NAME || 'Foundica',
  address: process.env.FOUNDICA_ADDRESS || '[Registered address, Hyderabad, Telangana, India]',
  phone: process.env.FOUNDICA_PHONE || '[Phone number]',
  email: process.env.NEXT_PUBLIC_FOUNDICA_CONTACT_EMAIL || '[support email]',
  site: 'thefoundica.com',
  city: 'Hyderabad, Telangana',
  updated: '15 November 2026',
};

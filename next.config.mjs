/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/assess', destination: '/app', permanent: false },
      { source: '/journey', destination: '/app?new=map', permanent: false },
    ];
  },
};
export default nextConfig;

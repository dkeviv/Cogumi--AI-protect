/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cogumi/shared', '@cogumi/db'],
  output: 'standalone',
  
  // For Docker builds: experimental feature to allow build to succeed
  // even when some pages fail static generation (auth pages with useSearchParams)
  experimental: {
    missingSuspenseWithCSRBailout: true,
  },
};

module.exports = nextConfig;

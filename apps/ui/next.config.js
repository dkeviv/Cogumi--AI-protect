/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cogumi/shared', '@cogumi/db'],
};

module.exports = nextConfig;

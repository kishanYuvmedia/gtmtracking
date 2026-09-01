/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'clickssprinter.com'],
  },
};

module.exports = nextConfig;

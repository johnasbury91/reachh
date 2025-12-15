/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['apify-client'],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'knqvuazhyjhnhjaejzhm.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Only do this if you've reviewed the errors.
    ignoreDuringBuilds: true,
  },
  output: 'standalone', // Required for Docker deployment
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`
          : 'http://localhost:3000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;

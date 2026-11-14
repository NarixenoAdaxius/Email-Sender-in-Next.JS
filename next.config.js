/** @type {import('next').NextConfig} */
const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'i.imgur.com',
  },
];

if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
    const protocol = appUrl.protocol.replace(':', '');
    if (appUrl.hostname && (protocol === 'http' || protocol === 'https')) {
      remotePatterns.push({
        protocol,
        hostname: appUrl.hostname,
        ...(appUrl.port ? { port: appUrl.port } : {}),
      });
    }
  } catch {
    // Ignore invalid NEXT_PUBLIC_APP_URL
  }
}

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // Scope no-store cache headers strictly to non-image API routes
  async headers() {
    return [
      {
        source: '/api/((?!images/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimize for Vercel deployment and SVG handling
  images: {
    remotePatterns,
  },
  // Ensure SVGs are handled properly
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack', 'url-loader'],
    });
    return config;
  },
};

module.exports = nextConfig;

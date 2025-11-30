// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const config = withBundleAnalyzer({
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Enable gzip compression
  compress: true,
  // Optimize packages
  transpilePackages: ["@supabase/ssr"],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Suppress warnings about Node.js APIs in Edge Runtime for Supabase
      config.ignoreWarnings = [
        { module: /node_modules\/@supabase\/realtime-js/ },
      ];
    }
    return config;
  },
});

module.exports = config;

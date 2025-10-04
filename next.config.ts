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
});

module.exports = config;

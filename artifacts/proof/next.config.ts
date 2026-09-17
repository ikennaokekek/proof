import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next-runtime",
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/proof-api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};
export default nextConfig;
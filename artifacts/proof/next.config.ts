import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
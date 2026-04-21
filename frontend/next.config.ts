import type { NextConfig } from "next";

const devDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  allowedDevOrigins: devDomain ? [devDomain] : [],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;

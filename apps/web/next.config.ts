import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@smol-cafe/ui", "@smol-cafe/db"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

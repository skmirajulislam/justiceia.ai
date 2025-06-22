import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'rbo6om9l82.ufs.sh'], // Add your image domains here if needed
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

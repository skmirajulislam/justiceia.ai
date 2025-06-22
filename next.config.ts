import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'], // Add your image domains here if needed
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

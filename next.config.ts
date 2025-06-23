import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'], // Add your image domains here if needed
  },
};

export default nextConfig;

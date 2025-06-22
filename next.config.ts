import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-image-domain.com'], // Add your image domains here if needed
  },
};

export default nextConfig;

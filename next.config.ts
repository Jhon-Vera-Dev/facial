import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Configuración para manejar correctamente face-api.js
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false
    };
    return config;
  }
};

export default nextConfig;

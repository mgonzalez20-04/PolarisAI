import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    // Ignorar archivos problemáticos de node-pre-gyp
    config.module.rules.push({
      test: /\.(node|html)$/,
      use: "null-loader",
    });

    return config;
  },
};

export default nextConfig;

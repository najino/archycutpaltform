import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { NextConfig } from "next";

loadDotenv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  transpilePackages: [
    "@eth/core",
    "@eth/db",
    "@eth/telegram",
    "@eth/invoice-pdf",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
  webpack: (config) => {
    // packages use NodeNext-style ".js" imports that point at ".ts" sources
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;

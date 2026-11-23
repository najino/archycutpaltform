import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { NextConfig } from "next";

loadDotenv({ path: path.resolve(__dirname, "../../.env") });

function actionOrigins(): string[] {
  const hosts = new Set(["localhost:3010", "127.0.0.1:3010"]);
  const base = process.env.WEB_BASE_URL;
  if (base) {
    try {
      hosts.add(new URL(base).host);
    } catch {
      /* ignore invalid WEB_BASE_URL */
    }
  }
  return [...hosts];
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          ...securityHeaders,
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: [
    "@eth/core",
    "@eth/db",
    "@eth/telegram",
    "@eth/invoice-pdf",
  ],
  serverExternalPackages: ["playwright", "playwright-core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: actionOrigins(),
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

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARSHYCUTPLATFORM",
    short_name: "آرشی‌کات",
    description: "پنل استودیو تدوین ویدیو آرشی‌کات",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "fa",
    dir: "rtl",
    background_color: "#100e18",
    theme_color: "#100e18",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

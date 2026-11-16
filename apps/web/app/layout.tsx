import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARSHYCUTPLATFORM",
  description: "پنل استودیو تدوین ویدیو آرشی‌کات",
  applicationName: "ARSHYCUTPLATFORM",
  appleWebApp: {
    capable: true,
    title: "آرشی‌کات",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  // سایت خودش دارک است؛ Dark Reader دوباره رنگ‌ها را خراب نکند
  other: {
    "darkreader-lock": "darkreader-lock",
    "color-scheme": "dark",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#100e18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* قبل از هر چیز: تم دارک ثابت + جلوگیری از بازنویسی Dark Reader */}
        <meta name="color-scheme" content="dark" />
        <meta name="darkreader-lock" content="darkreader-lock" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var h=document.documentElement;h.style.colorScheme='dark';h.style.backgroundColor='#100e18';if(!document.querySelector('meta[name=\"darkreader-lock\"]')){var m=document.createElement('meta');m.name='darkreader-lock';m.content='darkreader-lock';(document.head||h).prepend(m);}document.querySelectorAll('style.darkreader,link.darkreader').forEach(function(n){n.disabled=true;n.remove();});window.__ethInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ethInstallPrompt=e;window.dispatchEvent(new Event('eth-install-ready'));});}catch(e){}})();",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{background-color:#100e18!important;color:#ece8f5;color-scheme:dark;}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700&family=Vazirmatn:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        style={{ backgroundColor: "#100e18", color: "#ece8f5" }}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

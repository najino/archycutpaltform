"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "eth-pwa-install-dismissed";

function queuedPrompt() {
  return (window as Window & { __ethInstallPrompt?: BeforeInstallPromptEvent | null })
    .__ethInstallPrompt ?? null;
}

function alreadyInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function PwaRegister() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    if (alreadyInstalled() || localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let showTimer = 0;

    const reveal = (event: BeforeInstallPromptEvent | null) => {
      if (event) {
        setPromptEvent(event);
        setIosHint(false);
      } else {
        setIosHint(true);
      }
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => setVisible(true), 900);
    };

    const waiting = queuedPrompt();
    if (waiting) reveal(waiting);
    else {
      if (ios && safari) setIosHint(true);
      showTimer = window.setTimeout(() => setVisible(true), 900);
    }

    const onReady = () => {
      const event = queuedPrompt();
      if (event) reveal(event);
    };
    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("eth-install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("eth-install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const event = promptEvent || queuedPrompt();
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setPromptEvent(null);
    setVisible(false);
    if (choice.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pwa-install" role="status">
      <div className="brand-mark" aria-hidden>
        <span className="material-symbols-outlined icon-20">movie_edit</span>
      </div>
      <div className="pwa-install-copy">
        <strong>آرشی‌کات را نصب کنید</strong>
        <p>
          {iosHint
            ? "از دکمه اشتراک Safari بزنید و «افزودن به صفحهٔ اصلی» را انتخاب کنید."
            : "مثل یک اپ باز می‌شود، بدون نوار مرورگر."}
        </p>
      </div>
      {iosHint ? null : (
        <button type="button" className="pwa-install-go" onClick={install}>
          نصب
        </button>
      )}
      <button
        type="button"
        className="pwa-install-close"
        onClick={dismiss}
        aria-label="بستن"
      >
        <span className="material-symbols-outlined" aria-hidden>
          close
        </span>
      </button>
    </div>
  );
}

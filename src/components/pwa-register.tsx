"use client";

import { useEffect } from "react";

function isLocalOrPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

async function clearCurrentOriginPwaCache() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerWorker = async () => {
      try {
        const hostname = window.location.hostname;
        const shouldDisablePwaCache =
          process.env.NODE_ENV !== "production" || isLocalOrPrivateHost(hostname);

        if (shouldDisablePwaCache) {
          await clearCurrentOriginPwaCache();
          return;
        }

        await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      } catch {
        // Registration or cleanup failure must not block the SaaS app shell.
      }
    };

    registerWorker();
  }, []);

  return null;
}

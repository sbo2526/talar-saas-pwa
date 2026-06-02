"use client";

import { useEffect } from "react";

type DashboardAutomationTickProps = {
  enabled: boolean;
  tenantId?: string | null;
};

const endpoint = "/api/dashboard/notifications/tick";
const minIntervalMs = 10 * 60 * 1000;
const repeatIntervalMs = 30 * 60 * 1000;

function storageKey(tenantId: string) {
  return `talar-manager:notification-tick:${tenantId}`;
}

function shouldRunTick(tenantId: string, now: number) {
  try {
    const lastRun = Number(window.sessionStorage.getItem(storageKey(tenantId)) ?? "0");
    return !Number.isFinite(lastRun) || now - lastRun >= minIntervalMs;
  } catch {
    return true;
  }
}

function rememberTick(tenantId: string, now: number) {
  try {
    window.sessionStorage.setItem(storageKey(tenantId), String(now));
  } catch {
    // مرورگر ممکن است sessionStorage را غیرفعال کرده باشد؛ در این حالت فقط بررسی جاری انجام می‌شود.
  }
}

async function runTick(signal: AbortSignal) {
  await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
  });
}

export function DashboardAutomationTick({ enabled, tenantId }: DashboardAutomationTickProps) {
  useEffect(() => {
    if (!enabled || !tenantId) {
      return;
    }

    let active = true;
    let running = false;
    const controller = new AbortController();

    const tick = async () => {
      const now = Date.now();

      if (!active || running || !shouldRunTick(tenantId, now)) {
        return;
      }

      running = true;
      rememberTick(tenantId, now);

      try {
        await runTick(controller.signal);
      } catch {
        // بررسی خودکار نباید تجربه کاربر داشبورد را مختل کند؛ نتیجه در لاگ‌های سرور/اعلان‌ها قابل پیگیری است.
      } finally {
        running = false;
      }
    };

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, repeatIntervalMs);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [enabled, tenantId]);

  return null;
}

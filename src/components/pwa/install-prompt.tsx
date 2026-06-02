"use client";

import {
  Download,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissalKey = "talar-manager-install-prompt-dismissed-at";
const dismissalDelayMs = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const pathname = usePathname();
  const isPrintRoute = pathname?.includes("/print") ?? false;
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<
    "android" | "ios" | "windows" | "desktop"
  >("desktop");

  useEffect(() => {
    if (isPrintRoute) {
      setVisible(false);
      setInstallEvent(null);
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (isStandalone) {
      return;
    }

    const dismissedAt = Number(localStorage.getItem(dismissalKey) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < dismissalDelayMs) {
      return;
    }

    const ua = window.navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isWindows = /Windows/i.test(ua);

    const showTimer = window.setTimeout(() => {
      setPlatform(
        isAndroid
          ? "android"
          : isIos
            ? "ios"
            : isWindows
              ? "windows"
              : "desktop",
      );
      setVisible(true);
    }, 0);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [isPrintRoute]);

  const content = useMemo(() => {
    if (platform === "ios") {
      return {
        icon: Smartphone,
        title: "سامانه را روی آیفون نصب کنید",
        description:
          "در Safari روی Share بزنید و سپس گزینه Add to Home Screen را انتخاب کنید.",
        cta: "راهنمای نصب آیفون",
      };
    }

    if (platform === "android") {
      return {
        icon: MonitorSmartphone,
        title: "سامانه را روی گوشی نصب کنید",
        description:
          "در اندروید، از منوی مرورگر گزینه Add to Home Screen یا Install app را انتخاب کنید.",
        cta: "نصب اپلیکیشن",
      };
    }

    if (platform === "windows") {
      return {
        icon: Laptop,
        title: "نصب روی ویندوز",
        description:
          "در Chrome یا Edge می‌توانید از گزینه Install app استفاده کنید تا سامانه مانند یک برنامه مستقل اجرا شود.",
        cta: "نصب روی ویندوز",
      };
    }

    return {
      icon: Download,
      title: "تالار منیجر را مانند اپلیکیشن نصب کنید",
      description:
        "برای دسترسی سریع‌تر و تجربه بهتر، سامانه را روی موبایل یا دسکتاپ نصب کنید.",
      cta: "نصب اپلیکیشن",
    };
  }, [platform]);

  if (isPrintRoute || !visible) {
    return null;
  }

  const Icon = content.icon;

  async function install() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      localStorage.setItem(dismissalKey, String(Date.now()));
      setVisible(false);
      setInstallEvent(null);
    }
  }

  function dismiss() {
    localStorage.setItem(dismissalKey, String(Date.now()));
    setVisible(false);
  }

  return (
    <section data-pwa-install-prompt="true" className="talar-install-prompt no-print print:hidden fixed inset-x-3 bottom-[calc(0.9rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md overflow-hidden rounded-[1.65rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.18),transparent_14rem),linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_90px_rgba(0,0,0,0.34)] md:static md:inset-auto md:bottom-auto md:z-auto md:mx-0 md:mb-6 md:max-w-none md:rounded-[1.75rem] md:border-[#d8c08b]/62 md:bg-[radial-gradient(circle_at_10%_0%,rgba(199,161,90,0.18),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.96))] md:p-5 md:text-[#111827] md:shadow-[0_24px_80px_rgba(17,24,39,0.10)]">
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#e8c478]/35 md:hidden" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/24 bg-[#e8c478]/10 text-[#f0dba9] md:size-12 md:border-0 md:bg-[#111827]">
            <Icon size={21} />
          </span>
          <div>
            <h2 className="text-sm font-black text-[#fff4d5] md:text-base md:text-[#111827]">
              {content.title}
            </h2>
            <p className="mt-1 text-xs font-bold leading-6 text-[#d9caa9] md:text-sm md:leading-7 md:text-[#6d5f49]">
              {content.description}
            </p>
          </div>
        </div>

        <div
          className={
            installEvent
              ? "grid grid-cols-2 gap-2 md:flex md:shrink-0 md:flex-row"
              : "grid grid-cols-1 gap-2 md:flex md:shrink-0 md:flex-row"
          }
        >
          {installEvent ? (
            <button
              type="button"
              onClick={install}
              className="btn-luxury-primary min-h-11 px-4 py-2.5 text-xs md:min-h-12 md:px-5 md:py-3 md:text-sm"
            >
              <Download size={16} />
              {content.cta}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#e8c478]/28 bg-white/[0.07] px-4 py-2.5 text-xs font-black text-[#f0dba9] hover:border-[#e8c478]/55 md:min-h-12 md:border-[#d8c08b]/72 md:bg-[#fff8ea]/72 md:px-4 md:py-3 md:text-sm md:text-[#6d5f49] md:hover:border-[#c7a15a]"
          >
            <X size={15} />
            بعداً
          </button>
        </div>
      </div>
    </section>
  );
}

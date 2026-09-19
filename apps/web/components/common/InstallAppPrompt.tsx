"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen to beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed recently (snooze for 24 hours)
      const dismissedUntil = localStorage.getItem("smol_pwa_dismissed_until");
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        // Delay showing popup slightly for better user onboarding experience
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If iOS and not dismissed recently, show prompt after delay
    if (isIosDevice) {
      const dismissedUntil = localStorage.getItem("smol_pwa_dismissed_until");
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }

    // Listen to custom open event if triggered from settings or navbar
    const handleCustomOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-install-prompt", handleCustomOpen);

    // Check if app gets installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-install-prompt", handleCustomOpen);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsOpen(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      // Fallback for browsers where prompt can't be triggered programmatically
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    // Snooze for 2 days
    const snoozeTime = Date.now() + 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem("smol_pwa_dismissed_until", snoozeTime.toString());
  };

  if (!isOpen || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label="Install App Banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-[#FAF5ED] dark:bg-[#1E1A17] border-2 border-[#C9AE8B]/40 dark:border-[#3D342F] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#B72E35]/5 dark:bg-[#B72E35]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-[#725039] dark:text-[#A8927E] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with App Icon */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-[#F3E7D3] border border-[#C9AE8B]/50 shadow-sm flex items-center justify-center">
            <Image
              src="/icon-192.png"
              alt="smol café logo"
              width={48}
              height={48}
              className="object-contain w-full h-full p-1"
            />
          </div>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#241F1C] dark:text-[#F3E7D3] leading-tight">
                smol café app
              </h3>
              <span className="text-[10px] uppercase font-mono tracking-wider bg-[#B72E35]/10 text-[#B72E35] dark:text-[#E25C64] px-1.5 py-0.5 rounded font-medium">
                PWA
              </span>
            </div>
            <p className="text-xs text-[#725039] dark:text-[#A8927E] mt-0.5 leading-snug">
              Install for instant ordering, offline access & full-screen vibes.
            </p>
          </div>
        </div>

        {/* iOS Step-by-Step Instructions if requested or on iOS */}
        {showIOSInstructions ? (
          <div className="bg-[#F3E7D3]/60 dark:bg-[#2A2420] border border-[#C9AE8B]/30 dark:border-[#3D342F] rounded-xl p-3 mb-3 text-xs text-[#241F1C] dark:text-[#F3E7D3] space-y-2">
            <div className="font-medium flex items-center gap-1.5 text-[#B72E35] dark:text-[#E25C64]">
              <span>Follow these quick steps to install:</span>
            </div>
            {isIOS ? (
              <ol className="space-y-1.5 list-decimal list-inside text-[#725039] dark:text-[#C9AE8B]">
                <li className="leading-snug">
                  Tap the <span className="font-semibold text-[#241F1C] dark:text-[#F3E7D3]">Share</span> icon at bottom of Safari (<svg className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>)
                </li>
                <li className="leading-snug">
                  Scroll down & select <span className="font-semibold text-[#241F1C] dark:text-[#F3E7D3]">Add to Home Screen</span> (<span className="font-mono font-bold">+</span>)
                </li>
                <li className="leading-snug">
                  Tap <span className="font-semibold text-[#241F1C] dark:text-[#F3E7D3]">Add</span> in top right corner.
                </li>
              </ol>
            ) : (
              <div className="text-[#725039] dark:text-[#C9AE8B] leading-relaxed">
                Tap the browser menu (<strong>⋮</strong> or <strong>Share</strong>) and select <span className="font-semibold text-[#241F1C] dark:text-[#F3E7D3]">&ldquo;Install App&rdquo;</span> or <span className="font-semibold text-[#241F1C] dark:text-[#F3E7D3]">&ldquo;Add to Home Screen&rdquo;</span>.
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 text-xs font-medium text-[#725039] dark:text-[#A8927E] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center"
          >
            maybe later
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#B72E35] hover:bg-[#A3282F] active:scale-[0.98] shadow-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{showIOSInstructions ? "got it" : "install app"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

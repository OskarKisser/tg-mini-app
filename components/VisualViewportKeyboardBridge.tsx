"use client";

import { useEffect } from "react";
import { isTelegramClientShell } from "@/lib/telegram";

/**
 * Сжатие visualViewport при виртуальной клавиатуре (iOS/Android WebView, в т.ч. TMA).
 * Пишет `--keyboard-overlap` для отступов/sticky и при необходимости `scroll-padding-bottom` на html,
 * чтобы фокус и «Далее» не оказывались под клавиатурой.
 */
function computeKeyboardOverlapPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const visibleBottom = vv.offsetTop + vv.height;
  return Math.max(0, Math.round(window.innerHeight - visibleBottom));
}

export function VisualViewportKeyboardBridge() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const isTgShell = isTelegramClientShell();
    /** Совпадает с `pb-28` в AdaptiveLayout — зона под нижнюю навигацию. */
    const navClearance = "7rem";

    const sync = () => {
      const overlap = computeKeyboardOverlapPx();
      document.documentElement.style.setProperty("--keyboard-overlap", `${overlap}px`);
      if (isTgShell) {
        document.documentElement.style.setProperty(
          "scroll-padding-bottom",
          `calc(${navClearance} + env(safe-area-inset-bottom, 0px) + ${overlap}px)`
        );
      }
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();

    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--keyboard-overlap");
      if (isTgShell) {
        document.documentElement.style.removeProperty("scroll-padding-bottom");
      }
    };
  }, []);

  return null;
}

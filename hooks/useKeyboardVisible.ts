"use client";

import { useEffect, useState } from "react";

/** Порог сжатия visual viewport (px) — эвристика «клавиатура открыта». */
const VIEWPORT_SHRINK_THRESHOLD_PX = 96;

function computeKeyboardFromViewport(): boolean {
  if (typeof window === "undefined") return false;
  const vv = window.visualViewport;
  if (!vv) return false;
  const shrink = window.innerHeight - vv.height;
  return shrink > VIEWPORT_SHRINK_THRESHOLD_PX;
}

/**
 * TMA / мобильный WebView: клавиатура сжимает visualViewport.
 * Дополнительно: focus на input/textarea для сценариев, где resize приходит с задержкой.
 */
export function useKeyboardVisible(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      setOpen(computeKeyboardFromViewport());
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();

    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return false;
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        if (type === "hidden" || type === "checkbox" || type === "radio") return false;
      }
      return true;
    };

    // На десктопе экранной клавиатуры нет: фокус в поле ничего не перекрывает.
    const touch = window.matchMedia("(pointer: coarse)").matches;

    const onFocusIn = (e: Event) => {
      if (touch && isField(e.target)) setOpen(true);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        const a = document.activeElement;
        if (isField(a)) return;
        setOpen(computeKeyboardFromViewport());
      }, 150);
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  return open;
}

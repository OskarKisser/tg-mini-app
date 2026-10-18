"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIsTelegramMiniApp } from "@/lib/hooks/useIsTelegramMiniApp";
import { BottomNavHost } from "./BottomNavHost";
import { Sidebar } from "./Sidebar";

/**
 * Адаптивный layout: Telegram Mini App vs Web
 * - Telegram: max-w-[450px], bottom navigation
 * - Web desktop (lg+): сайдбар слева
 * - Web mobile: без сайдбара — нижняя панель как в TMA (навигация не пропадает)
 * - Public pages (login): без навигации
 */
export function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  const isTelegram = useIsTelegramMiniApp();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Public pages without navigation
  const isPublicPage = 
    pathname === "/login" || 
    pathname.startsWith("/auth/");

  // Prevent hydration mismatch by rendering universal layout first
  useEffect(() => {
    setMounted(true);
  }, []);

  // Public page layout (no sidebar, no navigation)
  if (isPublicPage) {
    return <>{children}</>;
  }

  /** Отступ снизу под фиксированный BottomNav на узком экране (мобильный веб, до срабатывания lg:). */
  const webMobileScrollPad =
    "px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pt-8 lg:px-12 lg:py-8 lg:pb-8";

  // During SSR and initial mount, render universal layout
  if (!mounted) {
    return (
      <div className="relative z-[1] flex w-full min-h-app">
        <Sidebar />
        <div className="ml-0 min-w-0 flex-1 lg:ml-64">
          <div
            id="app-main-scroll"
            className={`app-main-scroll relative max-w-[1400px] ${webMobileScrollPad}`}
          >
            {children}
          </div>
        </div>
        <div className="lg:hidden">
          <BottomNavHost />
        </div>
      </div>
    );
  }

  // After hydration, render adaptive layout
  if (isTelegram) {
    // Telegram Mini App: узкий mobile layout (нижний inset — в .app-safe-shell + fixed nav)
    return (
      <div className="relative z-[1] mx-auto min-h-app w-full max-w-[450px]">
        <div
          id="app-main-scroll"
          className="app-main-scroll relative px-3 pt-4"
          style={{
            paddingBottom:
              "calc(7rem + env(safe-area-inset-bottom, 0px) + var(--keyboard-overlap, 0px))"
          }}
        >
          {children}
        </div>
        <BottomNavHost />
      </div>
    );
  }

  // Web: desktop — сайдбар; мобильный браузер — та же нижняя панель, что в Telegram (сайдбар только lg+)
  return (
    <div className="relative z-[1] flex min-h-app w-full">
      <Sidebar />
      <div className="ml-0 min-w-0 flex-1 lg:ml-64">
        <div
          id="app-main-scroll"
          className={`app-main-scroll relative max-w-[1400px] ${webMobileScrollPad}`}
        >
          {children}
        </div>
      </div>
      <div className="lg:hidden">
        <BottomNavHost />
      </div>
    </div>
  );
}

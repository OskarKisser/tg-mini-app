"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Главная кнопка шага, закреплённая внизу экрана. Портал в body: шаги мастера живут внутри
 * анимаций с transform, а fixed внутри transform держится за анимацию, а не за экран.
 * Под ней на странице уже есть запас (paddingBottom у #app-main-scroll).
 */
export function WizardActionBar({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* Запас в конце страницы, чтобы последнее поле не уходило под закреплённую кнопку. */}
      <div aria-hidden className="h-16" />
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
              <div
                className="pointer-events-auto w-full max-w-lg bg-gradient-to-t from-omf-bg from-75% to-transparent px-4 pt-6"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
              >
                {children}
                {note ? <p className="mt-2 text-center text-[12.5px] text-omf-graphite">{note}</p> : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

"use client";

import { useState } from "react";
import { hapticMap } from "@/lib/haptic-map";
import { getTelegramApiAuthHeaders } from "@/lib/telegram";
import { BusyLabel } from "@/components/BusyLabel";

/** Форма «Написать нам». `bare` — без своего заголовка, когда она внутри листа с заголовком. */
export function FeedbackCard({ bare = false }: { bare?: boolean } = {}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);

  const canSubmit = message.trim().length >= 3 && !sending;

  const submitFeedback = async () => {
    const text = message.trim();
    if (text.length < 3 || sending) return;
    setSending(true);
    setStatusText(null);
    setStatusError(false);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...getTelegramApiAuthHeaders()
        },
        body: JSON.stringify({
          message: text,
          route: typeof window !== "undefined" ? window.location.pathname : "/requirements",
          userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined
        })
      });

      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || json?.ok !== true) {
        throw new Error(json?.error || "Не получилось отправить сообщение. Попробуй ещё раз.");
      }

      hapticMap.notificationSuccess();
      setMessage("");
      setStatusText("Спасибо, сообщение отправлено.");
      setStatusError(false);
    } catch (error) {
      hapticMap.notificationError();
      setStatusText(error instanceof Error ? error.message : "Не получилось отправить сообщение. Попробуй ещё раз.");
      setStatusError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={bare ? undefined : "border-t border-omf-line pt-6"}>
      {bare ? null : (
        <>
          <h2 className="text-[20px] font-bold tracking-tight">Нашёл ошибку или есть идея?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-omf-graphite">
            Напиши, что неудобно или сломалось. Сообщение увидит команда сервиса.
          </p>
        </>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Что случилось или что улучшить"
        aria-label="Сообщение для команды"
        maxLength={4000}
        className={`omf-focus ${bare ? "" : "mt-4 "}min-h-[120px] w-full rounded-control border border-omf-line ${bare ? "bg-omf-bg" : "bg-omf-surface"} px-4 py-3 text-[16px] text-omf-ink outline-none transition-colors placeholder:text-omf-faint focus:border-omf-ultra`}
      />

      <div className="mt-2 flex items-center justify-between text-[13px] text-omf-faint">
        <span>Не короче 3 символов</span>
        <span className="tabular-nums">{message.length}/4000</span>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submitFeedback}
        className="omf-btn-primary mt-4 w-full"
      >
        <BusyLabel busy={sending} busyText="Отправляем…">Отправить</BusyLabel>
      </button>
      {statusText ? (
        <p className={`mt-3 text-[14px] ${statusError ? "text-omf-red" : "text-omf-green"}`} role="status">
          {statusText}
        </p>
      ) : null}
    </section>
  );
}

import { getTelegramWebApp } from "@/lib/telegram";

/**
 * Открывает внешнюю ссылку: в TMA предпочтительно `Telegram.WebApp.openLink`, иначе `window.open`.
 */
export function openSmartLink(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || typeof window === "undefined") return;

  const webApp = getTelegramWebApp();
  if (webApp?.openLink) {
    try {
      webApp.openLink(trimmed);
      return;
    } catch {
      /* fallback */
    }
  }

  window.open(trimmed, "_blank", "noopener,noreferrer");
}

/**
 * «Поделиться ссылкой»: в TMA — окно выбора чата Telegram, в браузере — системное меню «Поделиться»,
 * а если его нет — та же страница выбора чата t.me в новой вкладке.
 */
export function shareSmartLink(url: string, text: string): void {
  const trimmed = url.trim();
  if (!trimmed || typeof window === "undefined") return;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(trimmed)}&text=${encodeURIComponent(text)}`;

  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) {
    try {
      webApp.openTelegramLink(shareUrl);
      return;
    } catch {
      /* fallback */
    }
  }

  if (typeof navigator.share === "function") {
    void navigator.share({ url: trimmed, text }).catch(() => {
      /* закрыли меню — ничего не делаем */
    });
    return;
  }

  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

/** Открывает личку с пользователем: в TMA через `openTelegramLink`, иначе обычной ссылкой t.me. */
export function openTelegramChat(username: string): void {
  const handle = username.trim().replace(/^@/, "");
  if (!handle || typeof window === "undefined") return;
  const url = `https://t.me/${encodeURIComponent(handle)}`;

  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) {
    try {
      webApp.openTelegramLink(url);
      return;
    } catch {
      /* fallback */
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

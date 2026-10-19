import { getTelegramWebApp } from "@/lib/telegram";

function hapticFeedback() {
  return getTelegramWebApp()?.HapticFeedback;
}

/**
 * Единая точка тактильных паттернов для TMA (в браузере — no-op).
 */
export const hapticMap = {
  impactLight: (): void => {
    try {
      hapticFeedback()?.impactOccurred?.("light");
    } catch {
      /* ignore */
    }
  },
  impactHeavy: (): void => {
    try {
      hapticFeedback()?.impactOccurred?.("heavy");
    } catch {
      /* ignore */
    }
  },
  notificationSuccess: (): void => {
    try {
      hapticFeedback()?.notificationOccurred?.("success");
    } catch {
      /* ignore */
    }
  },
  notificationError: (): void => {
    try {
      hapticFeedback()?.notificationOccurred?.("error");
    } catch {
      /* ignore */
    }
  },
  notificationWarning: (): void => {
    try {
      hapticFeedback()?.notificationOccurred?.("warning");
    } catch {
      /* ignore */
    }
  },
  selectionChanged: (): void => {
    try {
      hapticFeedback()?.selectionChanged?.();
    } catch {
      /* ignore */
    }
  }
};

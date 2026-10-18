"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getTelegramApiAuthHeaders, getTelegramUsername } from "@/lib/telegram";
import { useReleases } from "@/lib/hooks/useReleases";
import { pickHeroArtistName } from "@/lib/artist-name";
import { toast } from "sonner";
import { useIsTelegramMiniApp } from "@/lib/hooks/useIsTelegramMiniApp";
import { useLogout, useWebAuth } from "@/lib/hooks/useWebAuth";
import type { UserPreferences } from "@/app/api/settings/preferences/route";
import { ReferralCard } from "@/components/ReferralCard";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchPreferences(): Promise<UserPreferences> {
  const res = await fetch("/api/settings/preferences", {
    headers: getTelegramApiAuthHeaders()
  });
  const json: unknown = await res.json();
  if (!res.ok || typeof json !== "object" || json === null || !("preferences" in json)) {
    throw new Error("Не удалось загрузить настройки.");
  }
  return (json as { preferences: UserPreferences }).preferences;
}

async function savePreferences(
  patch: Partial<Omit<UserPreferences, "user_id" | "updated_at">>
): Promise<UserPreferences> {
  const res = await fetch("/api/settings/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getTelegramApiAuthHeaders()
    },
    body: JSON.stringify(patch)
  });
  const json: unknown = await res.json();
  if (!res.ok || typeof json !== "object" || json === null || !("preferences" in json)) {
    throw new Error("Не удалось сохранить настройки.");
  }
  return (json as { preferences: UserPreferences }).preferences;
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-omf-line py-4">
      <div className="min-w-0">
        <p className="text-[15px] text-omf-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-omf-graphite">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`omf-focus relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-omf-ultra" : "bg-omf-line-strong"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[25px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const isTelegramContext = useIsTelegramMiniApp();
  const { releases, greetingName } = useReleases();
  const webUser = useWebAuth();
  const artistName = pickHeroArtistName(releases, greetingName);
  const tgUsername = isTelegramContext ? getTelegramUsername() : null;
  const accountLine = tgUsername ? `@${tgUsername} в Telegram` : (webUser?.email ?? null);
  const {
    data: prefs,
    isLoading,
    mutate
  } = useSWR(isTelegramContext ? "settings-preferences" : null, fetchPreferences, {
    revalidateOnFocus: false
  });

  const [isSavingPush, setIsSavingPush] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleTogglePush = useCallback(
    async (value: boolean) => {
      setIsSavingPush(true);
      try {
        const updated = await savePreferences({ push_notifications: value });
        await mutate(updated, { revalidate: false });
        toast.success(value ? "Уведомления включены" : "Уведомления выключены");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось сохранить. Попробуй ещё раз.");
      } finally {
        setIsSavingPush(false);
      }
    },
    [mutate]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  const initial = (artistName.trim().charAt(0) || "•").toUpperCase();

  return (
    <div className="mx-auto w-full max-w-lg px-1 pb-40 pt-4 text-omf-ink">
      <button
        type="button"
        onClick={() => router.back()}
        className="omf-focus -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[14px] text-omf-graphite transition-colors hover:text-omf-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Релизы
      </button>

      <header className="mt-4 flex items-center gap-3.5">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-omf-ultra text-[26px] font-bold text-white"
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-bold leading-none tracking-[-0.045em]">{artistName}</h1>
          {accountLine ? <p className="mt-1.5 truncate text-[13px] text-omf-graphite">{accountLine}</p> : null}
        </div>
      </header>

      {isTelegramContext ? (
        <div className="mt-6">
          <ReferralCard />
        </div>
      ) : null}

      <div className="mt-4">
        {!isTelegramContext ? (
          <div className="flex items-center justify-between gap-4 border-b border-omf-line py-4">
            <p className="text-[15px] text-omf-ink">Уведомления</p>
            <p className="text-right text-[13px] text-omf-graphite">Метка «Новое» в релизах</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-between border-b border-omf-line py-4" aria-busy="true">
            <div className="h-4 w-40 animate-pulse rounded bg-omf-surface" />
            <div className="h-8 w-[52px] animate-pulse rounded-full bg-omf-surface" />
          </div>
        ) : (
          <ToggleRow
            label="Уведомления"
            hint="Сообщение в Telegram, когда модератор принял решение"
            checked={prefs?.push_notifications ?? true}
            onChange={handleTogglePush}
            disabled={isSavingPush}
          />
        )}
        <Link
          href="/requirements"
          className="omf-focus flex items-center justify-between gap-4 border-b border-omf-line py-4 text-[15px] text-omf-ink"
        >
          Помощь и правила
          <ChevronRight className="h-4 w-4 text-omf-faint" aria-hidden />
        </Link>
      </div>

      <WebLogoutButton />
    </div>
  );
}

function WebLogoutButton() {
  const webUser = useWebAuth();
  const { logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Показываем только для веб-пользователей (не в Telegram)
  if (typeof window === "undefined") return null;
  if (window.Telegram?.WebApp?.initData) return null;
  if (!webUser) return null;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Не получилось выйти. Попробуй ещё раз.");
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="omf-focus mt-6 w-full rounded-control py-3 text-[15px] text-omf-red disabled:opacity-50"
    >
      {isLoggingOut ? "Выходим…" : "Выйти из аккаунта"}
    </button>
  );
}

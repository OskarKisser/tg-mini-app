"use client";

import { Gift } from "lucide-react";
import { toast } from "sonner";
import { getTelegramWebApp, triggerHaptic } from "@/lib/telegram";
import { useReferral } from "@/lib/hooks/useReferral";
import { REFEREE_DISCOUNT_RUB, REFERRER_REWARD_RUB, formatRub } from "@/lib/referral";
import { cn } from "@/lib/utils";

const SHARE_TEXT = `Выпускаю музыку через omf — по моей ссылке скидка ${formatRub(REFEREE_DISCOUNT_RUB)} на первый релиз.`;

export function shareReferralLink(link: string): void {
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`;
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

async function copyLink(link: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Ссылка скопирована");
  } catch {
    toast.error("Не получилось скопировать — зажми ссылку и скопируй вручную.");
  }
}

/** «Пригласи друга» в настройках: ссылка, кнопки и счётчики. Только в Telegram. */
export function ReferralCard() {
  const { data, error, isLoading } = useReferral();

  if (isLoading) {
    return (
      <div className="border-b border-omf-line py-4" aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded bg-omf-surface" />
        <div className="mt-3 h-12 w-full animate-pulse rounded-2xl bg-omf-surface" />
      </div>
    );
  }
  if (error || !data) return null;

  return (
    <section className="border-b border-omf-line py-4" aria-labelledby="referral-title">
      <p id="referral-title" className="text-[16px] text-omf-ink">
        Пригласи друга
      </p>
      <p className="mt-0.5 text-[14px] text-omf-graphite">
        Другу — скидка {formatRub(REFEREE_DISCOUNT_RUB)} на первый релиз. Тебе — {formatRub(REFERRER_REWARD_RUB)}, когда он
        оплатит.
      </p>

      {data.hasPendingDiscount ? (
        <p className="mt-3 text-[14px] text-omf-ink">
          🎁 У тебя скидка {formatRub(REFEREE_DISCOUNT_RUB)} на первый релиз — студия учтёт её при оплате.
        </p>
      ) : null}

      {data.link ? (
        <>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              void copyLink(data.link!);
            }}
            className="omf-focus mt-3 w-full truncate rounded-2xl bg-omf-surface px-4 py-3 text-left text-[14px] text-omf-ink"
            aria-label="Скопировать ссылку-приглашение"
          >
            {data.link}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              shareReferralLink(data.link!);
            }}
            className="omf-btn-primary mt-3 h-12 w-full text-[16px]"
          >
            Отправить другу
          </button>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-omf-graphite">
          Твой код: <span className="font-bold text-omf-ink">{data.code}</span>
        </p>
      )}

      {data.invited > 0 ? (
        <p className="mt-3 text-[14px] text-omf-graphite">
          Пришли: {data.invited} · оплатили: {data.paid}
          {data.available > 0 ? ` · ждут выплаты: ${formatRub(data.available * REFERRER_REWARD_RUB)}` : ""}
        </p>
      ) : null}
    </section>
  );
}

/** Тихая ссылка под главной кнопкой пустого экрана. Только в Telegram, когда ссылка готова. */
export function ReferralInviteLink({ className }: { className?: string }) {
  const { data } = useReferral();
  if (!data?.link) return null;
  const link = data.link;
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        shareReferralLink(link);
      }}
      className={cn(
        "omf-focus inline-flex items-center justify-center gap-[7px] rounded-full px-3 py-2 text-[13px] text-omf-graphite transition-colors hover:text-omf-ink",
        className
      )}
    >
      <Gift className="h-[15px] w-[15px] text-omf-faint" strokeWidth={1.5} aria-hidden />
      Пригласить друга, +{formatRub(REFERRER_REWARD_RUB)}
    </button>
  );
}

/** Компактная строка на главном экране: ведёт к отправке ссылки другу. Только в Telegram, когда ссылка готова. */
export function ReferralInviteRow() {
  const { data } = useReferral();
  if (!data?.link) return null;
  const link = data.link;
  return (
    <section aria-label="Пригласи друга" className="mb-6 border-y border-omf-line">
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          shareReferralLink(link);
        }}
        className="omf-focus flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-omf-surface"
      >
        <span className="text-[18px]" aria-hidden>
          🎁
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-medium text-omf-ink">
          Пригласи друга: ему −{formatRub(REFEREE_DISCOUNT_RUB)}, тебе +{formatRub(REFERRER_REWARD_RUB)}
        </span>
        <span className="shrink-0 text-[14px] text-omf-ultra-text">Отправить</span>
      </button>
    </section>
  );
}

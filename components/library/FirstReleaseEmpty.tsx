"use client";

import { ReferralInviteLink } from "@/components/ReferralCard";
import { DSP_REVIEW_DAYS_TEXT } from "@/lib/release-next-step";
import { REFEREE_DISCOUNT_RUB, formatRub } from "@/lib/referral";

type FirstReleaseEmptyProps = {
  artistName: string;
  onCreate: () => void;
  /** Пришёл по приглашению — скидка на первый релиз ещё не использована. */
  referralDiscountPending: boolean;
  showInvite: boolean;
};

/** Первый вход: обложка будущего сингла с именем артиста, одна фраза и одна кнопка. */
export function FirstReleaseEmpty({ artistName, onCreate, referralDiscountPending, showInvite }: FirstReleaseEmptyProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center pt-6 text-center">
      <button
        type="button"
        onClick={onCreate}
        aria-label="Создать первый релиз"
        className="omf-focus omf-first-cover w-[68%] max-w-[264px] text-left transition-transform duration-150 active:scale-[0.98]"
      >
        <span className="absolute left-4 top-[15px] z-[1] text-[11.5px] text-white/70">Первый сингл</span>
        <span className="absolute bottom-[15px] left-4 right-4 z-[1] truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
          {artistName}
        </span>
      </button>

      {/* Отступ сверху оставляет место под отражение обложки. */}
      <h2 className="mt-[84px] text-[28px] font-medium leading-[1.05] tracking-[-0.04em] text-omf-ink">
        Твой первый релиз
      </h2>
      <p className="mt-2.5 max-w-[30ch] text-[14px] leading-relaxed text-omf-graphite">
        Сингл, EP или альбом. На площадках через {DSP_REVIEW_DAYS_TEXT} после проверки.
      </p>
      {referralDiscountPending ? (
        <p className="mt-3 text-[13px] text-omf-yellow">
          −{formatRub(REFEREE_DISCOUNT_RUB)} на первый релиз по приглашению друга
        </p>
      ) : null}

      <button type="button" onClick={onCreate} className="omf-btn-primary mt-10 h-[54px] w-full text-[16px] font-medium">
        Создать релиз
      </button>
      {showInvite ? <ReferralInviteLink className="mt-2" /> : null}
    </div>
  );
}

"use client";

import { AlertCircle, ArrowUp, Check, Clock, Pencil, Radio, type LucideIcon } from "lucide-react";
import { ReleaseSleeve } from "@/components/ReleaseSleeve";
import type { NextStepKind } from "@/lib/release-next-step";
import { cn } from "@/lib/utils";

/** Путь релиза в четыре этапа (отправлен → проверка → площадки → ссылка): сколько пройдено, цвет и знак. */
const RING: Record<NextStepKind, { progress: number; color: string; Icon: LucideIcon }> = {
  finish_draft: { progress: 0, color: "var(--omf-graphite)", Icon: Pencil },
  submit: { progress: 0, color: "var(--omf-ink)", Icon: ArrowUp },
  fix: { progress: 0.5, color: "var(--omf-red)", Icon: AlertCircle },
  waiting: { progress: 0.5, color: "var(--omf-yellow)", Icon: Clock },
  waiting_long: { progress: 0.5, color: "var(--omf-yellow)", Icon: Clock },
  approved_no_link: { progress: 0.75, color: "var(--omf-green)", Icon: Radio },
  approved_link: { progress: 1, color: "var(--omf-green)", Icon: Check },
  unknown: { progress: 0, color: "var(--omf-faint)", Icon: Clock }
};

const R = 19;
const CIRCUMFERENCE = 2 * Math.PI * R;

function StatusRing({ kind }: { kind: NextStepKind }) {
  const { progress, color, Icon } = RING[kind];
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--omf-line-strong)" strokeWidth="3" />
        {progress > 0 ? (
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
          />
        ) : null}
      </svg>
      <Icon className="h-[17px] w-[17px]" style={{ color }} strokeWidth={1.8} />
    </span>
  );
}

export type ReleaseRowProps = {
  id: string;
  title: string;
  artist?: string | null;
  coverUrl?: string | null;
  kind: NextStepKind;
  /** Одна строка статуса под названием (цвет по смыслу). */
  statusLine: { text: string; className: string };
  priority?: boolean;
  busy?: boolean;
  /** Решение модератора, которое ещё не открывали. */
  isNew?: boolean;
  onClick: () => void;
};

/** Строка библиотеки: обложка, название, статус словом и кольцо пройденного пути. */
export function ReleaseRow({ id, title, artist, coverUrl, kind, statusLine, priority, busy, isNew, onClick }: ReleaseRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "omf-focus grid w-full grid-cols-[56px_1fr_44px] items-center gap-3.5 rounded-[18px] bg-omf-surface p-2.5 text-left transition-transform duration-150 active:scale-[0.98]",
        busy && "opacity-60"
      )}
    >
      <span className="relative block w-14">
        <ReleaseSleeve seed={id} title={title} artist={artist} coverUrl={coverUrl} size="thumb" priority={priority} />
        {isNew ? (
          <span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-omf-surface bg-omf-ultra"
            aria-label="Новое решение по релизу"
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-omf-ink">{title}</span>
        <span className={cn("mt-0.5 block truncate text-[12.5px]", busy ? "text-omf-graphite" : statusLine.className)}>
          {busy ? "Открываем…" : statusLine.text}
        </span>
      </span>
      <StatusRing kind={kind} />
    </button>
  );
}

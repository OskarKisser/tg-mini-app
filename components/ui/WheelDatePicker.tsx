"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { hapticMap } from "@/lib/haptic-map";

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const ITEM_H = 40;
const VISIBLE = 5;
/** Сколько лет вперёд от минимальной даты показывать в барабане. */
const YEARS_AHEAD = 2;

type Ymd = { y: number; m: number; d: number };

function parseYmd(v: string | undefined): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v?.trim() ?? "");
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toYmdString({ y, m, d }: Ymd): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const cmp = (a: Ymd, b: Ymd) => a.y - b.y || a.m - b.m || a.d - b.d;

export function formatRuDate(v: string | undefined): string {
  const p = parseYmd(v);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : "";
}

type WheelItem = { label: string; disabled?: boolean };

/**
 * Один барабан: прокрутка со snap, выбранный пункт — по центру. Если остановились на недоступном
 * пункте, доезжаем до ближайшего доступного. Внешний `selected` подкручивает барабан (например,
 * когда сменили месяц и день упёрся в минимальную дату).
 */
function Wheel({
  items,
  selected,
  onSelect,
  label,
  className,
}: {
  items: WheelItem[];
  selected: number;
  onSelect: (index: number) => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const settleTimer = useRef<number>();
  const lastLive = useRef(selected);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || scrolling.current) return;
    if (Math.round(el.scrollTop / ITEM_H) !== selected) {
      el.scrollTo({ top: selected * ITEM_H, behavior: el.dataset.ready ? "smooth" : "auto" });
    }
    el.dataset.ready = "1";
  }, [selected]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const nearestEnabled = (i: number) => {
    if (!items[i]?.disabled) return i;
    for (let step = 1; step < items.length; step++) {
      if (items[i + step] && !items[i + step].disabled) return i + step;
      if (items[i - step] && !items[i - step].disabled) return i - step;
    }
    return i;
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    scrolling.current = true;
    const live = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
    if (live !== lastLive.current) {
      lastLive.current = live;
      hapticMap.selectionChanged();
    }
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      scrolling.current = false;
      const target = nearestEnabled(live);
      if (target !== live) el.scrollTo({ top: target * ITEM_H, behavior: "smooth" });
      onSelect(target);
    }, 120);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onScroll={onScroll}
      className={`relative z-[1] snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
      style={{
        height: ITEM_H * VISIBLE,
        maskImage: "linear-gradient(transparent, #000 35%, #000 65%, transparent)",
        WebkitMaskImage: "linear-gradient(transparent, #000 35%, #000 65%, transparent)",
      }}
    >
      <div style={{ height: ITEM_H * 2 }} aria-hidden />
      {items.map((item, i) => (
        <div
          key={item.label}
          role="option"
          aria-selected={i === selected}
          aria-disabled={item.disabled || undefined}
          onClick={() => !item.disabled && ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" })}
          className={`flex snap-center items-center justify-center text-[20px] tabular-nums ${
            item.disabled ? "text-omf-faint opacity-40" : "text-omf-ink"
          }`}
          style={{ height: ITEM_H }}
        >
          {item.label}
        </div>
      ))}
      <div style={{ height: ITEM_H * 2 }} aria-hidden />
    </div>
  );
}

type WheelDatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD` или пустая строка. */
  value: string | undefined;
  /** Самая ранняя доступная дата, `YYYY-MM-DD`. */
  min: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  title: string;
  hint?: string;
  placeholder?: string;
  className?: string;
};

/**
 * Выбор даты барабаном в шторке снизу, как колёса в iOS. Нативный `type="date"` в WebView
 * показывает английский календарь, поэтому свой компонент.
 */
export function WheelDatePicker({
  id,
  value,
  min,
  onChange,
  onBlur,
  title,
  hint,
  placeholder = "Выберите дату",
  className,
}: WheelDatePickerProps) {
  const minYmd = parseYmd(min) ?? (() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  })();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Ymd>(minYmd);

  const openSheet = () => {
    const current = parseYmd(value);
    setDraft(current && cmp(current, minYmd) >= 0 ? current : minYmd);
    setOpen(true);
    hapticMap.impactLight();
  };

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  const update = (patch: Partial<Ymd>) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      next.d = Math.min(next.d, daysInMonth(next.y, next.m));
      return cmp(next, minYmd) < 0 ? minYmd : next;
    });

  const years = Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => minYmd.y + i);
  const dayCount = daysInMonth(draft.y, draft.m);
  const dayItems = Array.from({ length: dayCount }, (_, i) => ({
    label: String(i + 1),
    disabled: cmp({ ...draft, d: i + 1 }, minYmd) < 0,
  }));
  const monthItems = MONTHS.map((label, m) => ({
    label,
    disabled: draft.y < minYmd.y || (draft.y === minYmd.y && m < minYmd.m),
  }));
  const yearItems = years.map((y) => ({ label: String(y) }));

  const shown = formatRuDate(value);

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={openSheet}
        className={`${className ?? ""} text-left`}
        aria-haspopup="dialog"
      >
        <span className={`text-[16px] ${shown ? "text-omf-ink" : "text-omf-faint"}`}>{shown || placeholder}</span>
        <CalendarDays className="h-5 w-5 shrink-0 text-omf-graphite" aria-hidden />
      </button>

      <BottomSheet
        open={open}
        onClose={close}
        header={(titleId) => (
          <h2 id={titleId} className="text-[17px] font-semibold text-omf-ink">
            {title}
          </h2>
        )}
      >
        <div className="relative flex gap-1">
          <div
            className="pointer-events-none absolute inset-x-0 rounded-[10px] bg-omf-surface-2"
            style={{ top: ITEM_H * 2, height: ITEM_H }}
            aria-hidden
          />
          <Wheel
            label="День"
            className="w-[22%]"
            items={dayItems}
            selected={draft.d - 1}
            onSelect={(i) => update({ d: i + 1 })}
          />
          <Wheel
            label="Месяц"
            className="flex-1"
            items={monthItems}
            selected={draft.m}
            onSelect={(m) => update({ m })}
          />
          <Wheel
            label="Год"
            className="w-[26%]"
            items={yearItems}
            selected={Math.max(0, years.indexOf(draft.y))}
            onSelect={(i) => update({ y: years[i] })}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(toYmdString(draft));
            hapticMap.impactLight();
            close();
          }}
          className="omf-btn-primary mt-4 h-[52px] w-full text-[16px] font-medium"
        >
          Готово
        </button>
        {hint ? <p className="mt-2.5 text-center text-[12.5px] text-omf-graphite">{hint}</p> : null}
      </BottomSheet>
    </>
  );
}

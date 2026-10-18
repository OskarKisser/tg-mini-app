import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
  /** Мелкая подпись над заголовком. */
  label?: ReactNode;
  title: ReactNode;
  /** Одно действие экрана справа (кнопка «+», аватар и т. п.). */
  action?: ReactNode;
  /** Одна строка под заголовком, если без неё непонятно, что на экране. */
  intro?: ReactNode;
  className?: string;
};

/** Общая шапка разделов: подпись 13px, заголовок 34px, справа одно действие. */
export function ScreenHeader({ label, title, action, intro, className }: ScreenHeaderProps) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {label ? <p className="text-[13px] text-omf-graphite">{label}</p> : null}
          <h1 className="mt-1 break-words text-[34px] font-bold leading-[0.95] tracking-[-0.05em] text-omf-ink sm:text-[44px]">
            {title}
          </h1>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {intro ? <p className="mt-2.5 max-w-[46ch] text-[14px] leading-relaxed text-omf-graphite">{intro}</p> : null}
    </header>
  );
}

"use client";

import Link from "next/link";
import { hapticMap } from "@/lib/haptic-map";
import { cn } from "@/lib/utils";

export type AdminTab = "queue" | "links" | "history" | "catalog";

const TABS: { key: AdminTab; label: string; href: string }[] = [
  { key: "queue", label: "Очередь", href: "/admin" },
  { key: "links", label: "Ссылки", href: "/admin?view=links" },
  { key: "history", label: "История", href: "/admin/history" },
  { key: "catalog", label: "Каталог", href: "/admin/catalog" }
];

/** Разделы модерации вкладками вместо иконок без подписей. Счётчики — там, где они известны. */
export function AdminTabs({
  active,
  counts
}: {
  active: AdminTab;
  counts?: Partial<Record<AdminTab, number>>;
}) {
  return (
    <nav
      aria-label="Разделы модерации"
      className="mb-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const count = counts?.[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.href}
            replace
            aria-current={isActive ? "page" : undefined}
            onClick={() => hapticMap.impactLight()}
            className={cn(
              "omf-focus flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12.5px] transition-colors",
              isActive
                ? "border-omf-ink bg-omf-ink font-semibold text-omf-bg"
                : "border-omf-line text-omf-graphite hover:text-omf-ink"
            )}
          >
            {tab.label}
            {count != null ? (
              <span className={cn("tabular-nums text-[11.5px]", isActive ? "text-omf-bg/70" : "text-omf-faint")}>
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

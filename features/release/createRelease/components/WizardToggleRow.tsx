"use client";

import { motion } from "framer-motion";
import { hapticMap } from "@/lib/haptic-map";

type WizardToggleRowProps = {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

/** Переключатель в мастере: та же плашка, что у полей ввода, а не отдельная полоса. */
export function WizardToggleRow({ id, label, hint, checked, onChange }: WizardToggleRowProps) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-control border border-omf-line bg-omf-surface px-4 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[15px] leading-snug text-omf-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12.5px] leading-snug text-omf-graphite">{hint}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          hapticMap.impactLight();
          onChange(!checked);
        }}
        className={`omf-focus relative inline-flex h-7 w-[46px] shrink-0 items-center rounded-full px-[3px] transition-colors ${
          checked ? "bg-omf-ultra" : "bg-omf-line-strong"
        }`}
      >
        <motion.span
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          animate={{ x: checked ? 18 : 0 }}
          className="h-[22px] w-[22px] rounded-full bg-white"
        />
      </button>
    </div>
  );
}

"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { FormFieldError } from "@/components/FormFieldError";
import { GLASS_FIELD_BASE, WIZARD_FIELD_LABEL_CLASS } from "@/lib/glass-form-classes";

const METADATA_LABEL_CLASS = `mb-1.5 block ${WIZARD_FIELD_LABEL_CLASS}`;

export type MetadataSelectFieldProps = {
  label: string;
  errorMessage?: string;
  /** Дополнительные классы для `<select>` (границы ошибок и т.д.). */
  selectClassName?: string;
} & Omit<React.ComponentPropsWithRef<"select">, "className">;

export const MetadataSelectField = forwardRef<HTMLSelectElement, MetadataSelectFieldProps>(
  function MetadataSelectField(
    { label, errorMessage, selectClassName = "", id, children, ...rest },
    ref
  ) {
    const autoId = useId();
    const selectId = id ?? autoId;

    return (
      <div className="min-w-0">
        <label htmlFor={selectId} className={METADATA_LABEL_CLASS}>
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${GLASS_FIELD_BASE} !h-[52px] !min-h-[52px] !max-h-[52px] !py-2.5 [color-scheme:dark] w-full appearance-none pr-10 ${selectClassName}`.trim()}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-omf-graphite"
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <FormFieldError message={errorMessage} />
      </div>
    );
  }
);

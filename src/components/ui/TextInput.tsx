"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  leftAddon?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, leftAddon, className = "", id, ...props },
  ref,
) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55">
          {label}
        </span>
      )}
      <span className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 focus-within:border-brand-400/70 focus-within:bg-white/[0.09]">
        {leftAddon && <span className="text-white/40">{leftAddon}</span>}
        <input
          ref={ref}
          id={id}
          className={`min-h-[52px] w-full bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none ${className}`}
          {...props}
        />
      </span>
    </label>
  );
});

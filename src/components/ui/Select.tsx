"use client";

import type { ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

/** Native <select> styled to match — reliable, accessible, zero-typing. */
export function Select({ label, value, onChange, options, placeholder, className = "" }: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`min-h-[52px] w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 pr-10 text-base font-semibold text-white focus:border-brand-400/70 focus:outline-none ${className}`}
        >
          {placeholder && (
            <option value="" disabled className="bg-ink-800">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-ink-800">
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </label>
  );
}

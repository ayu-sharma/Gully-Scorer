"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "danger" | "accent" | "ghost";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-ink-950 shadow-glow hover:bg-brand-400 active:bg-brand-600 disabled:bg-brand-500/40",
  secondary: "glass text-white hover:bg-white/10 active:bg-white/[0.14]",
  danger:
    "bg-danger-500 text-white shadow-glow-danger hover:bg-danger-400 active:bg-danger-600 disabled:bg-danger-500/40",
  accent: "bg-accent-500 text-ink-950 hover:bg-accent-400 active:bg-accent-600",
  ghost: "bg-transparent text-white/80 hover:bg-white/5 active:bg-white/10",
};

// All sizes keep a >= 48px touch target.
const SIZES: Record<Size, string> = {
  sm: "min-h-[48px] px-4 text-sm rounded-2xl",
  md: "min-h-[52px] px-5 text-base rounded-2xl",
  lg: "min-h-[58px] px-6 text-lg rounded-3xl",
  xl: "min-h-[64px] px-7 text-xl rounded-3xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth,
    loading,
    leftIcon,
    className = "",
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 font-bold tracking-tight transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={size === "xl" || size === "lg" ? 22 : 18} /> : leftIcon}
      {children}
    </button>
  );
});

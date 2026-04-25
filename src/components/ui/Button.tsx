import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-[#2651A6] text-white hover:bg-[#1E3F80] active:bg-[#163066] disabled:bg-[#2651A6]/50 shadow-sm",
  secondary:
    "bg-white text-[#0F172A] border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-600/50 shadow-sm",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

const BASE =
  "inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#52B5F2] focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none whitespace-nowrap";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps) {
  return (
    <button
      className={`${BASE} ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className ?? ""}`}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps) {
  return (
    <a
      className={`${BASE} ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className ?? ""}`}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </a>
  );
}

import type { HTMLAttributes } from "react";

type Tone = "default" | "primary" | "accent" | "success" | "warning" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-slate-100 text-slate-700",
  primary: "bg-[#2651A6]/10 text-[#2651A6]",
  accent: "bg-[#52B5F2]/15 text-[#1c80c4]",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Badge({
  tone = "default",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        TONE_CLASS[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

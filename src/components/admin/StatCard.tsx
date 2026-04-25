import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "accent";
}) {
  const accent =
    tone === "primary"
      ? "bg-[#2651A6]/10 text-[#2651A6]"
      : tone === "accent"
      ? "bg-[#52B5F2]/15 text-[#1c80c4]"
      : "bg-slate-100 text-slate-600";
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg grid place-items-center ${accent}`}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-3xl font-bold text-[#0F172A] tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {hint}
        </div>
      )}
    </div>
  );
}

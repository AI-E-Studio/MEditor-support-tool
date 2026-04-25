import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Table({
  className,
  children,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cx("w-full text-sm", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cx("bg-slate-50/80", className)} {...rest}>
      {children}
    </thead>
  );
}

export function TBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cx("divide-y divide-slate-100", className)} {...rest}>
      {children}
    </tbody>
  );
}

export function TR({
  className,
  hover = true,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }) {
  return (
    <tr
      className={cx(
        hover && "transition-colors hover:bg-[#52B5F2]/5",
        className
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TH({
  className,
  align = "left",
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={cx(
        "px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500",
        alignCls,
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TD({
  className,
  align = "left",
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td
      className={cx(
        "px-4 py-3 text-[#0F172A] align-middle",
        alignCls,
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-slate-500 text-sm"
      >
        {children}
      </td>
    </tr>
  );
}

"use client";

import { usePathname } from "next/navigation";

const TITLES: Array<{ match: (p: string) => boolean; title: string }> = [
  { match: (p) => p === "/admin", title: "ログイン履歴" },
  {
    match: (p) => p === "/admin/users" || p.startsWith("/admin/users/"),
    title: "登録ユーザー",
  },
];

export function CurrentPageLabel() {
  const pathname = usePathname() ?? "";
  const found = TITLES.find((t) => t.match(pathname));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 hidden sm:inline">
        Admin
      </span>
      <span className="hidden sm:inline text-slate-300">/</span>
      <span className="text-sm font-semibold text-[#0F172A] truncate">
        {found?.title ?? "管理画面"}
      </span>
    </div>
  );
}

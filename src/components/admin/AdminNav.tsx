"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "ログイン履歴", match: (p: string) => p === "/admin" },
  {
    href: "/admin/users",
    label: "登録ユーザー一覧",
    match: (p: string) => p === "/admin/users" || p.startsWith("/admin/users/"),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-4 flex flex-wrap gap-2 border-t border-(--border) pt-3"
      aria-label="管理メニュー"
    >
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-(--primary) text-white"
                : "bg-(--accent) text-(--foreground) hover:bg-(--border)/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

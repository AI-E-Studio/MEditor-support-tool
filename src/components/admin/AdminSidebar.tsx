"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  match: (p: string) => boolean;
}

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "ログイン履歴",
    match: (p) => p === "/admin",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "登録ユーザー",
    match: (p) => p === "/admin/users" || p.startsWith("/admin/users/"),
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex-col z-30"
      aria-label="管理メニュー"
    >
      <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-[#2651A6] grid place-items-center text-white text-sm font-bold">
          M
        </div>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">
            Admin
          </div>
          <div className="text-sm font-bold text-[#0F172A]">管理画面</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#2651A6] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] active:bg-slate-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={
                  active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-[#0F172A] transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          サポートツールに戻る
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto"
      aria-label="管理メニュー（モバイル）"
    >
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active
                ? "bg-[#2651A6] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

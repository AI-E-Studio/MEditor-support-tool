"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  match: (p: string) => boolean;
  badge?: string;
}

interface NavSection {
  title?: string;
  icon?: ReactNode;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        href: "/",
        label: "ホーム",
        match: (p) => p === "/",
      },
    ],
  },
  {
    title: "営業・集客",
    icon: "📈",
    items: [
      {
        href: "/proposal",
        label: "提案書ジェネレーター",
        match: (p) => p === "/proposal" || p.startsWith("/proposal/"),
      },
      {
        href: "/portfolio-check",
        label: "ポートフォリオチェック",
        match: (p) => p.startsWith("/portfolio-check"),
        badge: "β",
      },
    ],
  },
  {
    title: "クライアント対応",
    icon: "💬",
    items: [
      {
        href: "/eq-rewrite",
        label: "EQリライト",
        match: (p) => p.startsWith("/eq-rewrite"),
      },
      {
        href: "/chat-review",
        label: "クライアントワーク添削",
        match: (p) => p.startsWith("/chat-review"),
      },
      {
        href: "/video-feedback",
        label: "動画フィードバック",
        match: (p) => p.startsWith("/video-feedback"),
      },
    ],
  },
  {
    title: "企画・制作",
    icon: "🎬",
    items: [
      {
        href: "/youtube-research",
        label: "YouTubeリサーチ",
        match: (p) => p.startsWith("/youtube-research"),
      },
      {
        href: "/thumbnail-generator",
        label: "サムネイル生成",
        match: (p) => p.startsWith("/thumbnail-generator"),
      },
    ],
  },
];

const PLUGINS: { href: string; label: string }[] = [
  {
    href: "https://drive.google.com/drive/folders/1he0IdYQmbdL1ZXMdsGl9DDvbpFZ9hMnk?usp=drive_link",
    label: "Premiere 自動カット",
  },
  {
    href: "https://drive.google.com/drive/folders/1uEoCuyIU6ixe58HxO86hWyVGIhHxF9Ze?usp=sharing",
    label: "テロップ位置矯正",
  },
];

function NavLink({
  href,
  label,
  active,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-[#2651A6] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] active:bg-slate-200"
      }`}
    >
      <span className="truncate">{label}</span>
      {badge && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            active
              ? "bg-white/20 text-white"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex-col z-30"
      aria-label="メインナビゲーション"
    >
      <Link
        href="/"
        className="h-16 px-5 flex items-center gap-2 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[#2651A6] grid place-items-center text-white text-sm font-bold shrink-0">
          M
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">
            MEditor
          </div>
          <div className="text-sm font-bold text-[#0F172A] truncate">
            サポートツール
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 mb-1.5 flex items-center gap-1.5">
                {section.icon && (
                  <span className="text-xs" aria-hidden="true">
                    {section.icon}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={item.match(pathname)}
                  badge={item.badge}
                />
              ))}
            </div>
          </div>
        ))}

        <div>
          <div className="px-3 mb-1.5 flex items-center gap-1.5">
            <span className="text-xs" aria-hidden="true">
              🔌
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              プラグイン
            </span>
          </div>
          <div className="space-y-0.5">
            {PLUGINS.map((p) => (
              <a
                key={p.href}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] active:bg-slate-200 transition-colors"
              >
                <span className="truncate">{p.label}</span>
                <span className="text-slate-300 group-hover:text-slate-500">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export function AppMobileNav() {
  const pathname = usePathname() ?? "";
  const flatItems = SECTIONS.flatMap((s) => s.items);
  return (
    <nav
      className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto"
      aria-label="メインナビゲーション（モバイル）"
    >
      {flatItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active
                ? "bg-[#2651A6] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            {item.label}
            {item.badge && (
              <span
                className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                  active
                    ? "bg-white/20"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

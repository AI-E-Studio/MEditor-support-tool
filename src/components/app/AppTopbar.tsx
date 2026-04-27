"use client";

import { UserMenu } from "@/components/UserMenu";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TITLE_MAP: Array<{ match: (p: string) => boolean; label: string }> = [
  { match: (p) => p === "/", label: "ホーム" },
  { match: (p) => p.startsWith("/proposal"), label: "提案書ジェネレーター" },
  {
    match: (p) => p.startsWith("/portfolio-check"),
    label: "ポートフォリオ魅力度チェック（β版）",
  },
  {
    match: (p) => p.startsWith("/eq-rewrite"),
    label: "クライアントメッセージ EQ リライト",
  },
  {
    match: (p) => p.startsWith("/chat-review"),
    label: "クライアントワーク添削",
  },
  {
    match: (p) => p.startsWith("/video-feedback"),
    label: "動画フィードバック",
  },
  {
    match: (p) => p.startsWith("/youtube-research"),
    label: "YouTubeリサーチ",
  },
  {
    match: (p) => p.startsWith("/thumbnail-generator"),
    label: "簡易サムネイル生成",
  },
];

export function AppTopbar() {
  const pathname = usePathname() ?? "/";
  const found = TITLE_MAP.find((t) => t.match(pathname));
  const isHome = pathname === "/";

  return (
    <header
      className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-4 sm:px-6"
      role="banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/"
          className="lg:hidden w-8 h-8 rounded-lg bg-[#2651A6] grid place-items-center text-white text-sm font-bold shrink-0"
          aria-label="ホームへ"
        >
          M
        </Link>
        {!isHome && (
          <Link
            href="/"
            className="hidden sm:inline text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 transition-colors"
          >
            MEditor
          </Link>
        )}
        {!isHome && (
          <span className="hidden sm:inline text-slate-300">/</span>
        )}
        <span className="text-sm font-semibold text-[#0F172A] truncate">
          {found?.label ?? "MEditorサポートツール"}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <UserMenu />
      </div>
    </header>
  );
}

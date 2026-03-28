"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";

const tools: {
  href: string;
  title: string;
  description: string;
  available: boolean;
}[] = [
  {
    href: "/proposal",
    title: "提案書ジェネレーター",
    description:
      "クライアントヒアリングからAI戦略立案、提案書ドラフト作成までを支援します。",
    available: true,
  },
];

export default function SupportToolHubPage() {
  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-(--foreground)">
              動画編集者サポートツール
            </h1>
            <p className="text-sm text-(--muted) mt-0.5">
              フリーランス動画編集者向けのユーティリティを順次追加予定です
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-(--foreground) mb-4">
          ツール一覧
        </h2>
        <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.href}>
              {tool.available ? (
                <Link
                  href={tool.href}
                  className="block h-full rounded-xl border border-(--border) bg-white p-6 shadow-sm hover:border-(--primary) hover:shadow-md transition-all"
                >
                  <h3 className="font-bold text-(--foreground) mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-(--muted) leading-relaxed">
                    {tool.description}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-(--primary)">
                    開く →
                  </span>
                </Link>
              ) : (
                <div className="block h-full rounded-xl border border-dashed border-(--border) bg-(--accent) p-6 opacity-80">
                  <h3 className="font-bold text-(--foreground) mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-(--muted)">{tool.description}</p>
                  <span className="inline-block mt-4 text-xs text-(--muted)">
                    準備中
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

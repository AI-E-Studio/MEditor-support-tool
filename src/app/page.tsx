"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";

type Category = "sales" | "client" | "production";

const CATEGORY_META: Record<
  Category,
  { title: string; subtitle: string; icon: string }
> = {
  sales: {
    title: "営業・集客",
    subtitle: "新しい案件を獲得するためのツール",
    icon: "📈",
  },
  client: {
    title: "クライアント対応",
    subtitle: "案件をスムーズに進めるためのツール",
    icon: "💬",
  },
  production: {
    title: "企画・制作",
    subtitle: "日々の編集・企画を効率化するツール",
    icon: "🎬",
  },
};

const CATEGORY_ORDER: Category[] = ["sales", "client", "production"];

const tools: {
  href: string;
  title: string;
  description: string;
  available: boolean;
  category: Category;
}[] = [
  // 営業・集客
  {
    category: "sales",
    href: "/proposal",
    title: "提案書ジェネレーター",
    description:
      "クライアントヒアリングからAI戦略立案、提案書ドラフト作成までを支援します。",
    available: true,
  },
  {
    category: "sales",
    href: "/portfolio-check",
    title: "ポートフォリオ魅力度チェックツール（β版）",
    description:
      "動画編集者のポートフォリオサイトURLを入力するだけで、作例の見せ方・プロフィールの信頼性・料金/納期の明記・問い合わせ導線の4観点をAIが100点満点で採点し、優先度付きの改善アクションを返します。※β版のため、サイト構造によっては動画作例の数を正しく読み取れない場合があります。",
    available: true,
  },

  // クライアント対応
  {
    category: "client",
    href: "/chat-review",
    title: "クライアントワーク添削ツール",
    description:
      "クライアントとのチャット履歴を貼り付けるだけで、返信速度・確認漏れ・勝手な判断・線引きなど、自分（編集者）側で改善すべきコミュニケーションのポイントを AI が指摘します。",
    available: true,
  },
  {
    category: "client",
    href: "/video-feedback",
    title: "（ディレクター向け）動画フィードバックツール",
    description:
      "YouTube・Google Drive・ローカルファイルの動画を再生しながら、タイムスタンプ付きフィードバックをリアルタイム記録。SRTテロップのAI誤字チェックも対応。",
    available: true,
  },

  // 企画・制作
  {
    category: "production",
    href: "/youtube-research",
    title: "YouTube リサーチツール",
    description:
      "キーワードやチャンネルでYouTube動画をリサーチ。拡散率ランキング・コメント分析・関連キーワード抽出に対応。",
    available: true,
  },
  {
    category: "production",
    href: "/thumbnail-generator",
    title: "簡易サムネイル生成ツール",
    description:
      "キャッチコピーを入力するだけで、Gemini AI が日本のYouTubeらしいサムネイル画像を自動生成します。",
    available: true,
  },
];

const plugins: {
  href: string;
  title: string;
  description: string;
}[] = [
  {
    href: "https://drive.google.com/drive/folders/1he0IdYQmbdL1ZXMdsGl9DDvbpFZ9hMnk?usp=drive_link",
    title: "Premiere 自動カットプラグイン",
    description:
      "Premiere Pro で無音部分を自動検出してカット編集を効率化するプラグイン。Google Drive からダウンロードできます。",
  },
  {
    href: "https://drive.google.com/drive/folders/1uEoCuyIU6ixe58HxO86hWyVGIhHxF9Ze?usp=sharing",
    title: "Premiere テロップ位置ズレ矯正プラグイン",
    description:
      "Premiere Pro でテロップ位置のズレを一括で矯正するプラグイン。Google Drive からダウンロードできます。",
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
              案件獲得から制作現場まで、フリーランス動画編集者の日々を支えるツール集
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const catTools = tools.filter((t) => t.category === cat);
          if (catTools.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-(--foreground) flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {meta.icon}
                  </span>
                  {meta.title}
                </h2>
                <p className="text-xs text-(--muted) mt-0.5">
                  {meta.subtitle}
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {catTools.map((tool) => (
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
                        <p className="text-sm text-(--muted)">
                          {tool.description}
                        </p>
                        <span className="inline-block mt-4 text-xs text-(--muted)">
                          準備中
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-(--foreground) flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                🔌
              </span>
              プラグイン・ダウンロード
            </h2>
            <p className="text-xs text-(--muted) mt-0.5">
              Premiere Pro 用の編集支援プラグイン
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {plugins.map((plugin) => (
              <li key={plugin.href}>
                <a
                  href={plugin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full rounded-xl border border-(--border) bg-white p-6 shadow-sm hover:border-(--primary) hover:shadow-md transition-all"
                >
                  <h3 className="font-bold text-(--foreground) mb-2">
                    {plugin.title}
                  </h3>
                  <p className="text-sm text-(--muted) leading-relaxed">
                    {plugin.description}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-(--primary)">
                    ダウンロード ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

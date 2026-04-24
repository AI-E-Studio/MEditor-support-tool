"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";
import { useState } from "react";

type CategoryKey = "works" | "profile" | "terms" | "cta";

interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
  summary: string;
  findings: string[];
}

interface ActionItem {
  priority: "high" | "medium" | "low";
  category: CategoryKey;
  title: string;
  detail: string;
}

interface AnalyzeResult {
  overallScore: number;
  overallSummary: string;
  strengths: string[];
  categories: CategoryScore[];
  actions: ActionItem[];
}

interface CrawledSubPage {
  url: string;
  title: string | null;
  imageCount: number;
  videoEmbeds: number;
}

interface ApiResponse {
  result: AnalyzeResult;
  meta: {
    url: string;
    title: string | null;
    description: string | null;
    imageCount: number;
    videoEmbeds: number;
    totalImageCount?: number;
    totalVideoEmbeds?: number;
    snsLinks: string[];
    crawledSubPages?: CrawledSubPage[];
  };
}

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  works: "作例の見せ方",
  profile: "プロフィールの信頼性",
  terms: "料金/納期/対応範囲",
  cta: "お問い合わせ導線",
};

const PRIORITY_STYLE = {
  high: "bg-red-600 text-white",
  medium: "bg-orange-500 text-white",
  low: "bg-slate-400 text-white",
} as const;

const PRIORITY_LABEL = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低",
} as const;

function scoreColor(score: number, full: number): string {
  const pct = score / full;
  if (pct >= 0.8) return "text-green-700";
  if (pct >= 0.6) return "text-blue-700";
  if (pct >= 0.4) return "text-orange-700";
  return "text-red-700";
}

function scoreBarColor(score: number, full: number): string {
  const pct = score / full;
  if (pct >= 0.8) return "bg-green-500";
  if (pct >= 0.6) return "bg-blue-500";
  if (pct >= 0.4) return "bg-orange-500";
  return "bg-red-500";
}

export default function PortfolioCheckPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);

  const analyze = async () => {
    setError("");
    const v = url.trim();
    if (!v) {
      setError("URLを入力してください");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/portfolio-check/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: v }),
      });
      const rawText = await res.text();
      if (!res.ok) {
        let apiError = "";
        try {
          const parsed = JSON.parse(rawText) as { error?: string };
          apiError = parsed.error || "";
        } catch {
          apiError = rawText.slice(0, 200);
        }
        throw new Error(
          `診断に失敗しました (HTTP ${res.status})${apiError ? `\n${apiError}` : ""}`
        );
      }
      const payload = JSON.parse(rawText) as ApiResponse;
      if (!payload?.result) {
        throw new Error("AIの応答形式が不正でした");
      }
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-(--muted) hover:text-(--primary)"
            >
              ← ツール一覧に戻る
            </Link>
            <h1 className="text-xl font-bold text-(--foreground) mt-1 flex items-center gap-2 flex-wrap">
              ポートフォリオ魅力度チェックツール
              <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded">
                β版
              </span>
            </h1>
            <p className="text-sm text-(--muted) mt-0.5">
              URLを入力するだけで、動画編集者のポートフォリオを4観点100点満点で採点します
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* β版 重要注意バナー */}
        <section className="rounded-xl border-2 border-orange-400 bg-orange-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-2xl leading-none">⚠️</div>
            <div>
              <h2 className="text-base font-bold text-orange-900 mb-1">
                このツールは β 版です
              </h2>
              <p className="text-sm text-orange-900 leading-relaxed">
                サイトの作りによっては、
                <strong>ページ内に掲載されている動画作例の数を正しく読み取れない場合があります。</strong>
                （例：動画を「クリックすると開く」仕組みのサイト、表示に時間差があるサイト、ページの下のほうで読み込まれるタイプのサイト など）
                <br />
                AIの採点結果はあくまで参考としてご覧いただき、実際のサイトの充実度と照らし合わせてご活用ください。
              </p>
            </div>
          </div>
        </section>

        {/* 説明 */}
        <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-(--foreground)">
            このツールについて
          </h2>
          <p className="text-sm text-(--foreground) leading-relaxed">
            動画編集者のポートフォリオサイトURL（STUDIO / Wix / Notion公開ページ / 自作サイト 等）を入力すると、
            Claude AI が
            <strong>作例の見せ方・プロフィールの信頼性・料金/納期/対応範囲の明記・問い合わせ導線</strong>
            の4つの観点で採点（各25点・合計100点）し、優先度付きの改善アクションを返します。
            トップページに加え、「作品」「実績」などの下層ページも自動で巡回して、サイト全体で判断します。
          </p>
        </section>

        {/* 入力 */}
        <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
            ポートフォリオのURL <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) analyze();
              }}
              placeholder="https://example.com/your-portfolio"
              className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="rounded-lg bg-(--primary) text-white px-6 py-2 font-semibold hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {loading ? "診断中…" : "診断する"}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 whitespace-pre-wrap">
              {error}
            </p>
          )}
        </section>

        {loading && !data && (
          <div className="text-center py-12 rounded-xl border border-(--border) bg-white">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-(--border) border-t-(--primary)" />
            <p className="text-sm text-(--muted) mt-4">
              ページを取得してAIが採点しています… 20〜40秒ほどかかります
            </p>
          </div>
        )}

        {data && (
          <>
            {/* 総合スコア */}
            <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div
                    className={`text-6xl font-black ${scoreColor(
                      data.result.overallScore,
                      100
                    )}`}
                  >
                    {data.result.overallScore}
                  </div>
                  <div className="text-xs text-(--muted) mt-1">/ 100点</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-(--muted) mb-1 truncate">
                    {data.meta.title || data.meta.url}
                  </p>
                  <p className="text-sm text-(--foreground) leading-relaxed whitespace-pre-wrap">
                    {data.result.overallSummary}
                  </p>
                </div>
              </div>

              {data.result.strengths.length > 0 && (
                <div className="mt-5 border-t border-(--border) pt-4">
                  <h3 className="text-sm font-bold text-green-800 mb-2">
                    ✓ 良かった点
                  </h3>
                  <ul className="text-sm text-(--foreground) space-y-1 list-disc list-inside">
                    {data.result.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* 観点別スコア */}
            <section>
              <h2 className="text-lg font-bold text-(--foreground) mb-3">
                観点別スコア
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.result.categories.map((cat) => (
                  <div
                    key={cat.key}
                    className="rounded-xl border border-(--border) bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="font-bold text-(--foreground)">
                        {CATEGORY_LABEL[cat.key] || cat.label}
                      </h3>
                      <div className="text-right">
                        <span
                          className={`text-3xl font-black ${scoreColor(cat.score, 25)}`}
                        >
                          {cat.score}
                        </span>
                        <span className="text-xs text-(--muted) ml-1">
                          / 25
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-(--accent) rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full ${scoreBarColor(cat.score, 25)} transition-all`}
                        style={{ width: `${(cat.score / 25) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-(--foreground) leading-relaxed mb-2">
                      {cat.summary}
                    </p>
                    {cat.findings.length > 0 && (
                      <ul className="text-xs text-(--muted) space-y-1 list-disc list-inside mt-2">
                        {cat.findings.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 改善アクション */}
            {data.result.actions.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-(--foreground) mb-3">
                  改善アクション（優先度順）
                </h2>
                <div className="space-y-2">
                  {[...data.result.actions]
                    .sort((a, b) => {
                      const o = { high: 0, medium: 1, low: 2 };
                      return o[a.priority] - o[b.priority];
                    })
                    .map((a, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-(--border) bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${PRIORITY_STYLE[a.priority]}`}
                          >
                            {PRIORITY_LABEL[a.priority]}
                          </span>
                          <span className="text-xs font-semibold text-(--muted) bg-(--accent) px-2 py-1 rounded">
                            {CATEGORY_LABEL[a.category] || a.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-(--foreground) mb-1">
                          {a.title}
                        </h3>
                        <p className="text-sm text-(--foreground) leading-relaxed">
                          {a.detail}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* 解析メタ */}
            <section className="rounded-xl border border-(--border) bg-(--accent) p-4 text-xs text-(--muted) space-y-3">
              <div>
                <div className="font-semibold mb-1 text-(--foreground)">
                  解析した構造シグナル
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  <div>
                    トップページ 画像タグ数: {data.meta.imageCount}
                  </div>
                  <div>
                    トップページ 動画埋め込み: {data.meta.videoEmbeds}
                  </div>
                  {typeof data.meta.totalImageCount === "number" && (
                    <div>
                      合計 画像タグ数 (トップ＋下層): {" "}
                      <span className="font-semibold">
                        {data.meta.totalImageCount}
                      </span>
                    </div>
                  )}
                  {typeof data.meta.totalVideoEmbeds === "number" && (
                    <div>
                      合計 動画埋め込み (トップ＋下層): {" "}
                      <span className="font-semibold">
                        {data.meta.totalVideoEmbeds}
                      </span>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    検出SNS/外部:{" "}
                    {data.meta.snsLinks.length
                      ? data.meta.snsLinks.join(", ")
                      : "(なし)"}
                  </div>
                </div>
              </div>

              {data.meta.crawledSubPages && data.meta.crawledSubPages.length > 0 && (
                <div>
                  <div className="font-semibold mb-1 text-(--foreground)">
                    自動クロールした下層ページ ({data.meta.crawledSubPages.length}件)
                  </div>
                  <ul className="space-y-1">
                    {data.meta.crawledSubPages.map((sp, i) => (
                      <li key={i} className="break-all">
                        <a
                          href={sp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--primary) hover:underline"
                        >
                          {sp.title || sp.url}
                        </a>
                        <span className="ml-2">
                          画像 {sp.imageCount} / 動画埋込 {sp.videoEmbeds}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

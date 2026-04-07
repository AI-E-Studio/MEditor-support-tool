import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YouTube APIキーの取得方法 | YouTube リサーチツール",
};

const steps = [
  {
    num: 1,
    title: "Google Cloud Console にアクセス",
    body: (
      <>
        <a
          href="https://console.cloud.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--primary) underline"
        >
          https://console.cloud.google.com/
        </a>{" "}
        を開き、Googleアカウントでログインします。
      </>
    ),
  },
  {
    num: 2,
    title: "プロジェクトを作成（または選択）",
    body: "画面上部の「プロジェクトを選択」をクリックし、「新しいプロジェクト」を作成します。既存プロジェクトがあればそちらを選んでも構いません。",
  },
  {
    num: 3,
    title: "YouTube Data API v3 を有効化",
    body: '左メニューの「APIとサービス」→「ライブラリ」を開き、検索欄に「YouTube Data API v3」と入力。表示されたAPIをクリックして「有効にする」を押します。',
  },
  {
    num: 4,
    title: "APIキーを作成",
    body: '「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」を選択するとキーが生成されます。',
  },
  {
    num: 5,
    title: "APIキーをコピーしてツールに貼り付け",
    body: '生成された「AIza...」から始まるキーをコピーし、リサーチツールの「⚙ APIキー設定」欄に貼り付けて「保存して閉じる」を押してください。',
  },
];

const notes = [
  "YouTube Data API v3 の無料枠は 1日あたり10,000ユニット です。検索1回あたり約100〜150ユニット消費するため、1日50〜100回程度の検索が目安です。",
  "APIキーはブラウザのlocalStorageに保存されます。他の人と共有しないようにご注意ください。",
  "APIキーの不正利用を防ぐため、Google Cloud Console の「キーを制限」からHTTPリファラー制限をかけることを推奨します。",
];

export default function ApiKeyGuidePage() {
  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/youtube-research"
            className="text-sm text-(--muted) hover:text-(--foreground) transition-colors"
          >
            ← リサーチツールに戻る
          </Link>
          <span className="text-(--border)">|</span>
          <h1 className="text-lg font-bold text-(--foreground)">
            YouTube APIキーの取得方法
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 手順 */}
        <section>
          <ol className="space-y-5">
            {steps.map((step) => (
              <li key={step.num} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-(--primary) text-white text-sm font-bold flex items-center justify-center mt-0.5">
                  {step.num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-(--foreground) mb-1">
                    {step.title}
                  </p>
                  <p className="text-sm text-(--muted) leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 注意事項 */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            注意事項
          </h2>
          <ul className="space-y-2">
            {notes.map((note, i) => (
              <li key={i} className="flex gap-2 text-xs text-amber-700 leading-relaxed">
                <span className="shrink-0 mt-0.5">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 戻るボタン */}
        <div className="text-center pt-2">
          <Link
            href="/youtube-research"
            className="inline-block px-6 py-2.5 bg-(--primary) text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            リサーチツールに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}

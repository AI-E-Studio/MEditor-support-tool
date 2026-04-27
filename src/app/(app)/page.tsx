import Link from "next/link";

type Category = "sales" | "client" | "production";

const CATEGORY_META: Record<
  Category,
  { title: string; subtitle: string; icon: string; color: string }
> = {
  sales: {
    title: "営業・集客",
    subtitle: "新しい案件を獲得するためのツール",
    icon: "📈",
    color: "from-[#2651A6]/10 to-[#2651A6]/5",
  },
  client: {
    title: "クライアント対応",
    subtitle: "案件をスムーズに進めるためのツール",
    icon: "💬",
    color: "from-[#52B5F2]/15 to-[#52B5F2]/5",
  },
  production: {
    title: "企画・制作",
    subtitle: "日々の編集・企画を効率化するツール",
    icon: "🎬",
    color: "from-emerald-200/30 to-emerald-100/10",
  },
};

const CATEGORY_ORDER: Category[] = ["sales", "client", "production"];

const tools: {
  href: string;
  title: string;
  description: string;
  available: boolean;
  category: Category;
  badge?: string;
}[] = [
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
    title: "ポートフォリオ魅力度チェックツール",
    description:
      "ポートフォリオサイトのURLを入力するだけで、作例の見せ方・プロフィール・料金/納期の明記・問い合わせ導線の4観点をAIが100点満点で採点します。",
    available: true,
    badge: "β版",
  },
  {
    category: "client",
    href: "/eq-rewrite",
    title: "クライアントメッセージ EQ リライト",
    description:
      "そのまま送ると冷たく届きそうな文面を、相手にちゃんと感情・温度感が伝わる EQ 高めの文章にAIがリライトします。感謝先出し・相手主語化・選択権を渡す等の設計法則を自動適用。",
    available: true,
  },
  {
    category: "client",
    href: "/chat-review",
    title: "クライアントワーク添削ツール",
    description:
      "クライアントとのチャット履歴を貼り付けるだけで、返信速度・確認漏れ・勝手な判断・線引きなど、自分側で改善すべきコミュニケーションのポイントをAIが指摘します。",
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
      "Premiere Pro で無音部分を自動検出してカット編集を効率化するプラグイン。",
  },
  {
    href: "https://drive.google.com/drive/folders/1uEoCuyIU6ixe58HxO86hWyVGIhHxF9Ze?usp=sharing",
    title: "Premiere テロップ位置ズレ矯正プラグイン",
    description:
      "Premiere Pro でテロップ位置のズレを一括で矯正するプラグイン。",
  },
];

export default function SupportToolHubPage() {
  return (
    <>
      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
          動画編集者サポートツール
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
          案件獲得から制作現場まで、フリーランス動画編集者の日々を支えるツール集。左サイドバーまたは下のカードから利用したいツールを選んでください。
        </p>
      </section>

      <div className="space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const catTools = tools.filter((t) => t.category === cat);
          if (catTools.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} grid place-items-center text-xl shrink-0 border border-slate-200/50`}
                  aria-hidden="true"
                >
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#0F172A]">
                    {meta.title}
                  </h2>
                  <p className="text-xs text-slate-500">{meta.subtitle}</p>
                </div>
              </div>
              <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {catTools.map((tool) => (
                  <li key={tool.href}>
                    {tool.available ? (
                      <Link
                        href={tool.href}
                        className="group block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#2651A6] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          <h3 className="font-bold text-[#0F172A] flex-1 min-w-0">
                            {tool.title}
                          </h3>
                          {tool.badge && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                              {tool.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {tool.description}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2651A6] group-hover:gap-2 transition-all">
                          開く
                          <span aria-hidden="true">→</span>
                        </div>
                      </Link>
                    ) : (
                      <div className="block h-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 opacity-80">
                        <h3 className="font-bold text-[#0F172A] mb-2">
                          {tool.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {tool.description}
                        </p>
                        <span className="inline-block mt-4 text-xs text-slate-500 font-medium">
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
          <div className="mb-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-xl shrink-0 border border-slate-200/50"
              aria-hidden="true"
            >
              🔌
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#0F172A]">
                プラグイン・ダウンロード
              </h2>
              <p className="text-xs text-slate-500">
                Premiere Pro 用の編集支援プラグイン
              </p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {plugins.map((plugin) => (
              <li key={plugin.href}>
                <a
                  href={plugin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#2651A6] hover:shadow-md transition-all"
                >
                  <h3 className="font-bold text-[#0F172A] mb-2">
                    {plugin.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {plugin.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2651A6] group-hover:gap-2 transition-all">
                    ダウンロード
                    <span aria-hidden="true">↗</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

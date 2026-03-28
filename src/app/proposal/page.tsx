"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";
import { useState } from "react";
import type { HearingData, ProjectMode } from "@/types";

/** テスト用: 架空クライアントの一貫したサンプルヒアリング（単発制作型） */
const initialHearing: HearingData = {
  projectMode: "single_production",
  clientName: "株式会社グリーンリーフ（架空・オーガニック食品）",
  industry: "食品小売・EC（健康志向・オーガニック専門）",
  businessOverview:
    "首都圏を中心に実店舗5店舗と自社ECを運営。国産・無添加にこだわった野菜セットと加工食品を展開。2024年より法人向け定期便を開始し、福利厚生・オフィス向け需要を開拓中。従業員約80名、年商約18億円。",
  videoType: "企業ブランディング動画（サービス紹介）＋商品訴求を兼ねたショート動画",
  videoPurpose:
    "認知拡大に加え、ECの新規会員登録と法人問い合わせ件数の増加。ブランドの信頼感（安全・透明性・サステナビリティ）を映像で伝え、競合ECとの差別化を図りたい。",
  targetAudience:
    "30〜50代の共働き世帯、健康意識が高い層。法人では人事・総務担当者（福利厚生ニーズ）。地域は関東・関西の都市部が中心。",
  publishPlatform:
    "YouTube（60秒・15秒版）、Instagramリール、自社サイトトップ、展示会ブース用モニター",
  budget: "動画制作全体で25万円〜35万円（撮影は一部既存素材活用可）",
  deadline: "初稿納品は契約から3週間以内。修正1〜2回込みで最終は5週間目まで",
  videoLength: "メイン90秒（サイト用）＋カットダウン30秒・15秒（SNS用）",
  quantity: "今回はメイン1本＋派生カット2本の計3バージョン希望",
  existingMaterials:
    "農園での取材写真（JPEG多数）、ロゴデータ（AI形式）、ブランドカラー定義（#2d5a3d / #f5f0e8）、昨年のイベント動画（編集前の長尺素材あり）",
  referenceVideos:
    "パナソニックのサステナビリティ紹介動画のテンポ感。あと、無印良品の商品紹介の落ち着いたナレーション調がイメージに近い。",
  toneAndManner:
    "自然体で誠実、高すぎない親しみ。派手なエフェクトより、素材の質感と人の表情を生かしたトーン。ナレーションは落ち着いた女性声または穏やかな男性声希望。",
  specialRequests:
    "英語字幕なし（国内向け）。冒頭5秒でブランドロゴとキャッチコピーを入れたい。BGMはアコースティック系、歌詞なし。商品パッケージのクローズアップを3カット以上。最後にCTAで公式サイトURLとQRコード表示。",
  currentChallenges:
    "SNSは投稿しているが動画の完成度にばらつきがあり、広告として使える一本がない。法人向け資料はあるが、映像で説明できる資料が弱く商談で刺さりにくい。",
  competitorInfo:
    "大手オーガニックECは予算が大きくテレビCMレベルの動画を流している。中堅では「○○マーケット」がInstagramでショートを高頻度投稿しており、フォロワー数で先行している。",
  kpi:
    "公開後3ヶ月でメイン動画の再生10万回以上、サイト経由の新規会員月200件、法人お問い合わせ月15件以上（前年比120%）。",
};

const STEPS = [
  { num: 1, label: "ヒアリング" },
  { num: 2, label: "戦略立案" },
  { num: 3, label: "提案書作成" },
];

export default function ProposalGeneratorPage() {
  const [step, setStep] = useState(1);
  const [hearing, setHearing] = useState<HearingData>(initialHearing);
  const [strategy, setStrategy] = useState("");
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof HearingData, value: string) => {
    setHearing((prev) => ({ ...prev, [field]: value }));
  };

  const setProjectMode = (mode: ProjectMode) => {
    setHearing((prev) => ({ ...prev, projectMode: mode }));
  };

  const generateStrategy = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "strategy", hearingData: hearing }),
      });
      if (!res.ok) throw new Error("戦略生成に失敗しました");
      const data = await res.json();
      setStrategy(data.result);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const generateProposal = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "proposal",
          hearingData: hearing,
          strategy,
        }),
      });
      if (!res.ok) throw new Error("提案書生成に失敗しました");
      const data = await res.json();
      setProposal(data.result);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetAll = () => {
    setStep(1);
    setHearing(initialHearing);
    setStrategy("");
    setProposal("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-(--background)">
      {/* Header */}
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-(--muted) mb-0.5">
              <Link
                href="/"
                className="hover:text-(--primary) transition-colors"
              >
                動画編集者サポートツール
              </Link>
              <span className="mx-1.5 opacity-50">/</span>
              <span>提案書ジェネレーター</span>
            </p>
            <h1 className="text-xl font-bold text-(--foreground) truncate">
              提案書AIジェネレーター
            </h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-(--muted) hidden sm:inline">
              動画編集フリーランス向け
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  step >= s.num
                    ? "bg-(--primary) text-white"
                    : "bg-(--accent) text-(--muted)"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {step > s.num ? "✓" : s.num}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    step > s.num ? "bg-(--primary)" : "bg-(--border)"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Hearing Form */}
        {step === 1 && (
          <div className="space-y-6">
            <Section title="案件の種類">
              <p className="text-sm text-(--muted) mb-4">
                実務では大きく「継続的なYouTube運用」と「1本完結の動画制作」に分かれます。どちらかを選ぶと、戦略・提案書の章立てと観点が切り替わります。
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProjectMode("youtube_operation")}
                  className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                    hearing.projectMode === "youtube_operation"
                      ? "border-(--primary) bg-(--primary)/5 ring-2 ring-(--primary)/20"
                      : "border-(--border) bg-white hover:bg-(--accent)"
                  }`}
                >
                  <span className="font-semibold text-(--foreground)">
                    YouTube運用・チャンネル型
                  </span>
                  <p className="text-sm text-(--muted) mt-2 leading-relaxed">
                    定期投稿、シリーズ、ショート連携、チャンネル成長・分析を前提にした提案。
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectMode("single_production")}
                  className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                    hearing.projectMode === "single_production"
                      ? "border-(--primary) bg-(--primary)/5 ring-2 ring-(--primary)/20"
                      : "border-(--border) bg-white hover:bg-(--accent)"
                  }`}
                >
                  <span className="font-semibold text-(--foreground)">
                    単発制作型（PV・採用・プロモ等）
                  </span>
                  <p className="text-sm text-(--muted) mt-2 leading-relaxed">
                    企業VP、採用、イベント、プロモなど、納品が1本または短期で完結する案件向け。
                  </p>
                </button>
              </div>
            </Section>

            <Section title="クライアント基本情報">
              <Field
                label="会社名 / クライアント名"
                value={hearing.clientName}
                onChange={(v) => updateField("clientName", v)}
                placeholder="例: 株式会社〇〇"
              />
              <Field
                label="業種"
                value={hearing.industry}
                onChange={(v) => updateField("industry", v)}
                placeholder="例: 飲食業、IT、不動産、美容..."
              />
              <TextArea
                label="事業概要"
                value={hearing.businessOverview}
                onChange={(v) => updateField("businessOverview", v)}
                placeholder="事業内容や主要サービスについて"
              />
            </Section>

            <Section title="動画の目的・用途">
              <Field
                label="動画の種類"
                value={hearing.videoType}
                onChange={(v) => updateField("videoType", v)}
                placeholder="例: 企業VP、商品PR、採用動画、SNS広告、YouTube..."
              />
              <TextArea
                label="動画の目的"
                value={hearing.videoPurpose}
                onChange={(v) => updateField("videoPurpose", v)}
                placeholder="何を達成したいか（認知拡大、CV向上、ブランディング等）"
              />
              <Field
                label="ターゲット層"
                value={hearing.targetAudience}
                onChange={(v) => updateField("targetAudience", v)}
                placeholder="例: 20-30代女性、経営者層、就活生..."
              />
              <Field
                label="配信プラットフォーム"
                value={hearing.publishPlatform}
                onChange={(v) => updateField("publishPlatform", v)}
                placeholder="例: YouTube、Instagram、TikTok、自社サイト..."
              />
            </Section>

            <Section title="制作条件">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="予算感"
                  value={hearing.budget}
                  onChange={(v) => updateField("budget", v)}
                  placeholder="例: 10万円〜20万円"
                />
                <Field
                  label="納期"
                  value={hearing.deadline}
                  onChange={(v) => updateField("deadline", v)}
                  placeholder="例: 2週間後、来月末まで"
                />
                <Field
                  label="動画の長さ"
                  value={hearing.videoLength}
                  onChange={(v) => updateField("videoLength", v)}
                  placeholder="例: 30秒、1分、3-5分"
                />
                <Field
                  label="本数"
                  value={hearing.quantity}
                  onChange={(v) => updateField("quantity", v)}
                  placeholder="例: 1本、月4本（定期）"
                />
              </div>
            </Section>

            <Section title="素材・要望">
              <TextArea
                label="既存素材"
                value={hearing.existingMaterials}
                onChange={(v) => updateField("existingMaterials", v)}
                placeholder="撮影済み素材の有無、ロゴ・ブランドガイドラインなど"
              />
              <Field
                label="参考動画"
                value={hearing.referenceVideos}
                onChange={(v) => updateField("referenceVideos", v)}
                placeholder="イメージに近い動画のURLや説明"
              />
              <Field
                label="トーン&マナー"
                value={hearing.toneAndManner}
                onChange={(v) => updateField("toneAndManner", v)}
                placeholder="例: 高級感、カジュアル、ポップ、シック..."
              />
              <TextArea
                label="特別な要望"
                value={hearing.specialRequests}
                onChange={(v) => updateField("specialRequests", v)}
                placeholder="その他の要望（ナレーション、BGM、字幕、モーショングラフィックス等）"
              />
            </Section>

            <Section title="現状の課題">
              <TextArea
                label="現在の課題"
                value={hearing.currentChallenges}
                onChange={(v) => updateField("currentChallenges", v)}
                placeholder="動画施策における現在の課題や困りごと"
              />
              <TextArea
                label="競合情報"
                value={hearing.competitorInfo}
                onChange={(v) => updateField("competitorInfo", v)}
                placeholder="競合他社の動画施策について知っていること"
              />
              <Field
                label="KPI / 成果指標"
                value={hearing.kpi}
                onChange={(v) => updateField("kpi", v)}
                placeholder="例: 再生回数10万回、CV率2%向上、フォロワー1000人増..."
              />
            </Section>

            <div className="flex justify-end pt-4">
              <button
                onClick={generateStrategy}
                disabled={loading || !hearing.clientName || !hearing.videoPurpose}
                className="px-8 py-3 bg-(--primary) text-white rounded-lg font-medium hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> AI戦略を生成中...
                  </span>
                ) : (
                  "AIで戦略を立案する →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Strategy */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white border border-(--border) rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">AI戦略分析結果</h2>
                <button
                  onClick={() => copyToClipboard(strategy)}
                  className="text-sm text-(--primary) hover:underline cursor-pointer"
                >
                  コピー
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={strategy} />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-(--border) rounded-lg text-(--muted) hover:bg-(--accent) transition-colors cursor-pointer"
              >
                ← ヒアリングに戻る
              </button>
              <button
                onClick={generateProposal}
                disabled={loading}
                className="px-8 py-3 bg-(--primary) text-white rounded-lg font-medium hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> 提案書を生成中...
                  </span>
                ) : (
                  "提案書を作成する →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Proposal */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white border border-(--border) rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">提案書</h2>
                <button
                  onClick={() => copyToClipboard(proposal)}
                  className="text-sm text-(--primary) hover:underline cursor-pointer"
                >
                  コピー
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={proposal} />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-(--border) rounded-lg text-(--muted) hover:bg-(--accent) transition-colors cursor-pointer"
              >
                ← 戦略に戻る
              </button>
              <button
                onClick={resetAll}
                className="px-8 py-3 bg-(--success) text-white rounded-lg font-medium hover:opacity-90 transition-colors cursor-pointer"
              >
                新規ヒアリングを開始
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-(--border) rounded-lg p-6">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b border-(--border)">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-(--foreground) mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent bg-white"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-(--foreground) mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent resize-y bg-white"
      />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="list-disc pl-5 my-2 space-y-1"
        >
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={i} className="text-2xl font-bold mt-6 mb-3">
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl font-bold mt-5 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="text-base font-semibold mt-3 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      );
    } else if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2));
    } else if (line.startsWith("---")) {
      flushList();
      elements.push(<hr key={i} className="my-4 border-(--border)" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-sm leading-relaxed my-2">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

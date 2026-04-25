"use client";

import { useState } from "react";

type IssueCategory =
  | "response_time"
  | "missing_confirmation"
  | "unauthorized_decision"
  | "scope"
  | "tone"
  | "hearing";

interface ReviewIssue {
  category: IssueCategory;
  severity: "high" | "medium" | "low";
  quote: string;
  timestamp?: string | null;
  problem: string;
  suggestion: string;
  exampleReply?: string | null;
}

interface ReviewResult {
  editorSpeaker: string;
  editorReasoning: string;
  summary: string;
  strengths: string[];
  issues: ReviewIssue[];
  nextActions: string[];
}

interface ApiResponse {
  result: ReviewResult;
  speakerMap: Record<string, string>;
  maskNote: string;
}

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  response_time: "レスポンス時間",
  missing_confirmation: "確認漏れ",
  unauthorized_decision: "未Fix要件の勝手な判断",
  scope: "スコープ/金額/納期の線引き",
  tone: "文面のトーン・敬語",
  hearing: "ヒアリング不足",
};

const CATEGORY_COLOR: Record<IssueCategory, string> = {
  response_time: "bg-amber-50 border-amber-200 text-amber-800",
  missing_confirmation: "bg-blue-50 border-blue-200 text-blue-800",
  unauthorized_decision: "bg-rose-50 border-rose-200 text-rose-800",
  scope: "bg-purple-50 border-purple-200 text-purple-800",
  tone: "bg-slate-50 border-slate-200 text-slate-800",
  hearing: "bg-teal-50 border-teal-200 text-teal-800",
};

const SEVERITY_LABEL = {
  high: "要改善(高)",
  medium: "要改善(中)",
  low: "参考",
} as const;

const SEVERITY_COLOR = {
  high: "bg-red-600 text-white",
  medium: "bg-orange-500 text-white",
  low: "bg-slate-400 text-white",
} as const;

export default function ChatReviewPage() {
  const [chatLog, setChatLog] = useState("");
  const [context, setContext] = useState("");
  const [editorHint, setEditorHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [showMap, setShowMap] = useState(false);

  const analyze = async () => {
    setError("");
    const text = chatLog.trim();
    if (!text) {
      setError("チャット履歴を貼り付けてください");
      return;
    }
    if (text.length > 40000) {
      setError("チャット履歴が長すぎます(4万字以内に分割してください)");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/chat-review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatLog: text,
          context,
          editorHint,
        }),
      });
      const rawText = await res.text();
      if (!res.ok) {
        let apiError = "";
        try {
          const parsed = JSON.parse(rawText) as { error?: string };
          apiError = parsed.error || "";
        } catch {
          // JSONでなければ先頭200字をそのまま出す
          apiError = rawText.slice(0, 200);
        }
        throw new Error(
          `添削に失敗しました (HTTP ${res.status})${apiError ? `\n${apiError}` : ""}`
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          クライアントワーク添削ツール
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          クライアントとのやり取りを貼り付けると、自分側で直すべきポイントをAIが指摘します
        </p>
      </div>
        {/* 説明セクション */}
        <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-(--foreground) mb-2">
              このツールでできること
            </h2>
            <p className="text-sm text-(--foreground) leading-relaxed">
              Chatwork / Slack / LINE などクライアントとのチャット履歴を丸ごと貼り付けると、
              <strong>あなた(動画編集者側)の対応</strong>
              について、見落としがちな改善点を AI が時系列を読み取った上で指摘します。
              「あの時こう返しておけば…」をあとから気付くのではなく、
              次の案件で同じミスを繰り返さないための振り返りツールです。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-(--foreground) mb-2">
              添削される 6つの観点
            </h3>
            <ul className="text-sm text-(--foreground) space-y-2 leading-relaxed">
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold mr-2">
                  1. レスポンス時間
                </span>
                時刻情報を読み取り、
                <strong>
                  「ここは早く返すべきだった」
                </strong>
                というタイミングの遅れを指摘します。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold mr-2">
                  2. 確認漏れ
                </span>
                クライアントからの質問や依頼に対して、
                <strong>明確に返答していない・スルーしている</strong>
                箇所を洗い出します。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-semibold mr-2">
                  3. 未Fix要件の勝手な判断
                </span>
                まだ合意していない仕様・方向性を、
                <strong>
                  編集者が自分で決めて進めてしまっている
                </strong>
                箇所を指摘します。あとから「聞いてない」を防ぐための項目です。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold mr-2">
                  4. スコープ/金額/納期の線引き
                </span>
                無償追加・スコープ外作業を曖昧に受け入れてしまっている、
                金額や納期の変更を明文化できていない、等の
                <strong>線引きの甘さ</strong>
                を指摘します。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-semibold mr-2">
                  5. 文面のトーン・敬語
                </span>
                丁寧さ・受け身すぎる姿勢・逆に強すぎる言い回しなど、
                <strong>文面の印象</strong>
                について改善案を提示します。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xs font-semibold mr-2">
                  6. ヒアリング不足
                </span>
                本来確認しておくべきだったのに聞き漏らしている項目
                (目的・修正回数・納品形式・素材の所在 等)を
                <strong>質問リスト形式</strong>
                で補完します。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-(--foreground) mb-2">
              プライバシーについて
            </h3>
            <p className="text-sm text-(--foreground) leading-relaxed">
              貼り付けたチャット履歴は、サーバー側で
              <strong>発言者名を自動検出 →「[話者A]」「[話者B]」に置換</strong>
              してから AI に送信されます。
              メールアドレスや電話番号も
              <code className="px-1.5 py-0.5 bg-(--accent) rounded text-xs mx-0.5">
                [email]
              </code>
              <code className="px-1.5 py-0.5 bg-(--accent) rounded text-xs mx-0.5">
                [phone]
              </code>
              に自動置換されます。送信後も履歴の保存は行いません。
              ただし<strong>本文中で言及される第三者名や社名までは機械検出が難しい</strong>ため、
              機密性の高い案件では貼り付け前に該当箇所を手動で伏せ字にしてください。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-(--foreground) mb-2">
              使い方(3ステップ)
            </h3>
            <ol className="text-sm text-(--foreground) list-decimal list-inside space-y-1 leading-relaxed">
              <li>
                Chatwork / Slack / LINE
                などから、対象のやり取りを一定期間分まとめてコピー
                (時刻情報も含めるのがおすすめ)
              </li>
              <li>下の入力欄に貼り付け、必要なら案件概要の補足を記入</li>
              <li>
                「添削を実行」ボタンを押すと、観点別の指摘と次の一手が表示されます
              </li>
            </ol>
          </div>

          <div className="border-t border-(--border) pt-3 text-xs text-(--muted) leading-relaxed">
            ※
            AIの判断はあくまで参考です。明らかに事実誤認がある場合は、
            チャット履歴の前後文脈を追加するか、案件補足欄で状況を伝えると精度が上がります。
          </div>
        </section>

        {/* 入力フォーム */}
        <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                チャット履歴 <span className="text-red-600">*</span>
              </label>
              <textarea
                value={chatLog}
                onChange={(e) => setChatLog(e.target.value)}
                placeholder={`例:\n田中 2025/04/20 14:32\nお世話になります。次回納品の件ですが、BGMを別パターンも試していただけますか?\n\n自分 2025/04/21 11:08\n承知しました、進めておきます。\n\n田中 2025/04/21 14:40\nそれと、冒頭のテロップですが、やっぱり赤ではなく白でお願いします。\n...`}
                rows={14}
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm font-mono focus:outline-none focus:border-(--primary)"
              />
              <p className="text-xs text-(--muted) mt-1">
                発言者名・時刻がそのまま読み取れる形式のままで OK です ({chatLog.length.toLocaleString()} / 40,000 字)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                案件の補足(任意)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="例)法人向けPR動画の案件、納期1ヶ月、修正2回まで、BGM差し替えは別途見積り合意済み 等"
                rows={2}
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
              <p className="text-xs text-(--muted) mt-1">
                AIがスコープや線引きを正しく判断するための前提情報です。入力しなくても動きます。
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                自分の発言者名(任意)
              </label>
              <input
                type="text"
                value={editorHint}
                onChange={(e) => setEditorHint(e.target.value)}
                placeholder="例)自分 / 山田"
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
              <p className="text-xs text-(--muted) mt-1">
                未入力でもAIが自動判定します。判定がずれる場合のみ指定してください。
              </p>
            </div>

            <button
              type="button"
              onClick={analyze}
              disabled={loading || !chatLog.trim()}
              className="w-full rounded-lg bg-(--primary) text-white py-3 font-semibold hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "添削中…" : "添削を実行"}
            </button>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 whitespace-pre-wrap">
                {error}
              </p>
            )}
          </div>
        </section>

        {loading && !data && (
          <div className="text-center py-12 rounded-xl border border-(--border) bg-white">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-(--border) border-t-(--primary)" />
            <p className="text-sm text-(--muted) mt-4">
              AIが時系列とやり取りを読み込んでいます… 30〜60秒ほどかかります
            </p>
          </div>
        )}

        {/* 結果 */}
        {data && (
          <section className="space-y-4">
            <div className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-(--foreground) mb-1">
                    総評
                  </h2>
                  <p className="text-xs text-(--muted)">
                    編集者と判定: {" "}
                    <span className="font-mono font-semibold">
                      {data.result.editorSpeaker}
                    </span>
                    {data.speakerMap[data.result.editorSpeaker]
                      ? ` (= ${data.speakerMap[data.result.editorSpeaker]})`
                      : ""}
                    　— {data.result.editorReasoning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  className="text-xs text-(--primary) hover:underline"
                >
                  {showMap ? "マスキング詳細を隠す" : "マスキング詳細を見る"}
                </button>
              </div>

              {showMap && (
                <div className="mt-3 p-3 bg-(--accent) rounded-lg text-xs text-(--foreground)">
                  <p className="mb-1.5">{data.maskNote}</p>
                  {Object.entries(data.speakerMap).length > 0 && (
                    <ul className="space-y-0.5 font-mono">
                      {Object.entries(data.speakerMap).map(([label, name]) => (
                        <li key={label}>
                          {label} ← {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="mt-4 text-sm text-(--foreground) leading-relaxed whitespace-pre-wrap">
                {data.result.summary}
              </p>
            </div>

            {data.result.strengths.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <h2 className="text-base font-bold text-green-900 mb-2">
                  良かった点
                </h2>
                <ul className="text-sm text-green-900 space-y-1.5 list-disc list-inside leading-relaxed">
                  {data.result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.result.issues.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-(--foreground)">
                  改善ポイント ({data.result.issues.length}件)
                </h2>
                {data.result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border-2 p-5 ${CATEGORY_COLOR[issue.category]}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-white/60">
                        {CATEGORY_LABEL[issue.category]}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${SEVERITY_COLOR[issue.severity]}`}
                      >
                        {SEVERITY_LABEL[issue.severity]}
                      </span>
                      {issue.timestamp && (
                        <span className="text-xs font-mono text-(--muted) bg-white/60 px-2 py-1 rounded">
                          {issue.timestamp}
                        </span>
                      )}
                    </div>

                    {issue.quote && (
                      <blockquote className="border-l-4 border-current pl-3 py-1 mb-3 text-sm text-(--foreground) bg-white/40 rounded-r italic">
                        「{issue.quote}」
                      </blockquote>
                    )}

                    <div className="text-sm text-(--foreground) space-y-2 leading-relaxed">
                      <div>
                        <span className="font-bold">問題点: </span>
                        {issue.problem}
                      </div>
                      <div>
                        <span className="font-bold">改善策: </span>
                        {issue.suggestion}
                      </div>
                      {issue.exampleReply && (
                        <div className="mt-3 p-3 bg-white/70 rounded-lg border border-current/20">
                          <div className="text-xs font-bold mb-1 text-(--muted)">
                            改善後の返信例
                          </div>
                          <p className="text-sm text-(--foreground) whitespace-pre-wrap">
                            {issue.exampleReply}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.result.nextActions.length > 0 && (
              <div className="rounded-xl border border-(--primary)/30 bg-blue-50 p-6">
                <h2 className="text-base font-bold text-(--primary) mb-2">
                  次にやるべきこと
                </h2>
                <ul className="text-sm text-(--foreground) space-y-1.5 list-decimal list-inside leading-relaxed">
                  {data.result.nextActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
    </div>
  );
}

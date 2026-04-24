"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import {
  formatMaxAudioLabel,
  formatWhisperMaxAudioLabel,
  getMaxAudioUploadBytes,
  WHISPER_MAX_AUDIO_BYTES,
} from "@/lib/audioUploadLimits";
import type { HearingData, ProjectMode } from "@/types";

/** ヒアリングフォームの初期値（空欄スタート。各フィールドの placeholder が見えるように） */
const initialHearing: HearingData = {
  projectMode: "single_production",
  clientName: "",
  industry: "",
  businessOverview: "",
  videoType: "",
  videoPurpose: "",
  targetAudience: "",
  publishPlatform: "",
  budget: "",
  deadline: "",
  videoLength: "",
  quantity: "",
  existingMaterials: "",
  referenceVideos: "",
  toneAndManner: "",
  specialRequests: "",
  currentChallenges: "",
  competitorInfo: "",
  kpi: "",
};

type EntryMode = "choose" | "manual" | "audio";

export default function ProposalGeneratorPage() {
  const [entryMode, setEntryMode] = useState<EntryMode>("choose");
  const [step, setStep] = useState(1);
  const [hearing, setHearing] = useState<HearingData>(initialHearing);
  const [strategy, setStrategy] = useState("");
  const [proposal, setProposal] = useState("");
  /** 音声ルート: Whisper 後の文字起こし（編集可） */
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  /** 音声の文字起こし処理中（見出し横のスピナー用。右下ボタンとは分担） */
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  /** BLOB_READ_WRITE_TOKEN があるとき true（大きい音声は Blob 経由） */
  const [clientBlobUpload, setClientBlobUpload] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proposal/upload-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { clientBlobUpload?: boolean }) => {
        if (!cancelled) setClientBlobUpload(Boolean(d.clientBlobUpload));
      })
      .catch(() => {
        if (!cancelled) setClientBlobUpload(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stepLabels =
    entryMode === "audio"
      ? ["音声", "戦略立案", "提案書作成"]
      : ["ヒアリング", "戦略立案", "提案書作成"];

  const updateField = (field: keyof HearingData, value: string) => {
    setHearing((prev) => ({ ...prev, [field]: value }));
  };

  const setProjectMode = (mode: ProjectMode) => {
    setHearing((prev) => ({ ...prev, projectMode: mode }));
  };

  const transcribeAudio = async (file: File) => {
    setError("");

    let useBlob = clientBlobUpload;
    if (useBlob === null) {
      try {
        const cfg = await fetch("/api/proposal/upload-config", {
          cache: "no-store",
        }).then((r) => r.json());
        useBlob = Boolean(cfg.clientBlobUpload);
        setClientBlobUpload(useBlob);
      } catch {
        useBlob = false;
        setClientBlobUpload(false);
      }
    }

    const maxBytes = useBlob
      ? WHISPER_MAX_AUDIO_BYTES
      : getMaxAudioUploadBytes();
    const maxLabel = useBlob
      ? formatWhisperMaxAudioLabel()
      : formatMaxAudioLabel();

    if (file.size > maxBytes) {
      setError(
        useBlob
          ? `ファイルが大きすぎます。文字起こし（Whisper）は ${maxLabel} までです。録音を分割するか、ビットレートを下げて書き出してください。`
          : `ファイルが大きすぎます（${maxLabel} 以下にしてください）。Vercel 本番ではリクエスト全体が約 4.5MB 上限のため 413 になります。音声を短くする・ビットレートを下げて書き出す・分割するか、Vercel Blob（BLOB_READ_WRITE_TOKEN）を設定するとより大きなファイルを送れます。自ホスト時は NEXT_PUBLIC_MAX_AUDIO_BYTES を調整してください。`
      );
      return;
    }

    setLoading(true);
    setTranscribing(true);
    try {
      let res: Response;

      if (useBlob) {
        const safe =
          file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "audio";
        const pathname = `proposal-audio/${Date.now()}-${safe}`;
        const blobResult = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/proposal/blob-upload",
          contentType: file.type || undefined,
          multipart: file.size > 4 * 1024 * 1024,
        });
        res = await fetch("/api/proposal/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ url: blobResult.url }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/proposal/transcribe", {
          method: "POST",
          body: fd,
          credentials: "same-origin",
        });
      }

      const rawText = await res.text();
      let data: { error?: string; detail?: string; text?: string } = {};
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        if (!res.ok) {
          if (res.status === 413) {
            throw new Error(
              `ファイルが大きすぎます（HTTP 413）。ホスティングのリクエストサイズ上限に達しています。${formatMaxAudioLabel()} 以下のファイルを選ぶか、音声を圧縮・分割するか、Vercel で BLOB_READ_WRITE_TOKEN を設定して Blob 経由でアップロードしてください。`
            );
          }
          throw new Error(
            `文字起こしに失敗しました（HTTP ${res.status}）。認証・ネットワーク・サーバー設定を確認してください。`
          );
        }
      }
      if (!res.ok) {
        const base =
          typeof data.error === "string"
            ? data.error
            : "文字起こしに失敗しました";
        const detail =
          typeof data.detail === "string" ? `（${data.detail}）` : "";
        throw new Error(`${base}${detail}`);
      }
      setTranscript(typeof data.text === "string" ? data.text : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      setTranscribing(false);
    }
  };

  const generateStrategy = async () => {
    setLoading(true);
    setError("");
    try {
      if (entryMode === "audio") {
        if (!transcript.trim()) {
          setError("文字起こしテキストがありません。音声をアップロードしてください。");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/proposal/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "strategy_from_transcript",
            transcript,
            projectMode: hearing.projectMode,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "戦略生成に失敗しました"
          );
        }
        setStrategy(data.result);
      } else {
        const res = await fetch("/api/proposal/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "strategy", hearingData: hearing }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "戦略生成に失敗しました"
          );
        }
        setStrategy(data.result);
      }
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
      if (entryMode === "audio") {
        const res = await fetch("/api/proposal/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "proposal_from_transcript",
            transcript,
            strategy,
            projectMode: hearing.projectMode,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "提案書生成に失敗しました"
          );
        }
        setProposal(data.result);
      } else {
        const res = await fetch("/api/proposal/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "proposal",
            hearingData: hearing,
            strategy,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "提案書生成に失敗しました"
          );
        }
        setProposal(data.result);
      }
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
    setEntryMode("choose");
    setStep(1);
    setHearing(initialHearing);
    setStrategy("");
    setProposal("");
    setTranscript("");
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
              Vi-Net動画編集者の総合サポートツール
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {entryMode === "choose" && (
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-(--foreground) text-center">
              入力方法を選んでください
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setEntryMode("manual");
                  setStep(1);
                }}
                className="text-left rounded-xl border border-(--border) bg-white p-6 shadow-sm hover:border-(--primary) hover:shadow-md transition-all cursor-pointer"
              >
                <span className="font-bold text-(--foreground)">
                  手入力でヒアリング
                </span>
                <p className="text-sm text-(--muted) mt-2 leading-relaxed">
                  フォームに沿って項目を入力し、戦略→提案書の順で生成します。
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode("audio");
                  setStep(1);
                  setTranscript("");
                }}
                className="text-left rounded-xl border border-(--border) bg-white p-6 shadow-sm hover:border-(--primary) hover:shadow-md transition-all cursor-pointer"
              >
                <span className="font-bold text-(--foreground)">
                  音声をアップロード
                </span>
                <p className="text-sm text-(--muted) mt-2 leading-relaxed">
                  ヒアリング音声を文字起こし（Whisper）し、内容をもとに戦略・提案書を生成します。
                </p>
              </button>
            </div>
          </div>
        )}

        {entryMode !== "choose" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {stepLabels.map((label, i) => {
              const num = i + 1;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      step >= num
                        ? "bg-(--primary) text-white"
                        : "bg-(--accent) text-(--muted)"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                      {step > num ? "✓" : num}
                    </span>
                    {label}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        step > num ? "bg-(--primary)" : "bg-(--border)"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {entryMode === "manual" && step === 1 && (
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

            <div className="flex flex-wrap justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 text-sm text-(--muted) border border-(--border) rounded-lg hover:bg-(--accent) cursor-pointer"
              >
                ← 入力方法に戻る
              </button>
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

        {entryMode === "audio" && step === 1 && (
          <div className="space-y-6">
            <Section title="案件の種類">
              <p className="text-sm text-(--muted) mb-4">
                音声の内容に合わせて、戦略・提案の観点を選びます（手入力モードと同じ2タイプ）。
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
                    定期投稿・シリーズ・チャンネル成長の文脈で分析・提案します。
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
                    1本完結・短期納品の文脈で分析・提案します。
                  </p>
                </button>
              </div>
            </Section>

            <Section
              title="音声ファイル"
              titleExtra={
                transcribing ? (
                  <span className="inline-flex items-center gap-2 text-sm font-normal text-(--primary) ml-1">
                    <Spinner />
                    <span className="text-(--muted)">文字起こし中…</span>
                  </span>
                ) : null
              }
            >
              <p className="text-sm text-(--muted) mb-3">
                mp3 / m4a / wav / webm など。日本語は OpenAI Whisper
                で文字起こしします。
                {clientBlobUpload ? (
                  <>
                    <strong className="text-(--foreground) font-medium">
                      {" "}
                      1 ファイルあたり約 {formatWhisperMaxAudioLabel()} まで
                    </strong>
                    （OpenAI Whisper の上限。Vercel Blob
                    経由のためリクエストサイズの 413 は出にくい）。
                  </>
                ) : (
                  <>
                    <strong className="text-(--foreground) font-medium">
                      {" "}
                      1 ファイルあたり {formatMaxAudioLabel()} 以下
                    </strong>
                    を推奨します（直接アップロード。Vercel では約 4.5MB
                    を超えると HTTP 413）。大きなファイルはダッシュボードで
                    Blob を作成し BLOB_READ_WRITE_TOKEN を設定してください。
                  </>
                )}
              </p>
              <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-(--border) rounded-xl p-8 bg-white cursor-pointer hover:border-(--primary)/50 transition-colors">
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.webm,.mpeg,.mp4"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void transcribeAudio(f);
                    e.target.value = "";
                  }}
                />
                <span className="text-(--primary) font-medium">
                  クリックして音声を選択
                </span>
                <span className="text-xs text-(--muted) mt-1">
                  またはファイルをドラッグ（ブラウザにより挙動が異なります）
                </span>
              </label>
            </Section>

            <Section title="文字起こし（編集できます）">
              <div>
                <label className="block text-sm font-medium text-(--foreground) mb-1">
                  Whisperの結果
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="音声をアップロードするとここに表示されます。誤認識があれば直接修正してください。"
                  rows={14}
                  className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent resize-y bg-white min-h-[200px]"
                />
              </div>
            </Section>

            <div className="flex flex-wrap justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 text-sm text-(--muted) border border-(--border) rounded-lg hover:bg-(--accent) cursor-pointer"
              >
                ← 入力方法に戻る
              </button>
              <button
                type="button"
                onClick={generateStrategy}
                disabled={loading || !transcript.trim()}
                className="px-8 py-3 bg-(--primary) text-white rounded-lg font-medium hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading && !transcribing ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> 処理中...
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
                {entryMode === "audio"
                  ? "← 音声・文字起こしに戻る"
                  : "← ヒアリングに戻る"}
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
  titleExtra,
  children,
}: {
  title: string;
  titleExtra?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-(--border) rounded-lg p-6">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b border-(--border) flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{title}</span>
        {titleExtra}
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

"use client";

import { useEffect, useState } from "react";

const SITUATIONS = [
  "感謝・お礼",
  "お祝い・激励・良い報告",
  "依頼・相談",
  "提案・打診",
  "報告・連絡",
  "返信・確認",
  "謝罪・お詫び",
  "辞退・お断り",
  "お悔やみ・お見舞い",
  "その他",
];

const TONES = [
  "硬め（ビジネス文書調）",
  "温かめ（柔らかい敬語）",
  "フランク（カジュアル）",
];

const EXCLAIMS = ["使わない", "控えめに（挨拶部分のみ）", "積極的に使う"];

const EMOJIS = [
  "使わない",
  "お辞儀系のみ（🙏 / 🙇‍♂️ / m(_ _)m）",
  "表情系もOK（😊 👍 など）",
];

const TEMP_OPTIONS = [
  { value: "1", label: "1（事務的）" },
  { value: "2", label: "2" },
  { value: "3", label: "3（普通）" },
  { value: "4", label: "4" },
  { value: "5", label: "5（熱量MAX）" },
];

const LS_KEYS = {
  who: "eq_who",
  relation: "eq_relation",
  depth: "eq_depth",
  situation: "eq_situation",
  background: "eq_background",
  tone: "eq_tone",
  exclaim: "eq_exclaim",
  emoji: "eq_emoji",
  temp: "eq_temp",
} as const;

export default function EqRewritePage() {
  const [who, setWho] = useState("");
  const [relation, setRelation] = useState("");
  const [depth, setDepth] = useState("");
  const [situation, setSituation] = useState("");
  const [background, setBackground] = useState("");
  const [tone, setTone] = useState("温かめ（柔らかい敬語）");
  const [exclaim, setExclaim] = useState("控えめに（挨拶部分のみ）");
  const [emoji, setEmoji] = useState("お辞儀系のみ（🙏 / 🙇‍♂️ / m(_ _)m）");
  const [temp, setTemp] = useState("3");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // localStorage からヒアリング項目を復元
  useEffect(() => {
    try {
      const get = (k: string) => localStorage.getItem(k) ?? "";
      if (get(LS_KEYS.who)) setWho(get(LS_KEYS.who));
      if (get(LS_KEYS.relation)) setRelation(get(LS_KEYS.relation));
      if (get(LS_KEYS.depth)) setDepth(get(LS_KEYS.depth));
      if (get(LS_KEYS.situation)) setSituation(get(LS_KEYS.situation));
      if (get(LS_KEYS.background)) setBackground(get(LS_KEYS.background));
      if (get(LS_KEYS.tone)) setTone(get(LS_KEYS.tone));
      if (get(LS_KEYS.exclaim)) setExclaim(get(LS_KEYS.exclaim));
      if (get(LS_KEYS.emoji)) setEmoji(get(LS_KEYS.emoji));
      if (get(LS_KEYS.temp)) setTemp(get(LS_KEYS.temp));
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  // 値変更時に保存
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.who, who);
      localStorage.setItem(LS_KEYS.relation, relation);
      localStorage.setItem(LS_KEYS.depth, depth);
      localStorage.setItem(LS_KEYS.situation, situation);
      localStorage.setItem(LS_KEYS.background, background);
      localStorage.setItem(LS_KEYS.tone, tone);
      localStorage.setItem(LS_KEYS.exclaim, exclaim);
      localStorage.setItem(LS_KEYS.emoji, emoji);
      localStorage.setItem(LS_KEYS.temp, temp);
    } catch {
      // ignore
    }
  }, [who, relation, depth, situation, background, tone, exclaim, emoji, temp]);

  const rewrite = async () => {
    setError("");
    const text = inputText.trim();
    if (!text) {
      setError("リライトしたい文章を入力してください");
      return;
    }
    setLoading(true);
    setResult("");
    setCopied(false);
    try {
      const res = await fetch("/api/eq-rewrite/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText: text,
          who,
          relation,
          depth,
          situation,
          background,
          tone,
          exclaim,
          emoji,
          temp,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let apiError = "";
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          apiError = parsed.error || "";
        } catch {
          apiError = raw.slice(0, 200);
        }
        throw new Error(
          `リライトに失敗しました (HTTP ${res.status})${apiError ? `\n${apiError}` : ""}`
        );
      }
      const payload = JSON.parse(raw) as { result?: string };
      if (!payload.result) {
        throw new Error("AIの応答が空でした");
      }
      setResult(payload.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          クライアントメッセージ EQ リライト
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          そのまま送ると冷たく届きそうな文面を、相手に温度が伝わる EQ 高めの文章にリライトします
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">
          このツールでできること
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          テキストは感情が <strong>2割減</strong> で届きます。書き手が「普通」のつもりでも、
          読み手には「冷たい」「怒ってる？」と伝わるリスクがあります。
          このツールは、相手・関係性・状況の情報をもとに、
          <strong>感謝先出し／相手主語化／選択権を渡す／前提を肯定／未来へ繋ぐ</strong>
          といった EQ 設計の法則を当てはめ、温度感を整えてリライトします。
        </p>
      </section>

      {/* ヒアリング情報 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">
            ① 相手・状況
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            分かる範囲でOK。空欄でも動きます（AIが推測します）
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="相手の呼び方" value={who} onChange={setWho} placeholder="例：田中さん／山田部長" />
          <Field
            label="関係性"
            value={relation}
            onChange={setRelation}
            placeholder="例：上司／クライアント／取引先"
          />
          <Field
            label="関係の深さ"
            value={depth}
            onChange={setDepth}
            placeholder="例：採用直後／3ヶ月／長年"
          />
          <SelectField
            label="用途カテゴリ"
            value={situation}
            onChange={setSituation}
            options={[{ value: "", label: "指定なし" }, ...SITUATIONS.map((v) => ({ value: v, label: v }))]}
          />
        </div>

        <TextAreaField
          label="補足・背景・ここまでの流れ"
          value={background}
          onChange={setBackground}
          placeholder="例：田中さんとは前回のミーティングで〇〇の件を相談していて、その後の連絡。家庭の事情で当初の予定通りに進められなくなった、など"
          rows={3}
        />
      </section>

      {/* 文体・温度 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">② 文体・温度</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField
            label="普段の文体"
            value={tone}
            onChange={setTone}
            options={[
              { value: "", label: "指定なし" },
              ...TONES.map((v) => ({ value: v, label: v })),
            ]}
          />
          <SelectField
            label="「！」の使用"
            value={exclaim}
            onChange={setExclaim}
            options={[
              { value: "", label: "指定なし" },
              ...EXCLAIMS.map((v) => ({ value: v, label: v })),
            ]}
          />
          <SelectField
            label="絵文字／顔文字"
            value={emoji}
            onChange={setEmoji}
            options={[
              { value: "", label: "指定なし" },
              ...EMOJIS.map((v) => ({ value: v, label: v })),
            ]}
          />
          <SelectField
            label="温度感（1=事務的 / 5=熱量MAX）"
            value={temp}
            onChange={setTemp}
            options={TEMP_OPTIONS}
          />
        </div>
      </section>

      {/* 入力 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">
          ③ リライトしたい文章
        </h2>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ここに元の文章を貼り付けてください…"
          rows={10}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#2651A6] focus:bg-white focus:ring-2 focus:ring-[#52B5F2]/30"
        />
        <p className="text-xs text-slate-500 -mt-2">
          {inputText.length.toLocaleString()} / 8,000 字
        </p>

        <button
          type="button"
          onClick={rewrite}
          disabled={loading || !inputText.trim()}
          className="w-full rounded-lg bg-[#2651A6] text-white py-3 font-semibold hover:bg-[#1E3F80] active:bg-[#163066] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "リライト中…" : "リライトする"}
        </button>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 whitespace-pre-wrap">
            {error}
          </p>
        )}
      </section>

      {loading && !result && (
        <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-[#2651A6]" />
          <p className="text-sm text-slate-500 mt-4">
            AIが温度感を整えてリライトしています…
          </p>
        </div>
      )}

      {result && (
        <section className="rounded-xl border-2 border-[#2651A6]/30 bg-[#EAF0F9] p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-[#0F172A]">
              リライト結果
            </h2>
            <button
              type="button"
              onClick={copy}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                copied
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
              }`}
            >
              {copied ? "✓ コピー済み" : "コピー"}
            </button>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 whitespace-pre-wrap text-sm text-[#0F172A] leading-relaxed">
            {result}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── 入力部品 ─────────────────────────────────────────

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
      <label className="block text-sm font-medium text-[#0F172A] mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#2651A6] focus:bg-white focus:ring-2 focus:ring-[#52B5F2]/30"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#2651A6] focus:bg-white focus:ring-2 focus:ring-[#52B5F2]/30"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#2651A6] focus:bg-white focus:ring-2 focus:ring-[#52B5F2]/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

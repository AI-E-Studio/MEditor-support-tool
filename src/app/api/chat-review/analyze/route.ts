import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

// ---- 型 ----
export type IssueCategory =
  | "response_time"
  | "missing_confirmation"
  | "unauthorized_decision"
  | "scope"
  | "tone"
  | "hearing";

export interface ReviewIssue {
  category: IssueCategory;
  severity: "high" | "medium" | "low";
  quote: string;
  timestamp?: string | null;
  problem: string;
  suggestion: string;
  exampleReply?: string | null;
}

export interface ReviewResult {
  editorSpeaker: string;
  editorReasoning: string;
  summary: string;
  strengths: string[];
  issues: ReviewIssue[];
  nextActions: string[];
}

// ---- 発言者抽出 & マスキング ----

/**
 * ログから発言者名の候補を抽出する（ヒューリスティック正規表現ベース）。
 * Chatwork / Slack / LINE / 汎用「名前:」形式に対応。
 */
function detectSpeakers(log: string): string[] {
  const counts = new Map<string, number>();
  const lines = log.split(/\r?\n/);

  const patterns: RegExp[] = [
    // 「名前: 」「名前： 」始まりの行
    /^([^\s:：][^:：\n]{0,29}?)[:：]\s/,
    // 「名前 2024/03/21」「名前 2024-03-21」始まり (Chatwork風ヘッダ)
    /^([^\s\d][^\s]{0,29})\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
    // 「名前  14:30」 (Slackの氏名＋時刻、スペース2個以上)
    /^([^\s\d][^\s]{0,29})\s{2,}\d{1,2}:\d{2}/,
    // 「14:30 名前」「14:30\t名前」 (LINEエクスポート等)
    /^\d{1,2}:\d{2}[\s\t]+([^\s\t\d][^\n\t]{0,29})/,
    // 「[14:30] 名前」
    /^\[\d{1,2}:\d{2}[^\]]*\]\s+([^\s\d][^\n]{0,29})/,
  ];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    for (const p of patterns) {
      const m = line.match(p);
      if (m && m[1]) {
        const name = m[1].trim().replace(/[「『]/g, "");
        if (
          name.length >= 1 &&
          name.length <= 30 &&
          !/^[\d:/\-\s]+$/.test(name)
        ) {
          counts.set(name, (counts.get(name) || 0) + 1);
          break;
        }
      }
    }
  }

  // 2回以上出現した候補を発言者とみなす(ヘッダの誤検出を間引く)
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface MaskResult {
  masked: string;
  speakerMap: Record<string, string>; // ラベル -> 元の名前
  note: string;
}

function maskLog(log: string): MaskResult {
  const speakers = detectSpeakers(log);
  const speakerMap: Record<string, string> = {};
  let masked = log;

  // 文字数が長いものから置換 (部分一致で短い名前が先に消えるのを防ぐ)
  const ordered = [...speakers].sort((a, b) => b.length - a.length);
  ordered.forEach((name, idx) => {
    const label = `[話者${String.fromCharCode(65 + idx)}]`; // A, B, C, ...
    speakerMap[label] = name;
    masked = masked.replace(new RegExp(escapeRegex(name), "g"), label);
  });

  // メール・電話番号の簡易マスク
  masked = masked.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]");
  masked = masked.replace(
    /\b0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}\b/g,
    "[phone]"
  );

  const note = speakers.length
    ? `検出された発言者: ${speakers.length}名 (マスク済み)`
    : "発言者を自動検出できませんでした。固有名は後段のAI側でも伏せるよう指示しています。";

  return { masked, speakerMap, note };
}

// ---- Claude 呼び出し ----

const SYSTEM_PROMPT = `あなたは、日本で活動する動画編集フリーランスのコミュニケーション専門コーチです。
クライアントとの**チャット履歴(マスク済み)**を読み、編集者側(=依頼を受けて制作する側)の対応について、改善点を建設的に添削してください。

## 添削する観点 (6つ)
1. **response_time (レスポンス時間)**
   時刻情報から、相手のメッセージに対する返信が遅すぎる/放置されている箇所を指摘する。
   目安: 平日の業務時間帯で24時間超の放置 / 重要な確認依頼に半日以上無反応 等。
2. **missing_confirmation (確認漏れ)**
   クライアントからの質問・要望・指示のうち、編集者が明確に返答していない or スルーしている箇所。
3. **unauthorized_decision (未Fixの勝手な判断)**
   クライアントとまだ合意していない仕様・方針・スコープを、編集者が自己判断で確定したかのように進めてしまっている箇所。
4. **scope (スコープ/金額/納期の線引き不足)**
   無償追加・スコープ外作業を黙って受け入れている / 金額や納期の条件変更を曖昧にしている箇所。
5. **tone (文面のトーン・敬語)**
   敬語・丁寧さ・受け身すぎる姿勢・逆に強すぎる言い回しなど。
6. **hearing (ヒアリング不足)**
   本来確認すべきだったが聞き漏らしている項目 (目的・納期・修正回数・納品形式・素材の所在 等)。

## 出力ルール
- **必ず JSON のみを出力**。前置き文章・マークダウンの囲みコードブロックは不要。
- 発言者名はマスク済みラベル(例: [話者A], [話者B])のまま参照する。新しい名前を発明しない。
- quote は原文から60字以内で抜粋。
- 過度に否定的にならず、建設的で具体的な改善提案にする。
- 該当する指摘がない観点は issues に含めなくてよい。
- 編集者が誰か自動判定し、editorSpeaker にそのラベルを返す。

## 出力JSONスキーマ
{
  "editorSpeaker": "[話者A]" など,
  "editorReasoning": "なぜその話者を編集者と判定したかの根拠 (1〜2文)",
  "summary": "全体の講評 (3〜6行の日本語)",
  "strengths": ["良かった点1", "良かった点2", ...],
  "issues": [
    {
      "category": "response_time" | "missing_confirmation" | "unauthorized_decision" | "scope" | "tone" | "hearing",
      "severity": "high" | "medium" | "low",
      "quote": "該当発言の抜粋 (60字以内)",
      "timestamp": "該当タイムスタンプ文字列 (無ければ null)",
      "problem": "何が問題か (日本語 1〜2文)",
      "suggestion": "どう改善すべきか (日本語 1〜2文)",
      "exampleReply": "改善後の模範的な返信文 (敬語・日本語) 無ければ null"
    }
  ],
  "nextActions": ["次にやるべきアクション1", "次にやるべきアクション2", ...]
}`;

function buildUserMessage(
  maskedLog: string,
  contextNote: string,
  maskNote: string
): string {
  const ctx = contextNote.trim()
    ? `\n\n## 案件の補足(任意)\n${contextNote.trim()}`
    : "";
  return `以下はクライアントとのチャット履歴です。発言者名はマスク済みです。

## マスク状況
${maskNote}${ctx}

## チャット履歴(マスク済み)
${"```"}
${maskedLog}
${"```"}

JSON で出力してください。`;
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  // ```json ... ``` で囲まれているケース
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // 最初の { から最後の } まで切り出す
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return null;
}

// ---- ハンドラ ----

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { chatLog, context, editorHint } = body as {
      chatLog?: string;
      context?: string;
      editorHint?: string;
    };

    const raw = typeof chatLog === "string" ? chatLog.trim() : "";
    if (!raw) {
      return NextResponse.json(
        { error: "チャット履歴を貼り付けてください" },
        { status: 400 }
      );
    }
    if (raw.length > 40000) {
      return NextResponse.json(
        { error: "チャット履歴が長すぎます (4万字以内に分割してください)" },
        { status: 400 }
      );
    }

    const { masked, speakerMap, note } = maskLog(raw);

    // ユーザーが「自分の発言者名」を手動ヒントしたら、マスクマップからラベルを特定
    let editorHintLabel: string | null = null;
    if (typeof editorHint === "string" && editorHint.trim()) {
      const hint = editorHint.trim();
      const found = Object.entries(speakerMap).find(([, name]) => name === hint);
      if (found) editorHintLabel = found[0];
    }
    const contextNote =
      (typeof context === "string" ? context.trim() : "") +
      (editorHintLabel
        ? `\nユーザーの自己申告: 編集者=${editorHintLabel}`
        : "");

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserMessage(masked, contextNote, note),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "AIの応答を解析できませんでした", raw: text },
        { status: 500 }
      );
    }

    let parsed: ReviewResult;
    try {
      parsed = JSON.parse(jsonStr) as ReviewResult;
    } catch {
      return NextResponse.json(
        { error: "AIの応答JSONが不正でした", raw: jsonStr.slice(0, 400) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: parsed,
      speakerMap,
      maskNote: note,
    });
  } catch (error) {
    console.error("Chat review error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `チャット添削中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

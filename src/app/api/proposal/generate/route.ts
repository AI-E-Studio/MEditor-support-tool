import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import type { HearingData, ProjectMode } from "@/types";

const client = new Anthropic();

function resolveProjectMode(data: HearingData): ProjectMode {
  return data.projectMode === "youtube_operation"
    ? "youtube_operation"
    : "single_production";
}

function projectModeLabel(mode: ProjectMode): string {
  return mode === "youtube_operation"
    ? "YouTube運用・チャンネル型（定期投稿・シリーズ・成長を前提）"
    : "単発制作型（PV・採用・プロモ等・1本または短期で完結する納品）";
}

function hearingBlock(data: HearingData): string {
  const mode = resolveProjectMode(data);
  return `## 案件タイプ（最重要）
- 選択: ${projectModeLabel(mode)}

## クライアント情報
- 会社名/クライアント名: ${data.clientName}
- 業種: ${data.industry}
- 事業概要: ${data.businessOverview}

## 動画の目的・用途
- 動画の種類: ${data.videoType}
- 動画の目的: ${data.videoPurpose}
- ターゲット層: ${data.targetAudience}
- 配信プラットフォーム: ${data.publishPlatform}

## 制作条件
- 予算感: ${data.budget}
- 納期: ${data.deadline}
- 動画の長さ: ${data.videoLength}
- 本数: ${data.quantity}

## 素材・要望
- 既存素材: ${data.existingMaterials}
- 参考動画: ${data.referenceVideos}
- トーン&マナー: ${data.toneAndManner}
- 特別な要望: ${data.specialRequests}

## 現状の課題
- 現在の課題: ${data.currentChallenges}
- 競合情報: ${data.competitorInfo}
- KPI/成果指標: ${data.kpi}`;
}

function buildStrategyPromptYoutube(data: HearingData): string {
  return `あなたは動画マーケティングの戦略コンサルタントです。
以下のヒアリングは **YouTubeチャンネルの運用・定期投稿・シリーズ展開** が主軸の案件です。単発PVのように「1本だけ納品して終わり」ではなく、**継続的な投稿設計・編集オペレーション・成長指標**を重視して分析してください。

${hearingBlock(data)}

---

## 出力上の必須方針（YouTube運用向け）
- **チャンネル単位**で考える（単発の完成度だけでなく、投稿の連続性・視聴者の期待値・シリーズの軸）。
- **編集者の実務**に落とす: フォーマット化、テロップテンプレ、納品サイクル、修正の回し方、素材の受け渡しルール。
- **プラットフォーム**: YouTube固有の論点（視聴維持、CTR、ショートと長尺の役割、サムネ・タイトルとの一体設計）を必ず含める。
- クライアントの予算・本数・納期が「運用」と矛盾する場合は、**現実的な落としどころ**（優先順位・フェーズ分け）を明示する。

以下の構成で戦略を出力してください（Markdown形式）:

### 1. 現状分析
チャンネル・運用体制・コンテンツの強み弱み、および編集工程上のボトルネック

### 2. ターゲット視聴者と視聴行動
ペルソナ、YouTube上の視聴動機、競合チャンネルとの視聴者の取り合い

### 3. チャンネル・コンテンツ戦略
- チャンネルコンセプトとシリーズ設計（企画の柱）
- 投稿頻度・フォーマット（定番パート、尺の目安）
- 長尺・ショートの役割分担

### 4. 編集・制作オペレーション案
テンプレ化、納品リードタイム、品質基準、クライアントとの素材・修正フロー

### 5. 成長・改善の打ち手
サムネ・タイトル・フック、再生維持、リピート視聴につなげる編集のポイント（過度な保証はしない）

### 6. KPIと改善サイクル
指標の見方（再生数だけに偏らない）、レビュー頻度、次の投稿への反映の仕方`;
}

function buildStrategyPromptSingle(data: HearingData): string {
  return `あなたは動画マーケティングの戦略コンサルタントです。
以下のヒアリングは **1本または短期で完結する動画制作**（企業VP、採用、イベント、プロモーション等）が主軸の案件です。**納品物の定義・承認フロー・マイルストーン**を重視し、継続運用の話に寄せすぎないでください。

${hearingBlock(data)}

---

## 出力上の必須方針（単発制作向け）
- **1プロジェクトとしてのゴール**（誰に・何を・どう感じさせるか）を明確にする。
- **工程**: 企画確定 → 素材確定 → 編集 → 修正ラウンド → 納品形式（解像度・尺・派生カット）まで逆算する。
- **品質の担保**: ブランドトーン、誤表記リスク、音楽・素材ライセンスの論点に触れる（断定は避け、確認ポイントとして）。
- 予算・納期がタイトな場合は、**スコープの切り方**（Must / Should / Could）を示す。

以下の構成で戦略を出力してください（Markdown形式）:

### 1. 現状分析
ブランド・訴求・素材状況、および制作を難しくする要因

### 2. ターゲットと訴求の芯
誰に刺さるか、見終わった後に取ってほしい行動

### 3. 単発案件としての制作戦略
コンセプト、構成案の方向性（冒頭フック〜CTA）、派生カットやマルチプラットフォーム展開の考え方

### 4. 工程・スケジュール案
企画ロック、編集、修正、最終納品までのマイルストーン（納期から逆算）

### 5. 差別化と品質
競合・類似動画との差、編集・演出で勝つポイント、品質チェックの観点

### 6. 成果の見方
KPI・効果測定の前提（単発でも測れる指標と限界）`;
}

function buildStrategyPrompt(data: HearingData): string {
  return resolveProjectMode(data) === "youtube_operation"
    ? buildStrategyPromptYoutube(data)
    : buildStrategyPromptSingle(data);
}

function buildProposalPromptYoutube(data: HearingData, strategy: string): string {
  return `あなたはプロの動画編集フリーランスです。
以下は **YouTube運用・チャンネル支援** を主とする案件です。提案書は「単発の動画お見積り」だけで終わらせず、**継続的な制作・納品・改善**が回る提案にしてください。

## 案件タイプ
- ${projectModeLabel("youtube_operation")}

## クライアント情報（要約）
- 会社名/クライアント名: ${data.clientName}
- 業種: ${data.industry}
- 動画の目的: ${data.videoPurpose}
- 予算感: ${data.budget}
- 本数・納期の感: ${data.quantity} / ${data.deadline}

## 戦略分析結果
${strategy}

---

以下の構成で、ビジネス文書として丁寧かつ説得力のある提案書を作成してください（Markdown形式）:

# ご提案書

## はじめに
挨拶、ヒアリング内容の確認、本提案の目的（運用・成長に向けた編集支援）

## 現状の課題と解決の方向性
課題の整理と、YouTube運用において編集・制作でカバーできる範囲の明確化

## ご提案内容
### チャンネル・コンテンツ方針（要約）
戦略をクライアント向けに噛み砕いた提案（シリーズ軸・投稿の考え方）

### 制作・納品体制（継続運用）
納品サイクル、フォーマット、修正回の考え方、コミュニケーション方法

### スケジュール・マイルストーン
初月〜の立ち上げ、試行期間、定常運用に入るイメージ（具体的な日付はヒアリングに合わせる）

### 期待される効果とKPI
指標の見方、短期・中期の期待値（過度な数値保証はしない）

## お見積り
月額・本単価・オプションなど、**継続案件として理解しやすい**形（ヒアリングの予算感に整合）

## 制作体制・実績
あなた（編集者）としての強み、対応範囲、連携が必要な工程の扱い

## 今後の進め方
キックオフ、試作・テスト投稿、定常化に向けた次のステップ

※ クライアントにそのまま提出できる品質・敬語で。
※ 単発PVの提案書の体裁に寄せすぎないこと。`;
}

function buildProposalPromptSingle(
  data: HearingData,
  strategy: string
): string {
  return `あなたはプロの動画編集フリーランスです。
以下は **1本完結または短期で納品が完結する動画制作**（企業VP、採用、イベント、プロモ等）です。提案書は **納品スコープ・工程・修正・成果物**が明確な「単発案件の提案」にしてください。

## 案件タイプ
- ${projectModeLabel("single_production")}

## クライアント情報（要約）
- 会社名/クライアント名: ${data.clientName}
- 業種: ${data.industry}
- 動画の目的: ${data.videoPurpose}
- 予算感: ${data.budget}

## 戦略分析結果
${strategy}

---

以下の構成で、ビジネス文書として丁寧かつ説得力のある提案書を作成してください（Markdown形式）:

# ご提案書

## はじめに
挨拶、ヒアリング内容の確認、本提案の目的（単発プロジェクトとしてのゴール）

## 現状の課題と解決の方向性
課題の整理と、本動画で解決できること／解決できないことの線引き

## ご提案内容
### 動画コンセプト
企画の方向性、トーン、見せ方の核

### 制作内容・納品範囲
編集の具体、使用する技術・手法、納品物（本編・派生カット・納品形式）

### 工程・スケジュール
企画確定、素材、編集、修正ラウンド、最終納品までの工程表

### 期待される効果
KPI・効果測定の前提（単発であることの限界も踏まえて）

## お見積り
予算感に沿った概算、内訳の考え方、オプション

## 制作体制・実績
フリーランスとしての強み、対応体制、外注や撮影が絡む場合の扱い

## 今後の進め方
次のステップ（キックオフ、素材提出、初稿日程など）

※ クライアントにそのまま提出できる品質・敬語で。
※ YouTubeチャンネル運用の長期提案に寄せすぎないこと。`;
}

function buildProposalPrompt(data: HearingData, strategy: string): string {
  return resolveProjectMode(data) === "youtube_operation"
    ? buildProposalPromptYoutube(data, strategy)
    : buildProposalPromptSingle(data, strategy);
}

// --- 音声文字起こしベース（ヒアリングフォーム非使用）---

function transcriptPreamble(mode: ProjectMode): string {
  return `## 案件タイプ（ユーザー選択）
- ${projectModeLabel(mode)}

## 音声の文字起こし（原文）
以下はクライアントとの打ち合わせ・ヒアリング音声を **Whisper で文字起こししたテキスト**です。
会話の順序・口語・重複はそのまま活かしつつ、実務の提案に使えるよう解釈してください。
文中にない情報は**無理に埋めず**、「要確認」「ヒアリング不足」として明示してください。

${"```"}
`;
}

function transcriptClosing(): string {
  return `\n${"```"}\n`;
}

function buildStrategyPromptYoutubeFromTranscript(
  transcript: string
): string {
  return `あなたは動画マーケティングの戦略コンサルタントです。
入力は**音声ヒアリングの文字起こし**のみです。以下は **YouTubeチャンネルの運用・定期投稿** を主題に含む想定で分析してください（会話が単発制作のみでも、運用に転用できる示唆があれば記載）。

${transcriptPreamble("youtube_operation")}${transcript}${transcriptClosing()}

---

## 出力上の必須方針（YouTube運用向け・文字起こし版）
- 文字起こしに現れない場合は推測で固めず、**確認すべき質問リスト**を最後に列挙してよい。
- **チャンネル・継続投稿**の観点（シリーズ、頻度、テンプレ、納品サイクル、分析）を優先。
- YouTube 固有（視聴維持、サムネ/タイトル、ショートと長尺）に触れる。

以下の構成で戦略を出力してください（Markdown形式）:

### 1. 現状分析（文字起こしから読み取れる事実の整理）
### 2. ターゲット視聴者と視聴行動
### 3. チャンネル・コンテンツ戦略
### 4. 編集・制作オペレーション案
### 5. 成長・改善の打ち手
### 6. KPIと改善サイクル
### 7. 追加で確認したいヒアリング項目（箇条書き）`;
}

function buildStrategyPromptSingleFromTranscript(transcript: string): string {
  return `あなたは動画マーケティングの戦略コンサルタントです。
入力は**音声ヒアリングの文字起こし**のみです。以下は **1本または短期で完結する動画制作**（PV・採用・プロモ等）を主題に含む想定で分析してください。

${transcriptPreamble("single_production")}${transcript}${transcriptClosing()}

---

## 出力上の必須方針（単発制作向け・文字起こし版）
- 推測は「仮説」として明示。不足情報は **要確認** に落とす。
- **納品物・工程・修正・スケジュール**を重視。継続運用の話に寄せすぎない。

以下の構成で戦略を出力してください（Markdown形式）:

### 1. 現状分析
### 2. ターゲットと訴求の芯
### 3. 単発案件としての制作戦略
### 4. 工程・スケジュール案
### 5. 差別化と品質
### 6. 成果の見方
### 7. 追加で確認したいヒアリング項目（箇条書き）`;
}

function buildStrategyFromTranscript(
  transcript: string,
  mode: ProjectMode
): string {
  return mode === "youtube_operation"
    ? buildStrategyPromptYoutubeFromTranscript(transcript)
    : buildStrategyPromptSingleFromTranscript(transcript);
}

function buildProposalPromptYoutubeFromTranscript(
  transcript: string,
  strategy: string
): string {
  return `あなたはプロの動画編集フリーランスです。
根拠データは**ヒアリング音声の文字起こし**と、それに基づく**戦略ドラフト**です。YouTube運用・継続案件としての提案書にしてください。

${transcriptPreamble("youtube_operation")}${transcript}${transcriptClosing()}

## 戦略分析結果
${strategy}

---

以下の構成で提案書を作成してください（Markdown形式）。文字起こしにない固有名・数値は捏造せず、「要確認」とするか一般的表現にとどめてください。

# ご提案書

## はじめに
## 現状の課題と解決の方向性
## ご提案内容
### チャンネル・コンテンツ方針（要約）
### 制作・納品体制（継続運用）
### スケジュール・マイルストーン
### 期待される効果とKPI
## お見積り（継続案件の見せ方）
## 制作体制・実績
## 今後の進め方

※ 敬語・提出可能な品質。
※ 単発PVのみの体裁に寄せすぎないこと。`;
}

function buildProposalPromptSingleFromTranscript(
  transcript: string,
  strategy: string
): string {
  return `あなたはプロの動画編集フリーランスです。
根拠データは**ヒアリング音声の文字起こし**と、それに基づく**戦略ドラフト**です。**単発・短期納品**の提案書にしてください。

${transcriptPreamble("single_production")}${transcript}${transcriptClosing()}

## 戦略分析結果
${strategy}

---

以下の構成で提案書を作成してください（Markdown形式）。文字起こしにない固有名・数値は捏造せず、「要確認」とするか一般的表現にとどめてください。

# ご提案書

## はじめに
## 現状の課題と解決の方向性
## ご提案内容
### 動画コンセプト
### 制作内容・納品範囲
### 工程・スケジュール
### 期待される効果
## お見積り
## 制作体制・実績
## 今後の進め方

※ 敬語・提出可能な品質。
※ YouTube長期運用の提案に寄せすぎないこと。`;
}

function buildProposalFromTranscript(
  transcript: string,
  strategy: string,
  mode: ProjectMode
): string {
  return mode === "youtube_operation"
    ? buildProposalPromptYoutubeFromTranscript(transcript, strategy)
    : buildProposalPromptSingleFromTranscript(transcript, strategy);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      step,
      hearingData: rawHearing,
      strategy,
      transcript,
      projectMode: rawProjectMode,
    } = body as {
      step: string;
      hearingData?: HearingData;
      strategy?: string;
      transcript?: string;
      projectMode?: ProjectMode;
    };

    const resolveMode = (): ProjectMode =>
      rawProjectMode === "youtube_operation"
        ? "youtube_operation"
        : "single_production";

    if (step === "strategy_from_transcript") {
      const t = typeof transcript === "string" ? transcript.trim() : "";
      if (!t) {
        return NextResponse.json(
          { error: "文字起こしテキストがありません" },
          { status: 400 }
        );
      }
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: buildStrategyFromTranscript(t, resolveMode()),
          },
        ],
      });
      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ result: text });
    }

    if (step === "proposal_from_transcript") {
      const t = typeof transcript === "string" ? transcript.trim() : "";
      if (!t || typeof strategy !== "string" || !strategy.trim()) {
        return NextResponse.json(
          { error: "文字起こしまたは戦略テキストがありません" },
          { status: 400 }
        );
      }
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildProposalFromTranscript(t, strategy, resolveMode()),
          },
        ],
      });
      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ result: text });
    }

    if (
      (step === "strategy" || step === "proposal") &&
      (!rawHearing || typeof rawHearing !== "object")
    ) {
      return NextResponse.json(
        { error: "ヒアリングデータがありません" },
        { status: 400 }
      );
    }

    const hearingData: HearingData = {
      ...(rawHearing as HearingData),
      projectMode:
        (rawHearing as HearingData).projectMode === "youtube_operation"
          ? "youtube_operation"
          : "single_production",
    };

    if (step === "strategy") {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: buildStrategyPrompt(hearingData),
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";

      return NextResponse.json({ result: text });
    }

    if (step === "proposal") {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildProposalPrompt(hearingData, strategy as string),
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";

      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "AI処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

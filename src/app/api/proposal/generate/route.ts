import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import type { HearingData } from "@/types";

const client = new Anthropic();

function buildStrategyPrompt(data: HearingData): string {
  return `あなたは動画マーケティングの戦略コンサルタントです。
以下のクライアントヒアリング情報を分析し、動画編集フリーランスとして最適な戦略を立案してください。

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
- KPI/成果指標: ${data.kpi}

---

以下の構成で戦略を出力してください（Markdown形式）:

### 1. 現状分析
クライアントの状況・課題を整理し、動画制作における重要ポイントを分析

### 2. ターゲット分析
ターゲット層の特性、視聴傾向、刺さるコンテンツの方向性

### 3. 動画戦略の方向性
- コンテンツの企画方針
- 編集スタイルの提案（テンポ、エフェクト、テロップデザイン等）
- 配信プラットフォーム別の最適化ポイント

### 4. 制作スケジュール案
納期から逆算した制作フロー

### 5. 差別化ポイント
競合との差別化、付加価値の提案

### 6. KPI達成のための施策
目標達成に向けた具体的なアプローチ`;
}

function buildProposalPrompt(
  data: HearingData,
  strategy: string
): string {
  return `あなたはプロの動画編集フリーランスです。
以下のクライアント情報と戦略分析に基づいて、クライアントに提出するプロフェッショナルな提案書を作成してください。

## クライアント情報
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
（クライアントへの挨拶、ヒアリング内容の確認）

## 現状の課題と解決の方向性
（クライアントの課題を整理し、動画で解決できることを示す）

## ご提案内容
### 動画コンセプト
（企画の方向性、コンセプト）

### 制作内容の詳細
（具体的な編集内容、使用する技術・手法）

### 制作スケジュール
（工程表）

### 期待される効果
（KPIに対する見込み効果）

## お見積り
（予算感に基づいた概算見積もり）

## 制作体制・実績
（フリーランスとしての強み、対応体制）

## 今後の進め方
（次のステップの提案）

※ 提案書はクライアントにそのまま提出できるレベルの品質で作成してください。
※ 敬語を使い、ビジネス文書としてふさわしい文体で記述してください。`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { step, hearingData, strategy } = await request.json();

    if (step === "strategy") {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: buildStrategyPrompt(hearingData as HearingData),
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
            content: buildProposalPrompt(
              hearingData as HearingData,
              strategy as string
            ),
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

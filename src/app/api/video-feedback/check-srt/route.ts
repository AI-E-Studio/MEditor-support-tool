import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { srtContent } = await request.json();

    if (!srtContent || typeof srtContent !== "string") {
      return NextResponse.json(
        { error: "SRTコンテンツが必要です" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `あなたは日本語テロップの品質チェック専門家です。
以下のSRTファイルの内容を確認し、問題点をすべて列挙してください。

## チェック項目
1. **誤字・脱字**（例：「編集者」→「編集社」のような誤字）
2. **表記ゆれ**（同じ言葉が漢字・ひらがな・カタカナで混在している）
3. **文法的に不自然な文章**（助詞の誤り、文末の不統一など）
4. **句読点・記号の誤用**
5. **タイムコードの重複や逆順**
6. **空テロップ**（テキストが空のブロック）
7. **1行あたりの文字数が多すぎる箇所**（目安：20文字超）

## 出力形式
必ず以下のJSON形式のみで回答してください。余分な説明文は不要です。
問題がない場合は errors を空配列にしてください。

\`\`\`json
{
  "errors": [
    {
      "index": 1,
      "time": "00:00:01,000 --> 00:00:04,000",
      "text": "元のテキスト",
      "issue": "問題の説明（簡潔に）",
      "suggestion": "修正案（ある場合のみ。なければ空文字）"
    }
  ]
}
\`\`\`

## SRTファイル内容
\`\`\`
${srtContent}
\`\`\``,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // JSONブロックを抽出してパース
    const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return NextResponse.json(parsed);
    }

    // コードブロックなしでもJSONとしてパース試行
    const parsed = JSON.parse(content.text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("SRT check error:", error);
    return NextResponse.json(
      { error: "チェック中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

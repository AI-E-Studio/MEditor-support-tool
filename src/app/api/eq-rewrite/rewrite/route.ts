import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `あなたは「EQ究極のテキストコミュニケーション設計士」です。
ユーザーが貼り付けた文章を分析し、相手に感情が正確に伝わる文章にリライトしてください。

■前提認識
・テキストは感情が2割減で届く
・書き手が「普通」のつもりでも、読み手には「冷たい」「怒ってる?」と伝わるリスクがある
・だから書き手が2割増しの温度で書いて、やっと「普通」で届く
・「機械的な丁寧さ」ではなく「人間味のある具体性」が温度を運ぶ

■初回ヒアリングフェーズ（必須／既に情報があればスキップOK）
リライト着手前に、不足情報を箇条書きで質問する。
質問は最小限・端的に。ユーザーが「分からない／任せる」と答えた項目は推測で進める。

1.【相手情報】相手の呼び方／関係性／関係の深さ
2.【背景・本音】送る状況／受けた具体的な恩・学び・価値／本当は伝えたい本音
3.【文体・温度設定】普段の文体／「！」の使用／絵文字／希望温度感(1〜5)

■分析フェーズ（出力不要／内部処理）
STEP1：文章の目的を特定（依頼／謝罪／辞退／報告／感謝 等）
STEP2：現在の感情温度を測定（1〜5）
STEP3：目標温度を設定（ヒアリング結果に応じる）
STEP4：「具体性で温度を上げられる箇所」を抽出
   →抽象的な「ありがとう」を、固有名詞＋具体的な価値に置き換える余地を探す

■リライト7つの法則
❶感謝先出しの法則：本題の前に感謝を入れる
❷相手を主語にする法則：「あなたが〇〇してくれたから」に変換
❸選択権を渡す法則：依頼は「相談」の形にする
❹前提を肯定する法則：相手の状況を想像してクッションを入れる
❺未来で関係を繋ぐ法則：断り・謝罪は「次」に繋げる
❻謝罪は行動で示す法則：改善策を添える（本題では「!」を使わない）
❼語尾に気持ちを乗せる法則：語尾を1段階上げる

■温度を上げる5つの追加技法（最終版クオリティの肝）
①固有名詞化：「チーム」→「田中さんのチーム」
②価値の言語化：「ありがとう」→「○○を学べたこと／貴重な経験」
③感情の二段重ね：「感謝しております」＋「価値が大きい／貴重な経験」
④身体性のある謙譲：m(_ _)m／🙇‍♂️／🙏 を文末に置き、頭の下げ方を可視化
⑤本音レイヤーの挿入：建前の前に「上記のような思いではあるのですが」など本音を一言挟む

■出力フォーマット
【リライト後】
（そのままコピペできる完成文）

【変更ポイント】
・(どこを／なぜ変えたか 3点以内で簡潔に)

【さらに温度を上げたい場合】※任意
・(具体的な追記案を1〜2点)

■注意事項
・元の意図・要件は絶対に変えない
・文量は元の1.5倍以内（具体性追加分は許容）
・過剰に丁寧にしない（慇懃無礼を避ける）
・謝罪・辞退の本題部分では「!」を使わない（冒頭・末尾の挨拶は可）
・絵文字・顔文字はヒアリング結果に従う
・ユーザーが「具体的な恩・学び」を答えた場合、必ずその要素を1文以上盛り込む
・ヒアリング結果が出揃ったら、確認なしで一発リライトに進む`;

interface RewriteBody {
  inputText?: string;
  who?: string;
  relation?: string;
  depth?: string;
  situation?: string;
  background?: string;
  tone?: string;
  exclaim?: string;
  emoji?: string;
  temp?: string;
}

function buildUserMessage(body: RewriteBody): string {
  const v = (s?: string) => (typeof s === "string" ? s.trim() : "");
  const hearing: string[] = [];
  if (v(body.who)) hearing.push(`相手の呼び方：${v(body.who)}`);
  if (v(body.relation)) hearing.push(`関係性：${v(body.relation)}`);
  if (v(body.depth)) hearing.push(`関係の深さ：${v(body.depth)}`);
  if (v(body.situation)) hearing.push(`用途カテゴリ：${v(body.situation)}`);
  if (v(body.background)) hearing.push(`補足・背景・経緯：${v(body.background)}`);
  if (v(body.tone)) hearing.push(`普段の文体：${v(body.tone)}`);
  if (v(body.exclaim)) hearing.push(`「！」の使用：${v(body.exclaim)}`);
  if (v(body.emoji)) hearing.push(`絵文字／顔文字：${v(body.emoji)}`);
  if (v(body.temp)) hearing.push(`希望温度感：${v(body.temp)}`);

  const parts: string[] = [];
  if (hearing.length) {
    parts.push("【ヒアリング情報】");
    parts.push(hearing.map((h) => "・" + h).join("\n"));
    parts.push(
      "\n上記の情報が揃っているため、追加質問なしで一発リライトしてください。"
    );
  } else {
    parts.push(
      "（ヒアリング情報なし。不足分は推測で進めて、確認なしで一発リライトしてください）"
    );
  }
  parts.push("\n↓リライトしたい文章↓\n");
  parts.push(v(body.inputText));
  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RewriteBody;
    const text = typeof body.inputText === "string" ? body.inputText.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "リライトしたい文章を入力してください" },
        { status: 400 }
      );
    }
    if (text.length > 8000) {
      return NextResponse.json(
        { error: "文章が長すぎます (8000字以内に分割してください)" },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(body);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      temperature: 0.7,
      messages: [{ role: "user", content: userMessage }],
    });

    const result =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    if (!result) {
      return NextResponse.json(
        { error: "AIの応答が空でした" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("EQ rewrite error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `リライト中にエラーが発生しました: ${msg}` },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

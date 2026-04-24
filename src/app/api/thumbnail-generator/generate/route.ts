import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// Nano Banana Pro (日本語テキスト描画が強い)。失敗時は順に降格して Flash Image (Nano Banana) へ。
const MODEL_CHAIN = [
  "gemini-3-pro-image-preview",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
];

type Genre =
  | "auto"
  | "business"
  | "entertainment"
  | "education"
  | "vlog"
  | "game"
  | "news";

const GENRE_DIRECTION: Record<Exclude<Genre, "auto">, string> = {
  business:
    "ビジネス・副業系。紺/黒/赤/ゴールドなど信頼感と勢いを両立した配色。スーツ姿の人物や札束・グラフ・矢印など、お金や成長を想起させるモチーフを使う。",
  entertainment:
    "エンタメ・バラエティ系。赤・黄・白のド派手な配色、驚き顔/笑顔/困惑顔など表情豊かな人物、擬音風のコミカルなあしらい、テロップ的な装飾。",
  education:
    "教育・解説系。白/青/ネイビーを基調にした落ち着いたトーン。ホワイトボード・本・図解アイコンなど、知的でわかりやすい印象。",
  vlog:
    "Vlog・日常系。柔らかい自然光、フィルム風の淡い色味、ナチュラルな雰囲気。手書き風フォントや控えめなテロップ装飾。",
  game:
    "ゲーム実況系。黒背景にネオン(シアン/マゼンタ/ライム)のグロー、ゲーム画面を意識した派手なエフェクト、キャラクター風の人物ショット。",
  news:
    "ニュース・時事解説系。青/白/赤のニュース番組風配色。人物はスーツ、背景に地図・グラフ・都市写真。報道テロップ風の帯あり。",
};

function genreBlock(genre: Genre): string {
  if (genre === "auto" || !GENRE_DIRECTION[genre as Exclude<Genre, "auto">]) {
    return "";
  }
  return `\n\n## ジャンル指定\n${GENRE_DIRECTION[genre as Exclude<Genre, "auto">]}`;
}

function buildPrompt(
  catchCopy: string,
  subText: string,
  genre: Genre,
  styleHint: string
): string {
  const subBlock = subText
    ? `\n- サブテキスト(小さめ): 「${subText}」\n  メインのキャッチコピーを邪魔しない位置に小さく配置`
    : "";
  const styleBlock = styleHint ? `\n\n## 追加のテーマ指定\n${styleHint}` : "";

  // キャッチコピーの日本語を一字ずつ空白区切りで明示 → レンダリング精度向上のヒント
  const spaced = Array.from(catchCopy).join(" ");
  const spacedSub = subText ? Array.from(subText).join(" ") : "";

  return `あなたは日本のYouTubeで実績のあるサムネイル専門デザイナーです。
以下の条件で、**実際にクリックされる日本式YouTubeサムネイル**を1枚、画像として出力してください。

## 画面に描く文字（最重要・一字一句そのまま）
- メインのキャッチコピー(大): 「${catchCopy}」${subBlock}
- 1文字ずつ分解した参考表記（レンダリング確認用・この並びをそのまま描く）: ${spaced}
${spacedSub ? `- サブテキストの1文字ずつ表記: ${spacedSub}\n` : ""}
### 日本語テキストの描画ルール（厳守）
- 指定の日本語を**一字一句そのまま**描く。意訳・英訳・要約・文字の水増し/省略を絶対にしない
- **存在しない漢字・異体字・崩れた文字・架空のカナを作らない**（読み取り不能な形になるくらいなら文字サイズを下げて余白を取る）
- 使用フォント: 太い日本語ゴシック体（源ノ角ゴシック Heavy / ヒラギノ角ゴ W8 / Noto Sans JP Black 相当）
- 袋文字: **白抜き文字 + 太い黒フチ(8〜12px相当) + 黒ドロップシャドウ**。視認性を最優先
- 重要キーワード1〜2語のみ**黄色(#FFE600)や赤(#FF1E1E)**で強調、他は白
- 文字は画面上で圧倒的に大きく（短文は高さの40〜55%、長文でも30〜40%）
- 句読点・記号・数字もオリジナル通り（"！" は全角、"!" は半角のように区別して描く）

## 構図・デザイン
- アスペクト比: **16:9 (1280x720 横長)**
- 日本のYouTube上位に出てくる「濃い・ハッキリ・感情が一目で伝わる」サムネ
- 被写体（人物やモチーフ）は片側に寄せ、反対側にキャッチコピーを大きく置く**ツーブロック構図**が基本
- 被写体の表情や手振りで驚き/興味/発見を演出
- 背景はぼかし or ベタ塗り or グラデで、文字の視認性を最優先に確保
- 画像全体のコントラストを強く、縮小表示（小さいサムネ）でも読める可読性${genreBlock(genre)}${styleBlock}

## 禁止事項
- キャッチコピーの日本語を英語や別表現に**書き換えない**
- 画面上に指定外の日本語・擬似日本語・意味不明な文字列を散りばめない
- 崩れた漢字/カナ/ひらがな、読めない記号の羅列を描かない
- 過度にフェイクニュース的・公序良俗に反する表現はしない

最終アウトプットは **1枚の画像のみ**。テキスト応答は不要です。`;
}

async function generateOne(
  prompt: string,
  apiKey: string,
  model: string
): Promise<{ mimeType: string; data: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        temperature: 1.0,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(
      `Gemini API (${model}) ${res.status}: ${errText.slice(0, 300)}`
    );
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `プロンプトが安全フィルタでブロックされました: ${data.promptFeedback.blockReason}`
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    const inlineData = inline?.data;
    const inlineMime =
      (p.inlineData?.mimeType ?? p.inline_data?.mime_type) || "image/png";
    if (inlineData) {
      return { mimeType: inlineMime, data: inlineData };
    }
  }

  const finishReason = data?.candidates?.[0]?.finishReason;
  throw new Error(
    finishReason
      ? `画像データが返されませんでした (finishReason: ${finishReason})`
      : "画像データが返されませんでした"
  );
}

async function generateWithFallback(
  prompt: string,
  apiKey: string
): Promise<{ mimeType: string; data: string }> {
  let lastErr: unknown;
  for (const model of MODEL_CHAIN) {
    try {
      return await generateOne(prompt, apiKey, model);
    } catch (e) {
      lastErr = e;
      const status = (e as Error & { status?: number }).status;
      // モデル未提供/未対応っぽいものだけ次へ降格。それ以外(429, 5xx 等)は即 throw。
      if (status === 404 || status === 400 || status === 403) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("利用可能な画像生成モデルが見つかりませんでした");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      catchCopy,
      subText,
      genre,
      style,
      variations,
    } = body as {
      catchCopy?: string;
      subText?: string;
      genre?: Genre;
      style?: string;
      variations?: number;
    };

    const text = typeof catchCopy === "string" ? catchCopy.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "キャッチコピーを入力してください" },
        { status: 400 }
      );
    }
    if (text.length > 80) {
      return NextResponse.json(
        { error: "キャッチコピーは80文字以内で入力してください" },
        { status: 400 }
      );
    }

    const resolvedGenre: Genre = [
      "auto",
      "business",
      "entertainment",
      "education",
      "vlog",
      "game",
      "news",
    ].includes(genre ?? "")
      ? (genre as Genre)
      : "auto";

    const resolvedVariations = Math.max(
      1,
      Math.min(4, Number(variations) || 1)
    );

    const prompt = buildPrompt(
      text,
      typeof subText === "string" ? subText.trim() : "",
      resolvedGenre,
      typeof style === "string" ? style.trim() : ""
    );

    const settled = await Promise.allSettled(
      Array.from({ length: resolvedVariations }, () =>
        generateWithFallback(prompt, apiKey)
      )
    );

    const images = settled
      .filter(
        (s): s is PromiseFulfilledResult<{ mimeType: string; data: string }> =>
          s.status === "fulfilled"
      )
      .map((s) => s.value);

    if (images.length === 0) {
      const firstError = settled.find((s) => s.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      const message =
        firstError?.reason instanceof Error
          ? firstError.reason.message
          : "画像生成に失敗しました";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Thumbnail generator error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `サムネイル生成中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

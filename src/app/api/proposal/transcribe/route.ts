import { auth } from "@/auth";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** OpenAI Whisper の上限に合わせる（Vercel のボディ制限も要確認） */
const MAX_BYTES = 24 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY がサーバーに設定されていません" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const raw = formData.get("file");

  // Node / Next の FormData では File ではなく Blob だけ渡ることがあり、instanceof File が false になる
  if (!raw || typeof raw === "string" || !(raw instanceof Blob)) {
    return NextResponse.json(
      { error: "音声ファイルがありません（アップロードデータを認識できませんでした）" },
      { status: 400 }
    );
  }

  if (raw.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ファイルサイズは 24MB 以下にしてください（Whisper の上限に準拠）" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await raw.arrayBuffer());
    const uploadName =
      raw instanceof File && raw.name ? raw.name : "audio.webm";
    const mime =
      raw instanceof File && raw.type
        ? raw.type
        : raw.type || "application/octet-stream";

    const upload = await toFile(buffer, uploadName, {
      type: mime,
    });

    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: upload,
      model: "whisper-1",
      language: "ja",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (e) {
    console.error("Whisper error:", e);
    const msg =
      e instanceof Error ? e.message : "文字起こしに失敗しました";
    return NextResponse.json(
      {
        error:
          "文字起こしに失敗しました。形式・サイズ・OPENAI_API_KEY を確認してください。",
        detail: msg,
      },
      { status: 500 }
    );
  }
}

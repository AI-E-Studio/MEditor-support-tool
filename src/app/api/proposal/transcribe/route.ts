import { auth } from "@/auth";
import { getMaxAudioUploadBytes } from "@/lib/audioUploadLimits";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Whisper API 上限 25MB とクライアント設定の小さい方（Vercel はエッジで約 4.5MB 制限のため実質はそれ以下） */
function maxUploadBytes(): number {
  return Math.min(25 * 1024 * 1024, getMaxAudioUploadBytes());
}

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

  const limit = maxUploadBytes();
  if (raw.size > limit) {
    return NextResponse.json(
      {
        error: `ファイルサイズは ${Math.round(limit / (1024 * 1024))}MB 以下にしてください（ホスティング・Whisper の上限内）`,
      },
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

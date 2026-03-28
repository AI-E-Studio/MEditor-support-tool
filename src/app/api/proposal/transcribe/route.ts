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
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "音声ファイルがありません" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ファイルサイズは 24MB 以下にしてください（Whisper の上限に準拠）" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await toFile(buffer, file.name || "audio.webm", {
      type: file.type || "application/octet-stream",
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
    return NextResponse.json(
      { error: "文字起こしに失敗しました。形式・サイズを確認してください。" },
      { status: 500 }
    );
  }
}

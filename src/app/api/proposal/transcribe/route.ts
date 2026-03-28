import { auth } from "@/auth";
import {
  getMaxAudioUploadBytes,
  MAX_BLOB_AUDIO_BYTES,
} from "@/lib/audioUploadLimits";
import { del } from "@vercel/blob";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Whisper API 上限 25MB とクライアント設定の小さい方（FormData 直送のとき） */
function maxFormUploadBytes(): number {
  return Math.min(25 * 1024 * 1024, getMaxAudioUploadBytes());
}

function isTrustedBlobUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    return /\.blob\.vercel-storage\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

async function transcribeBuffer(
  apiKey: string,
  buffer: Buffer,
  uploadName: string,
  mime: string
): Promise<string> {
  const file = await toFile(buffer, uploadName, {
    type: mime,
  });
  const openai = new OpenAI({ apiKey });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ja",
  });
  return transcription.text;
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

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let parsed: { url?: unknown };
    try {
      parsed = (await request.json()) as { url?: unknown };
    } catch {
      return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
    }
    const url =
      typeof parsed.url === "string" ? parsed.url.trim() : "";
    if (!url || !isTrustedBlobUrl(url)) {
      return NextResponse.json(
        { error: "許可されていない Blob URL です" },
        { status: 400 }
      );
    }

    let res: Response;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (e) {
      console.error("transcribe fetch blob:", e);
      return NextResponse.json(
        { error: "Blob の取得に失敗しました" },
        { status: 502 }
      );
    }

    if (!isTrustedBlobUrl(res.url)) {
      return NextResponse.json(
        { error: "リダイレクト先が許可されていません" },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Blob の取得に失敗しました（HTTP ${res.status}）` },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BLOB_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: `ファイルサイズは ${Math.round(MAX_BLOB_AUDIO_BYTES / (1024 * 1024))}MB 以下にしてください`,
        },
        { status: 400 }
      );
    }

    const pathSeg = new URL(url).pathname.split("/").filter(Boolean);
    const uploadName =
      pathSeg.length > 0 ? pathSeg[pathSeg.length - 1] : "audio.webm";
    const mime =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream";

    try {
      const text = await transcribeBuffer(apiKey, buf, uploadName, mime);
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token) {
        try {
          await del(url, { token });
        } catch (delErr) {
          console.warn("Blob delete after transcribe:", delErr);
        }
      }
      return NextResponse.json({ text });
    } catch (e) {
      console.error("Whisper error (blob url):", e);
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

  const formData = await request.formData();
  const raw = formData.get("file");

  if (!raw || typeof raw === "string" || !(raw instanceof Blob)) {
    return NextResponse.json(
      { error: "音声ファイルがありません（アップロードデータを認識できませんでした）" },
      { status: 400 }
    );
  }

  const limit = maxFormUploadBytes();
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

    const text = await transcribeBuffer(apiKey, buffer, uploadName, mime);
    return NextResponse.json({ text });
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

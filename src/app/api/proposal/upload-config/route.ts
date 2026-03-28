import { NextResponse } from "next/server";

/**
 * GET は既定で静的キャッシュされうる。ビルド時にトークンが無いと
 * clientBlobUpload が常に false になるため、必ずランタイムで評価する。
 */
export const dynamic = "force-dynamic";

/**
 * クライアントが Vercel Blob 経由で大きい音声を送れるか（トークン設定の有無）。
 */
export async function GET() {
  const clientBlobUpload = Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim()
  );
  return NextResponse.json(
    { clientBlobUpload },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

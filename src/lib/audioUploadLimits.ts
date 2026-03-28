/**
 * Vercel Blob クライアントアップロード経由時の上限（Whisper API 25MB 以内）。
 * 直接 FormData で Route Handler に送る場合は使わない（413 回避のため別経路）。
 */
export const MAX_BLOB_AUDIO_BYTES = 25 * 1024 * 1024;

export function formatMaxBlobAudioLabel(): string {
  return `${Math.round(MAX_BLOB_AUDIO_BYTES / (1024 * 1024))}MB`;
}

/**
 * ブラウザから Route Handler へ送る音声の推奨上限。
 * Vercel サーバーレスはリクエストボディが約 4.5MB 程度で 413 になるため、
 * デフォルトは余裕を見て 4MB（環境変数で上書き可・自ホスト向け）。
 */
export function getMaxAudioUploadBytes(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAX_AUDIO_BYTES
      : undefined;
  if (raw && /^\d+$/.test(raw.trim())) {
    return parseInt(raw.trim(), 10);
  }
  return 4 * 1024 * 1024;
}

export function formatMaxAudioLabel(): string {
  const b = getMaxAudioUploadBytes();
  if (b >= 1024 * 1024) {
    return `${(b / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${Math.round(b / 1024)}KB`;
}

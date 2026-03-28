/**
 * 文字起こし経路での音声ファイル上限（クライアント・Blob・サーバーで共通）。
 * OpenAI 側の仕様は変更されうるため、API エラー時は公式ドキュメントを確認。
 */
export const WHISPER_MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/**
 * Vercel Blob の 1 ファイル上限（トークン発行用）。
 * 本アプリでは文字起こし上限と揃える。
 */
export const MAX_BLOB_AUDIO_BYTES = WHISPER_MAX_AUDIO_BYTES;

export function formatWhisperMaxAudioLabel(): string {
  return `${Math.round(WHISPER_MAX_AUDIO_BYTES / (1024 * 1024))}MB`;
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

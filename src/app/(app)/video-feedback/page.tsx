"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

// ─── 型定義 ────────────────────────────────────────────────────────────────

type VideoSource = "youtube" | "googledrive" | "local" | null;

interface SrtError {
  index: number;
  time: string;
  text: string;
  issue: string;
  suggestion: string;
}

// YouTube iframe API のグローバル型（最小限）
declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

// ─── ヘルパー ───────────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([^&?#\s]{11})/
  );
  return m ? m[1] : null;
}

function extractDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
  return m ? m[1] : null;
}

// "00:01:23,456 --> 00:01:27,000" の開始時刻を秒数に変換
function srtTimeToSeconds(timeStr: string): number {
  const start = timeStr.split("-->")[0].trim();
  const [hms, ms] = start.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms || "0") / 1000);
}

function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `[${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
  }
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export default function VideoFeedbackPage() {
  // --- 動画ソース ---
  const [urlInput, setUrlInput] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [driveEmbedUrl, setDriveEmbedUrl] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // --- SRT ---
  const [srtFileName, setSrtFileName] = useState<string | null>(null);
  const [srtContent, setSrtContent] = useState<string | null>(null);
  const [srtErrors, setSrtErrors] = useState<SrtError[] | null>(null);
  const [isCheckingSrt, setIsCheckingSrt] = useState(false);

  // --- フィードバック ---
  const [feedbackText, setFeedbackText] = useState("");
  const [copied, setCopied] = useState(false);

  // --- D&D ---
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingSrt, setIsDraggingSrt] = useState(false);

  // --- refs ---
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);

  // ── タイムスタンプをフィードバック欄に挿入 ─────────────────────────────
  const insertTimestamp = useCallback((seconds: number) => {
    const stamp = formatSeconds(seconds) + " ";
    const ta = feedbackRef.current;
    if (!ta) return;

    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const current = ta.value;

    // カーソル直前が改行でなければ改行を補う
    const prefix = start > 0 && current[start - 1] !== "\n" ? "\n" : "";
    const next = current.slice(0, start) + prefix + stamp + current.slice(end);

    setFeedbackText(next);

    // カーソルをスタンプ末尾へ
    requestAnimationFrame(() => {
      const pos = start + prefix.length + stamp.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  }, []);

  // ── YouTube Player セットアップ ───────────────────────────────────────────
  useEffect(() => {
    if (videoSource !== "youtube" || !youtubeId) return;

    const setup = () => {
      if (!ytContainerRef.current || !window.YT?.Player) return;
      ytContainerRef.current.innerHTML = '<div id="yt-player-inner"></div>';

      ytPlayerRef.current = new window.YT.Player("yt-player-inner", {
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            // 2 = PAUSED
            if (e.data === 2) {
              const t = ytPlayerRef.current?.getCurrentTime() ?? 0;
              insertTimestamp(t);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      setup();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = setup;
    }

    return () => {
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
    };
  }, [videoSource, youtubeId, insertTimestamp]);

  // ── HTML5 video の pause イベント ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoSource !== "local") return;
    const onPause = () => insertTimestamp(video.currentTime);
    video.addEventListener("pause", onPause);
    return () => video.removeEventListener("pause", onPause);
  }, [videoSource, insertTimestamp]);

  // ── URLから動画を読み込む ─────────────────────────────────────────────────
  const loadFromUrl = useCallback(() => {
    const url = urlInput.trim();
    setUrlError(null);
    if (!url) return;

    const ytId = extractYoutubeId(url);
    if (ytId) {
      setYoutubeId(ytId);
      setDriveEmbedUrl(null);
      setLocalVideoUrl(null);
      setLocalFileName(null);
      setVideoSource("youtube");
      return;
    }

    const driveId = extractDriveId(url);
    if (driveId) {
      setDriveEmbedUrl(`https://drive.google.com/file/d/${driveId}/preview`);
      setYoutubeId(null);
      setLocalVideoUrl(null);
      setLocalFileName(null);
      setVideoSource("googledrive");
      return;
    }

    setUrlError(
      "YouTubeまたはGoogle DriveのURLを認識できませんでした。\ngigafile.nuの動画はダウンロード後にファイルをドロップしてください。"
    );
  }, [urlInput]);

  // ── ローカル動画ファイルを読み込む ────────────────────────────────────────
  const loadVideoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        alert("動画ファイル（MP4・MOV・WebM など）を選択してください。");
        return;
      }
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
      setLocalVideoUrl(URL.createObjectURL(file));
      setLocalFileName(file.name);
      setYoutubeId(null);
      setDriveEmbedUrl(null);
      setVideoSource("local");
    },
    [localVideoUrl]
  );

  // ── SRTファイルを読み込む ────────────────────────────────────────────────
  const loadSrtFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".srt")) {
      alert(".srt ファイルを選択してください。");
      return;
    }
    const text = await file.text();
    setSrtContent(text);
    setSrtFileName(file.name);
    setSrtErrors(null);
  }, []);

  // ── Claude でSRTチェック ─────────────────────────────────────────────────
  const runSrtCheck = useCallback(async () => {
    if (!srtContent) return;
    setIsCheckingSrt(true);
    setSrtErrors(null);
    try {
      const res = await fetch("/api/video-feedback/check-srt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srtContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSrtErrors(Array.isArray(data.errors) ? data.errors : []);
    } catch {
      alert("SRTチェック中にエラーが発生しました。");
    } finally {
      setIsCheckingSrt(false);
    }
  }, [srtContent]);

  // ── Google Drive 用: 手動タイムスタンプ挿入 ──────────────────────────────
  const insertManualTimestamp = useCallback(() => {
    const input = window.prompt(
      "タイムスタンプを入力してください（例: 1:23 または 1:23:45）"
    );
    if (!input) return;
    const parts = input.trim().split(":").map(Number);
    let sec = 0;
    if (parts.length === 2) sec = parts[0] * 60 + parts[1];
    else if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (!isNaN(sec)) insertTimestamp(sec);
  }, [insertTimestamp]);

  // ── クリップボードコピー ─────────────────────────────────────────────────
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(feedbackText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("クリップボードへのコピーに失敗しました。");
    }
  }, [feedbackText]);

  // ── 動画を指定秒数にジャンプ ─────────────────────────────────────────────
  const seekToTime = useCallback((seconds: number) => {
    if (videoSource === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
    } else if (videoSource === "local" && videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
    // Google Drive はジャンプ不可のためボタン自体を非表示にする
  }, [videoSource]);

  // ── SRTエラーをフィードバックに追加 ─────────────────────────────────────
  const addSrtErrorToFeedback = useCallback((err: SrtError) => {
    const seconds = srtTimeToSeconds(err.time);
    const stamp = formatSeconds(seconds);
    const body = err.suggestion
      ? `テロップ誤字: 「${err.text}」→「${err.suggestion}」（${err.issue}）`
      : `テロップ: 「${err.text}」${err.issue}`;
    const line = `${stamp} ${body}`;

    setFeedbackText((prev) => {
      const prefix = prev.length > 0 && !prev.endsWith("\n") ? "\n" : "";
      return prev + prefix + line;
    });
  }, []);

  // ── ファイルインプット起動ヘルパー ──────────────────────────────────────
  const openFileInput = (accept: string, onFile: (f: File) => void) => {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = accept;
    el.onchange = () => {
      const f = el.files?.[0];
      if (f) onFile(f);
    };
    el.click();
  };

  const feedbackLineCount = feedbackText
    .split("\n")
    .filter((l) => l.trim()).length;

  // ─── レンダー ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          （ディレクター向け）動画フィードバックツール
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          動画を再生・一時停止するとタイムスタンプが自動挿入されます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── 左カラム: 動画 + SRT ────────────────────────────────────── */}
        <div className="space-y-4">
          {/* 動画読み込みエリア */}
          <section className="bg-white border border-(--border) rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-(--foreground) mb-3">
              動画を読み込む
            </h2>

            {/* URL入力 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && loadFromUrl()}
                placeholder="YouTube / Google Drive の共有URLを貼り付け"
                className="flex-1 border border-(--border) rounded-lg px-3 py-2 text-sm text-(--foreground) placeholder-gray-400 focus:outline-none focus:border-(--primary) bg-white"
              />
              <button
                onClick={loadFromUrl}
                className="px-4 py-2 bg-(--primary) hover:opacity-90 text-white text-sm rounded-lg transition-opacity"
              >
                読み込み
              </button>
            </div>
            {urlError && (
              <p className="mt-2 text-xs text-red-500 whitespace-pre-line">
                {urlError}
              </p>
            )}

            <div className="relative my-3 flex items-center gap-2">
              <hr className="flex-1 border-(--border)" />
              <span className="text-xs text-(--muted)">または</span>
              <hr className="flex-1 border-(--border)" />
            </div>

            {/* ファイルドロップゾーン */}
            <div
              role="button"
              tabIndex={0}
              onDragOver={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDraggingVideo(true);
              }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDraggingVideo(false);
                const f = e.dataTransfer.files[0];
                if (f) loadVideoFile(f);
              }}
              onClick={() => openFileInput("video/*", loadVideoFile)}
              onKeyDown={(e) =>
                e.key === "Enter" && openFileInput("video/*", loadVideoFile)
              }
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                isDraggingVideo
                  ? "border-(--primary) bg-blue-50"
                  : "border-(--border) hover:border-gray-400"
              }`}
            >
              {localFileName ? (
                <p className="text-sm text-(--primary) font-medium">
                  ✓ {localFileName}
                </p>
              ) : (
                <>
                  <p className="text-sm text-(--muted)">
                    動画ファイルをドロップ、またはクリックして選択
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    MP4・MOV・WebM など ／ gigafile.nu からダウンロードした動画もここへ
                  </p>
                </>
              )}
            </div>
          </section>

          {/* プレイヤー */}
          {videoSource && (
            <section className="bg-white border border-(--border) rounded-xl overflow-hidden shadow-sm">
              {videoSource === "youtube" && (
                <div ref={ytContainerRef} className="aspect-video w-full" />
              )}

              {videoSource === "googledrive" && driveEmbedUrl && (
                <>
                  <iframe
                    src={driveEmbedUrl}
                    className="aspect-video w-full"
                    allow="autoplay"
                    allowFullScreen
                    title="Google Drive 動画プレイヤー"
                  />
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
                    <p className="text-xs text-amber-700">
                      Google Drive は自動タイムスタンプ非対応 ― 一時停止したら手動で挿入してください
                    </p>
                    <button
                      onClick={insertManualTimestamp}
                      className="ml-3 shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded-lg transition-colors"
                    >
                      📍 タイムスタンプを挿入
                    </button>
                  </div>
                </>
              )}

              {videoSource === "local" && localVideoUrl && (
                <video
                  ref={videoRef}
                  src={localVideoUrl}
                  controls
                  className="w-full aspect-video bg-black"
                />
              )}
            </section>
          )}

          {/* SRTセクション */}
          <section className="bg-white border border-(--border) rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-(--foreground)">
                  SRTファイル{" "}
                  <span className="font-normal text-(--muted) text-xs">
                    （任意）
                  </span>
                </h2>
                <p className="text-xs text-(--muted) mt-0.5">
                  テロップの誤字・表記ゆれ・文法をAIでチェック
                </p>
              </div>
              {srtContent && (
                <button
                  onClick={runSrtCheck}
                  disabled={isCheckingSrt}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                >
                  {isCheckingSrt ? "チェック中…" : "AIチェック実行"}
                </button>
              )}
            </div>

            <div
              role="button"
              tabIndex={0}
              onDragOver={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDraggingSrt(true);
              }}
              onDragLeave={() => setIsDraggingSrt(false)}
              onDrop={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDraggingSrt(false);
                const f = e.dataTransfer.files[0];
                if (f) loadSrtFile(f);
              }}
              onClick={() => openFileInput(".srt", loadSrtFile)}
              onKeyDown={(e) =>
                e.key === "Enter" && openFileInput(".srt", loadSrtFile)
              }
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                isDraggingSrt
                  ? "border-purple-400 bg-purple-50"
                  : "border-(--border) hover:border-gray-400"
              }`}
            >
              <p className="text-sm text-(--muted)">
                {srtFileName ? (
                  <span className="text-purple-600 font-medium">
                    ✓ {srtFileName}
                  </span>
                ) : (
                  "SRTファイルをドロップ、またはクリックして選択"
                )}
              </p>
            </div>

            {/* チェック結果 */}
            {srtErrors !== null && (
              <div className="mt-3">
                {srtErrors.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <span>✓</span>
                    <span>問題は見つかりませんでした</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-(--muted) mb-2">
                      {srtErrors.length} 件の問題が見つかりました
                    </p>
                    <ul className="max-h-52 overflow-y-auto space-y-2">
                      {srtErrors.map((err, i) => (
                        <li
                          key={i}
                          className="bg-gray-50 border border-(--border) rounded-lg p-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-gray-400">
                                  #{err.index}
                                </span>
                                <span className="font-mono text-purple-600">
                                  {err.time.split("-->")[0].trim()}
                                </span>
                                <span className="text-red-500 font-medium">
                                  {err.issue}
                                </span>
                              </div>
                              <p className="text-(--foreground)">元: {err.text}</p>
                              {err.suggestion && (
                                <p className="text-green-600 mt-0.5">
                                  → {err.suggestion}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => addSrtErrorToFeedback(err)}
                                className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-[10px] whitespace-nowrap transition-colors"
                              >
                                + FBに追加
                              </button>
                              {videoSource && videoSource !== "googledrive" && (
                                <button
                                  onClick={() => seekToTime(srtTimeToSeconds(err.time))}
                                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] whitespace-nowrap transition-colors"
                                >
                                  ▶ ジャンプ
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── 右カラム: フィードバック ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-24">
          <section className="bg-white border border-(--border) rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-(--foreground)">
                  フィードバック
                </h2>
                <p className="text-xs text-(--muted) mt-0.5">
                  {videoSource === "youtube" || videoSource === "local"
                    ? "一時停止するとタイムスタンプが自動挿入されます"
                    : "動画を見ながらフィードバックを記入してください"}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                disabled={!feedbackText}
                className={`shrink-0 px-4 py-2 text-sm rounded-lg transition-all ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-(--foreground) hover:opacity-80 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                {copied ? "✓ コピー完了" : "クリップボードにコピー"}
              </button>
            </div>

            <textarea
              ref={feedbackRef}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={`[00:15] タイトルのフォントが細すぎます\n[01:23] BGMが急に大きくなっています\n[02:45] テロップ誤字: 「編集者」→「編集社」`}
              className="w-full min-h-[28rem] resize-none border border-(--border) rounded-lg p-3 text-sm text-(--foreground) placeholder-gray-300 font-mono leading-relaxed focus:outline-none focus:border-(--primary) bg-white"
            />

            <div className="mt-2 flex items-center justify-between text-xs text-(--muted)">
              <span>
                {feedbackLineCount > 0
                  ? `${feedbackLineCount} 件のフィードバック`
                  : "フィードバックなし"}
              </span>
              {feedbackText && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "フィードバックをすべて削除しますか？\nこの操作は取り消せません。"
                      )
                    ) {
                      setFeedbackText("");
                    }
                  }}
                  className="text-red-400 hover:text-red-500"
                >
                  クリア
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

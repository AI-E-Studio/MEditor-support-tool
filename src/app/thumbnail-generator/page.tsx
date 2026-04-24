"use client";

import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";
import { useState } from "react";

interface GeneratedImage {
  mimeType: string;
  data: string;
}

type Genre =
  | "auto"
  | "business"
  | "entertainment"
  | "education"
  | "vlog"
  | "game"
  | "news";

const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: "auto", label: "自動判定" },
  { value: "business", label: "ビジネス・副業" },
  { value: "entertainment", label: "エンタメ・バラエティ" },
  { value: "education", label: "教育・解説" },
  { value: "vlog", label: "Vlog・日常" },
  { value: "game", label: "ゲーム実況" },
  { value: "news", label: "ニュース・時事" },
];

export default function ThumbnailGeneratorPage() {
  const [catchCopy, setCatchCopy] = useState("");
  const [subText, setSubText] = useState("");
  const [genre, setGenre] = useState<Genre>("auto");
  const [style, setStyle] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setError("");
    const text = catchCopy.trim();
    if (!text) {
      setError("キャッチコピーを入力してください");
      return;
    }
    setLoading(true);
    setImages([]);
    try {
      const res = await fetch("/api/thumbnail-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catchCopy: text,
          subText: subText.trim(),
          genre,
          style: style.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "生成に失敗しました");
      }
      const data = (await res.json()) as { images: GeneratedImage[] };
      if (!data.images?.length) {
        throw new Error("画像が生成されませんでした。少し時間をおいて再度お試しください");
      }
      setImages(data.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const download = (img: GeneratedImage, idx: number) => {
    const link = document.createElement("a");
    link.href = `data:${img.mimeType};base64,${img.data}`;
    const ext = img.mimeType.split("/")[1] || "png";
    link.download = `thumbnail-${Date.now()}-${idx + 1}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-(--muted) hover:text-(--primary)"
            >
              ← ツール一覧に戻る
            </Link>
            <h1 className="text-xl font-bold text-(--foreground) mt-1">
              簡易サムネイル生成ツール
            </h1>
            <p className="text-sm text-(--muted) mt-0.5">
              キャッチコピーから日本のYouTube風サムネイルをAIで生成します
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                キャッチコピー <span className="text-red-600">*</span>
              </label>
              <textarea
                value={catchCopy}
                onChange={(e) => setCatchCopy(e.target.value)}
                placeholder="例）知らなきゃ損する副業5選"
                rows={2}
                maxLength={60}
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
              <p className="text-xs text-(--muted) mt-1">
                サムネイル上にメインとして大きく表示されます（20〜30文字程度が目安）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                サブテキスト（任意）
              </label>
              <input
                type="text"
                value={subText}
                onChange={(e) => setSubText(e.target.value)}
                placeholder="例）プロが本気で解説"
                maxLength={30}
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
              <p className="text-xs text-(--muted) mt-1">
                キャッチコピーの上か下に小さめに添える補助テキスト
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                ジャンル
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGenre(g.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      genre === g.value
                        ? "border-(--primary) bg-(--primary) text-white"
                        : "border-(--border) bg-white hover:border-(--primary)"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-(--foreground) mb-1.5">
                テーマ・雰囲気の補足（任意）
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="例）赤×黄色で派手目、驚いた男性の顔をメインに"
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
            </div>

            <button
              type="button"
              onClick={generate}
              disabled={loading || !catchCopy.trim()}
              className="w-full rounded-lg bg-(--primary) text-white py-3 font-semibold hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "生成中..." : "サムネイルを生成"}
            </button>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 whitespace-pre-wrap">
                {error}
              </p>
            )}
          </div>
        </section>

        {loading && images.length === 0 && (
          <div className="text-center py-12 rounded-xl border border-(--border) bg-white">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-(--border) border-t-(--primary)" />
            <p className="text-sm text-(--muted) mt-4">
              AIがサムネイルを生成しています… 10〜30秒ほどかかります
            </p>
          </div>
        )}

        {images.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-(--foreground) mb-4">
              生成結果
            </h2>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-(--border) bg-white p-3 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${img.mimeType};base64,${img.data}`}
                    alt={`サムネイル ${idx + 1}`}
                    className="w-full h-auto rounded-lg bg-(--accent)"
                  />
                  <button
                    type="button"
                    onClick={() => download(img, idx)}
                    className="w-full mt-3 rounded-lg border border-(--primary) text-(--primary) py-2 text-sm font-semibold hover:bg-(--primary) hover:text-white transition-colors"
                  >
                    ダウンロード
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-(--muted) mt-4">
              ※ AI生成のため、日本語テキストが崩れて出力される場合があります。気に入らなければ再生成するか、画像編集ソフトで文字を差し替えてください。
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

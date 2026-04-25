import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "簡易サムネイル生成ツール | 動画編集者サポートツール",
  description:
    "キャッチコピーを入力するだけで、Gemini AI が日本のYouTubeらしいサムネイル画像を自動生成します。",
};

export default function ThumbnailGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YouTube リサーチツール | 動画編集者サポートツール",
  description:
    "キーワード・チャンネルでYouTube動画をリサーチ。拡散率ランキング・コメント分析・関連キーワード抽出に対応。",
};

export default function YoutubeResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

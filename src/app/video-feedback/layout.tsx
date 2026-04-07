import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "（ディレクター向け）動画フィードバックツール | 動画編集者サポートツール",
  description:
    "動画を再生しながら編集者へのフィードバックをタイムスタンプ付きでリアルタイム記録。SRTファイルのテロップ誤字チェックも対応。",
};

export default function VideoFeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

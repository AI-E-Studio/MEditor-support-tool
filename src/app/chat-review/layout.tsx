import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "クライアントチャット添削ツール | 動画編集者サポートツール",
  description:
    "クライアントとのチャット履歴を貼り付けるだけで、自分(編集者)側で改善すべきコミュニケーションのポイントをAIが指摘します。",
};

export default function ChatReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

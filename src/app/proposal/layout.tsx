import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "提案書ジェネレーター | 動画編集者サポートツール",
  description:
    "クライアントヒアリングからAI戦略立案、提案書ドラフト作成までを支援します。",
};

export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

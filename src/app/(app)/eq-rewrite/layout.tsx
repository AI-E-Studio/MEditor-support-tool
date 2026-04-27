import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EQリライトツール | 動画編集者サポートツール",
  description:
    "クライアントとのやりとりメッセージを、相手にちゃんと感情が届く高EQ文章にリライトします。",
};

export default function EqRewriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

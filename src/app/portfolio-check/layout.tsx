import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ポートフォリオ魅力度チェックツール（β版）| 動画編集者サポートツール",
  description:
    "ポートフォリオサイトのURLを入力するだけで、作例の見せ方・プロフィールの信頼性・料金/納期/対応範囲の明記・問い合わせ導線の4観点をAIが採点し、改善アクションを提示します。",
};

export default function PortfolioCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

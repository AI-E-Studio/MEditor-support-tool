import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "提案書AIジェネレーター | 動画編集フリーランス向け",
  description:
    "クライアントヒアリングからAI戦略立案、提案書作成まで一気通貫で完結",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}

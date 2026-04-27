/**
 * ツールカード用のサムネイルコンポーネント。
 * 各ツールのテーマに合った抽象的SVGイラストをグラデーション背景上に描く。
 */
import type { ReactElement } from "react";

export type ToolThumbnailKind =
  | "proposal"
  | "portfolio"
  | "eq-rewrite"
  | "chat-review"
  | "video-feedback"
  | "youtube"
  | "thumbnail-gen"
  | "plugin-cut"
  | "plugin-text";

interface Props {
  kind: ToolThumbnailKind;
  className?: string;
}

const GRADIENT: Record<ToolThumbnailKind, string> = {
  proposal: "from-[#2651A6] to-[#52B5F2]",
  portfolio: "from-orange-400 to-rose-400",
  "eq-rewrite": "from-pink-400 to-fuchsia-500",
  "chat-review": "from-sky-400 to-cyan-500",
  "video-feedback": "from-red-500 to-orange-500",
  youtube: "from-rose-500 to-red-600",
  "thumbnail-gen": "from-violet-500 to-purple-600",
  "plugin-cut": "from-emerald-500 to-teal-500",
  "plugin-text": "from-amber-500 to-yellow-500",
};

export function ToolThumbnail({ kind, className = "" }: Props) {
  return (
    <div
      className={`shrink-0 rounded-lg bg-gradient-to-br ${GRADIENT[kind]} grid place-items-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {ICONS[kind]}
      </svg>
    </div>
  );
}

// 共通スタイル
const stroke = {
  stroke: "white",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
const fillWhite = { fill: "white" };

const ICONS: Record<ToolThumbnailKind, ReactElement> = {
  // 提案書: ドキュメント+ハート/星
  proposal: (
    <g>
      <rect
        x="26"
        y="20"
        width="38"
        height="50"
        rx="5"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <path d="M34 32 L56 32" {...stroke} />
      <path d="M34 40 L56 40" {...stroke} />
      <path d="M34 48 L48 48" {...stroke} />
      <circle cx="64" cy="64" r="11" fill="#FFD166" />
      <path
        d="M64 58 L65.6 62.5 L70 63 L66.6 66 L67.5 70.5 L64 68.2 L60.5 70.5 L61.4 66 L58 63 L62.4 62.5 Z"
        fill="#2651A6"
      />
    </g>
  ),

  // ポートフォリオ: ブラウザウィンドウ+評価
  portfolio: (
    <g>
      <rect
        x="14"
        y="22"
        width="68"
        height="50"
        rx="5"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <path d="M14 32 L82 32" {...stroke} />
      <circle cx="20" cy="27" r="1.5" {...fillWhite} />
      <circle cx="25" cy="27" r="1.5" {...fillWhite} />
      <circle cx="30" cy="27" r="1.5" {...fillWhite} />
      <rect x="22" y="40" width="22" height="14" rx="2" {...fillWhite} opacity="0.85" />
      <rect x="50" y="40" width="22" height="14" rx="2" fill="rgba(255,255,255,0.4)" />
      <path d="M48 62 L50 64 L48 64 L46 67 L44 64 L42 64 L44 62" {...stroke} />
      <circle cx="48" cy="62" r="5" fill="#FFD166" />
    </g>
  ),

  // EQリライト: 2つの吹き出し(ノーマル→温かい)
  "eq-rewrite": (
    <g>
      <path
        d="M16 28 Q16 22 22 22 L42 22 Q48 22 48 28 L48 38 Q48 44 42 44 L28 44 L22 50 L24 44 L22 44 Q16 44 16 38 Z"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <path d="M24 30 L40 30" {...stroke} />
      <path d="M24 36 L36 36" {...stroke} />
      <path
        d="M48 56 Q48 50 54 50 L74 50 Q80 50 80 56 L80 66 Q80 72 74 72 L60 72 L54 78 L56 72 L54 72 Q48 72 48 66 Z"
        {...stroke}
        fill="rgba(255,255,255,0.25)"
      />
      <path
        d="M58 64 C56 60 60 58 62 60 C64 58 68 60 66 64 L62 68 Z"
        fill="#FFB6D5"
      />
      <path
        d="M70 64 C68 60 72 58 74 60 C76 58 80 60 78 64 L74 68 Z"
        fill="#FFD166"
      />
    </g>
  ),

  // チャット添削: 吹き出し+鉛筆
  "chat-review": (
    <g>
      <path
        d="M14 28 Q14 22 20 22 L60 22 Q66 22 66 28 L66 50 Q66 56 60 56 L34 56 L24 64 L26 56 L20 56 Q14 56 14 50 Z"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <path d="M22 32 L58 32" {...stroke} />
      <path d="M22 40 L52 40" {...stroke} />
      <path d="M22 48 L42 48" {...stroke} />
      <g transform="translate(60 50) rotate(35)">
        <rect x="-3" y="-22" width="6" height="22" {...fillWhite} />
        <path d="M-3 0 L3 0 L0 6 Z" {...fillWhite} />
        <rect x="-3" y="-26" width="6" height="4" fill="#FFD166" />
      </g>
    </g>
  ),

  // 動画フィードバック: 再生ボタン+タイムライン+コメント
  "video-feedback": (
    <g>
      <rect
        x="14"
        y="20"
        width="68"
        height="40"
        rx="5"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <path d="M40 30 L40 50 L58 40 Z" {...fillWhite} />
      <path d="M14 66 L82 66" {...stroke} />
      <circle cx="32" cy="66" r="3" {...fillWhite} />
      <circle cx="56" cy="66" r="3" {...fillWhite} />
      <circle cx="72" cy="66" r="3" fill="#FFD166" />
      <path d="M68 74 L72 70 L76 70 L76 80 L68 80 Z" fill="rgba(255,255,255,0.6)" />
    </g>
  ),

  // YouTubeリサーチ: 棒グラフ+虫眼鏡
  youtube: (
    <g>
      <rect x="20" y="44" width="10" height="22" rx="2" {...fillWhite} opacity="0.7" />
      <rect x="34" y="32" width="10" height="34" rx="2" {...fillWhite} opacity="0.85" />
      <rect x="48" y="22" width="10" height="44" rx="2" {...fillWhite} />
      <rect x="62" y="38" width="10" height="28" rx="2" {...fillWhite} opacity="0.7" />
      <circle cx="68" cy="68" r="10" {...stroke} fill="rgba(255,255,255,0.2)" />
      <path d="M76 76 L84 84" {...stroke} strokeWidth={3} />
    </g>
  ),

  // サムネイル生成: 画像枠+きらめき
  "thumbnail-gen": (
    <g>
      <rect
        x="14"
        y="22"
        width="60"
        height="42"
        rx="4"
        {...stroke}
        fill="rgba(255,255,255,0.15)"
      />
      <circle cx="28" cy="36" r="4" fill="#FFD166" />
      <path
        d="M14 64 L30 50 L42 60 L54 44 L74 64 Z"
        fill="rgba(255,255,255,0.7)"
      />
      <path
        d="M76 24 L78 30 L84 32 L78 34 L76 40 L74 34 L68 32 L74 30 Z"
        fill="#FFD166"
      />
      <path
        d="M64 70 L65 73 L68 74 L65 75 L64 78 L63 75 L60 74 L63 73 Z"
        fill="white"
      />
    </g>
  ),

  // プラグイン: 自動カット (ハサミ+クリップ)
  "plugin-cut": (
    <g>
      <path
        d="M20 76 L60 36"
        {...stroke}
        strokeWidth={3}
      />
      <path
        d="M40 76 L60 56"
        {...stroke}
        strokeWidth={3}
      />
      <circle cx="20" cy="76" r="7" {...stroke} fill="rgba(255,255,255,0.2)" />
      <circle cx="40" cy="76" r="7" {...stroke} fill="rgba(255,255,255,0.2)" />
      <rect x="62" y="32" width="22" height="10" rx="2" {...fillWhite} />
      <path d="M64 36 L82 36" stroke="#0F766E" strokeWidth={1.5} />
      <path d="M64 40 L82 40" stroke="#0F766E" strokeWidth={1.5} />
    </g>
  ),

  // プラグイン: テロップ位置矯正 (T+揃えガイド)
  "plugin-text": (
    <g>
      <text
        x="48"
        y="56"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontSize="46"
        fontWeight="900"
        fill="white"
      >
        T
      </text>
      <path d="M16 24 L80 24" {...stroke} strokeWidth={2} strokeDasharray="3 3" />
      <path d="M16 72 L80 72" {...stroke} strokeWidth={2} strokeDasharray="3 3" />
      <path d="M48 16 L48 80" {...stroke} strokeWidth={1.5} strokeDasharray="2 4" opacity="0.6" />
      <circle cx="48" cy="24" r="2.5" fill="#FEF3C7" />
      <circle cx="48" cy="72" r="2.5" fill="#FEF3C7" />
    </g>
  ),
};

/** 実務上の案件タイプ。プロンプトの構成・観点が切り替わる */
export type ProjectMode = "youtube_operation" | "single_production";

export interface HearingData {
  /** YouTube運用（定期投稿・シリーズ） / 単発制作（PV・採用・プロモ等・1本完結） */
  projectMode: ProjectMode;

  // クライアント基本情報
  clientName: string;
  industry: string;
  businessOverview: string;

  // 動画の目的・用途
  videoType: string;
  videoPurpose: string;
  targetAudience: string;
  publishPlatform: string;

  // 制作条件
  budget: string;
  deadline: string;
  videoLength: string;
  quantity: string;

  // 素材・要望
  existingMaterials: string;
  referenceVideos: string;
  toneAndManner: string;
  specialRequests: string;

  // 現状の課題
  currentChallenges: string;
  competitorInfo: string;
  kpi: string;
}

export interface StrategyData {
  analysis: string;
  strategy: string;
}

export interface ProposalData {
  proposal: string;
}

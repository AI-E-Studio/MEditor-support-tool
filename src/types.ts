export interface HearingData {
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

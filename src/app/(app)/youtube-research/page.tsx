"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── 型定義 ────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  channelSubscribers: number;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  spreadRate: number;
  isShort: boolean;
  tags: string[];
}

interface ChannelInfo {
  id: string;
  name: string;
  thumbnail: string;
  subscribers: number;
}

interface Comment {
  author: string;
  avatar: string;
  text: string;
  likes: number;
}

interface RelatedVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

type SearchMode = "keyword" | "channel";
type SortOrder = "viewCount" | "date" | "spreadRate";
type Period = "1m" | "3m" | "6m" | "1y" | "all";
type DurationFilter = "any" | "short" | "medium" | "long";
type VideoType = "all" | "shorts" | "regular";
type Region = "JP" | "all";
type TabType = "comments" | "related" | "keywords";

interface Filters {
  sort: SortOrder;
  period: Period;
  duration: DurationFilter;
  videoType: VideoType;
  region: Region;
  minViews: string;
  minLikes: string;
}

const DEFAULT_FILTERS: Filters = {
  sort: "viewCount",
  period: "6m",
  duration: "any",
  videoType: "all",
  region: "JP",
  minViews: "",
  minLikes: "",
};

// ─── ヘルパー ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "億";
  if (n >= 1e4) return (n / 1e4).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "千";
  return n.toLocaleString();
}

function fmtDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = +(m[1] ?? 0),
    min = +(m[2] ?? 0),
    s = +(m[3] ?? 0);
  if (h > 0)
    return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${min}:${String(s).padStart(2, "0")}`;
}

function durationSecs(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0);
}

function getPeriodDate(p: Period): string | null {
  if (p === "all") return null;
  const map: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };
  const d = new Date();
  d.setMonth(d.getMonth() - map[p]);
  return d.toISOString();
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export default function YoutubeResearchPage() {
  // 検索
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [query, setQuery] = useState("");
  const [channelQuery, setChannelQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelInfo | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // 結果
  const [results, setResults] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // モーダル
  const [modalVideo, setModalVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("comments");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsNextPage, setCommentsNextPage] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  // APIキー設定
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // refs（staleクロージャ回避）
  const resultsRef = useRef<Video[]>([]);
  const nextPageTokenRef = useRef<string | null>(null);
  const commentsRef = useRef<Comment[]>([]);
  const commentsNextPageRef = useRef<string | null>(null);
  resultsRef.current = results;
  nextPageTokenRef.current = nextPageToken;
  commentsRef.current = comments;
  commentsNextPageRef.current = commentsNextPage;

  // APIキーをlocalStorageから復元（未設定なら設定パネルを自動表示）
  useEffect(() => {
    const saved = localStorage.getItem("yt_api_key");
    if (saved) {
      setApiKey(saved);
      setApiKeyInput(saved);
    } else {
      setShowSettings(true);
    }
  }, []);

  // ── API呼び出しヘルパー ──────────────────────────────────────────────────
  const apiFetch = useCallback(
    async (
      endpoint: string,
      params: Record<string, string | null | undefined>
    ) => {
      const url = new URL(
        `/api/youtube-research/${endpoint}`,
        window.location.origin
      );
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") url.searchParams.set(k, v);
      });
      const headers: Record<string, string> = {};
      if (apiKey) headers["x-yt-api-key"] = apiKey;
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message ?? data.error ?? `HTTP ${res.status}`
        );
      }
      return res.json();
    },
    [apiKey]
  );

  // ── メイン検索 ─────────────────────────────────────────────────────────
  // performSearchImplをrefで保持してstaleクロージャを回避
  const performSearchImpl = async (
    append: boolean,
    overrideFilters?: Filters,
    overrideMode?: SearchMode,
    overrideQuery?: string,
    overrideChannel?: ChannelInfo | null
  ) => {
    const f = overrideFilters ?? filters;
    const m = overrideMode ?? mode;
    const q = overrideQuery ?? query;
    const ch = overrideChannel !== undefined ? overrideChannel : selectedChannel;

    if (!q && !ch) return;

    if (!append) {
      setResults([]);
      setNextPageToken(null);
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params: Record<string, string | null | undefined> = {
        maxResults: "30",
        order: f.sort === "spreadRate" ? "viewCount" : f.sort,
        publishedAfter: getPeriodDate(f.period),
        videoDuration: f.duration !== "any" ? f.duration : null,
        regionCode: f.region !== "all" ? f.region : null,
        pageToken: append ? nextPageTokenRef.current : null,
      };

      let data: {
        items?: { id: { videoId?: string } | string }[];
        nextPageToken?: string;
      };

      if (m === "channel" && ch) {
        data = await apiFetch("channel-videos", {
          ...params,
          channelId: ch.id,
        });
      } else {
        data = await apiFetch("search", { ...params, q });
      }

      if (!data.items?.length) {
        if (!append) setResults([]);
        setNextPageToken(null);
        return;
      }

      setNextPageToken(data.nextPageToken ?? null);

      const videoIds = data.items
        .map((item) => {
          const id = item.id;
          return typeof id === "string" ? id : id.videoId;
        })
        .filter(Boolean) as string[];

      if (!videoIds.length) {
        if (!append) setResults([]);
        return;
      }

      // 動画詳細
      const videoData = await apiFetch("videos", { id: videoIds.join(",") });
      const videos: {
        id: string;
        snippet: {
          title: string;
          channelId: string;
          channelTitle: string;
          publishedAt: string;
          thumbnails: {
            high?: { url: string };
            medium?: { url: string };
          };
          tags?: string[];
        };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
        contentDetails?: { duration?: string };
      }[] = videoData.items ?? [];

      // チャンネル情報
      const channelIds = [
        ...new Set(videos.map((v) => v.snippet.channelId)),
      ] as string[];
      const channelData = await apiFetch("channels", {
        id: channelIds.join(","),
      });
      const channelMap: Record<
        string,
        { thumbnail: string; subscribers: number }
      > = {};
      (
        channelData.items as {
          id: string;
          snippet: { thumbnails?: { default?: { url: string } } };
          statistics?: { subscriberCount?: string };
        }[]
      ).forEach((ch) => {
        channelMap[ch.id] = {
          thumbnail: ch.snippet.thumbnails?.default?.url ?? "",
          subscribers: parseInt(ch.statistics?.subscriberCount ?? "0"),
        };
      });

      // エンリッチ
      const enriched: Video[] = videos.map((v) => {
        const ch = channelMap[v.snippet.channelId] ?? {};
        const views = parseInt(v.statistics?.viewCount ?? "0");
        const subs = ch.subscribers || 1;
        const duration = v.contentDetails?.duration ?? "PT0S";
        return {
          id: v.id,
          title: v.snippet.title,
          thumbnail:
            v.snippet.thumbnails.high?.url ??
            v.snippet.thumbnails.medium?.url ??
            "",
          channelId: v.snippet.channelId,
          channelTitle: v.snippet.channelTitle,
          channelThumbnail: ch.thumbnail ?? "",
          channelSubscribers: subs,
          publishedAt: v.snippet.publishedAt,
          viewCount: views,
          likeCount: parseInt(v.statistics?.likeCount ?? "0"),
          commentCount: parseInt(v.statistics?.commentCount ?? "0"),
          duration,
          spreadRate: views / subs,
          isShort: durationSecs(duration) <= 60,
          tags: v.snippet.tags ?? [],
        };
      });

      // クライアントサイドフィルタ
      let filtered = enriched;
      if (f.videoType === "shorts") filtered = filtered.filter((v) => v.isShort);
      else if (f.videoType === "regular")
        filtered = filtered.filter((v) => !v.isShort);
      const minV = parseInt(f.minViews) || 0;
      if (minV > 0) filtered = filtered.filter((v) => v.viewCount >= minV);
      const minL = parseInt(f.minLikes) || 0;
      if (minL > 0) filtered = filtered.filter((v) => v.likeCount >= minL);

      const next = append ? [...resultsRef.current, ...filtered] : filtered;
      if (f.sort === "spreadRate") next.sort((a, b) => b.spreadRate - a.spreadRate);
      setResults(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "検索中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const performSearchRef = useRef(performSearchImpl);
  performSearchRef.current = performSearchImpl;

  const performSearch = useCallback((append = false) => {
    return performSearchRef.current(append);
  }, []);

  // ── チャンネル検索 ────────────────────────────────────────────────────
  const searchChannel = useCallback(async () => {
    if (!channelQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let channelId: string | null = null;
      const urlMatch = channelQuery.match(/channel\/([^/?]+)/);
      if (urlMatch) channelId = urlMatch[1];

      if (!channelId) {
        const data = await apiFetch("resolve-channel", {
          q: channelQuery.trim(),
        });
        const item = data.items?.[0];
        channelId =
          item?.id?.channelId ?? item?.snippet?.channelId ?? null;
      }

      if (!channelId) throw new Error("チャンネルが見つかりませんでした");

      const chData = await apiFetch("channels", { id: channelId });
      const ch = chData.items?.[0];
      if (!ch) throw new Error("チャンネル情報を取得できませんでした");

      const info: ChannelInfo = {
        id: channelId,
        name: ch.snippet.title,
        thumbnail: ch.snippet.thumbnails?.default?.url ?? "",
        subscribers: parseInt(ch.statistics?.subscriberCount ?? "0"),
      };
      setSelectedChannel(info);
      // チャンネル確定後に検索（refで最新のimplを呼ぶ）
      setLoading(false);
      return performSearchRef.current(false, undefined, "channel", "", info);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "チャンネル検索中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  }, [channelQuery, apiFetch]);

  // フィルタ変更時の自動再検索（初回検索後のみ）
  const hasSearchedRef = useRef(false);
  hasSearchedRef.current = hasSearched;
  useEffect(() => {
    if (!hasSearchedRef.current) return;
    performSearch(false);
    // filtersが変わったときだけ発火させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── モーダル ─────────────────────────────────────────────────────────
  const openModal = useCallback((video: Video) => {
    setModalVideo(video);
    setActiveTab("comments");
    setComments([]);
    setCommentsNextPage(null);
    setRelatedVideos([]);
    setKeywords([]);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setModalVideo(null);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [closeModal]);

  // ── コメント ─────────────────────────────────────────────────────────
  const loadComments = useCallback(
    async (videoId: string, append = false) => {
      setCommentsLoading(true);
      try {
        const data = await apiFetch("comments", {
          videoId,
          maxResults: "50",
          order: "relevance",
          pageToken: append ? commentsNextPageRef.current : null,
        });
        setCommentsNextPage(data.nextPageToken ?? null);
        const loaded: Comment[] = (
          data.items as {
            snippet: {
              topLevelComment: {
                snippet: {
                  authorDisplayName: string;
                  authorProfileImageUrl: string;
                  textDisplay: string;
                  likeCount: number;
                };
              };
            };
          }[]
        ).map((item) => {
          const c = item.snippet.topLevelComment.snippet;
          return {
            author: c.authorDisplayName,
            avatar: c.authorProfileImageUrl,
            text: c.textDisplay,
            likes: c.likeCount,
          };
        });
        loaded.sort((a, b) => b.likes - a.likes);
        setComments(append ? [...commentsRef.current, ...loaded] : loaded);
      } catch {
        // 無視（UIで「取得できませんでした」と表示）
      } finally {
        setCommentsLoading(false);
      }
    },
    [apiFetch]
  );

  // ── 関連動画 ─────────────────────────────────────────────────────────
  const loadRelated = useCallback(
    async (videoId: string) => {
      setRelatedLoading(true);
      try {
        const data = await apiFetch("related", { videoId });
        setRelatedVideos(
          (
            data.items as {
              id: { videoId?: string } | string;
              snippet?: {
                title: string;
                channelTitle: string;
                thumbnails?: { medium?: { url: string } };
              };
            }[]
          ).map((item) => ({
            id:
              typeof item.id === "string"
                ? item.id
                : (item.id.videoId ?? ""),
            title: item.snippet?.title ?? "",
            channelTitle: item.snippet?.channelTitle ?? "",
            thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
          }))
        );
      } catch {
        setRelatedVideos([]);
      } finally {
        setRelatedLoading(false);
      }
    },
    [apiFetch]
  );

  // ── キーワード ────────────────────────────────────────────────────────
  const loadKeywords = useCallback(
    async (video: Video) => {
      setKeywordsLoading(true);
      try {
        const titleWords = video.title
          .replace(/[【】\[\]()（）「」]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length > 1)
          .slice(0, 2)
          .join(" ");

        let suggestions: string[] = [];
        if (titleWords) {
          try {
            const sd = await apiFetch("suggest", { q: titleWords });
            suggestions = sd.suggestions ?? [];
          } catch {
            // ignore
          }
        }
        setKeywords(
          [...new Set([...suggestions, ...video.tags])].slice(0, 30)
        );
      } catch {
        setKeywords([]);
      } finally {
        setKeywordsLoading(false);
      }
    },
    [apiFetch]
  );

  // タブ切り替え時にデータ読み込み
  useEffect(() => {
    if (!modalVideo) return;
    if (activeTab === "comments" && comments.length === 0)
      loadComments(modalVideo.id);
    else if (activeTab === "related" && relatedVideos.length === 0)
      loadRelated(modalVideo.id);
    else if (activeTab === "keywords" && keywords.length === 0)
      loadKeywords(modalVideo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, modalVideo]);

  // ── フィルターボタン ──────────────────────────────────────────────────
  const FilterBtn = ({
    value,
    current,
    onSelect,
    children,
  }: {
    value: string;
    current: string;
    onSelect: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => onSelect(value)}
      className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
        current === value
          ? "bg-(--primary) text-white"
          : "bg-(--accent) hover:bg-gray-200 text-(--foreground)"
      }`}
    >
      {children}
    </button>
  );

  // ── レンダー ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            YouTube リサーチツール
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            キーワードやチャンネルでYouTube動画をリサーチ・分析
          </p>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors"
        >
          ⚙ APIキー設定
        </button>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-[#0F172A] shrink-0">
              YouTube Data API キー
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const k = apiKeyInput.trim();
                  if (k) {
                    setApiKey(k);
                    localStorage.setItem("yt_api_key", k);
                  }
                  setShowSettings(false);
                }
              }}
              placeholder="AIza..."
              className="flex-1 min-w-0 max-w-sm border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#2651A6] focus:ring-2 focus:ring-[#52B5F2]/30"
            />
            <button
              onClick={() => {
                const k = apiKeyInput.trim();
                if (k) {
                  setApiKey(k);
                  localStorage.setItem("yt_api_key", k);
                }
                setShowSettings(false);
              }}
              className="h-8 px-3 bg-[#2651A6] text-white text-sm font-semibold rounded-md hover:bg-[#1E3F80] active:bg-[#163066] transition-colors"
            >
              保存して閉じる
            </button>
            <Link
              href="/youtube-research/api-key-guide"
              className="text-xs text-[#2651A6] hover:underline shrink-0"
              target="_blank"
            >
              APIキーの取得方法 →
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* 検索エリア */}
        <div className="bg-white border border-(--border) rounded-xl p-4 shadow-sm">
          <div className="flex gap-2 mb-4">
            {(
              [
                ["keyword", "キーワード検索"],
                ["channel", "チャンネル検索"],
              ] as [SearchMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  if (m === "keyword") setSelectedChannel(null);
                }}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === m
                    ? "bg-(--primary) text-white"
                    : "bg-(--accent) text-(--foreground) hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "keyword" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch(false)}
                placeholder="検索キーワードを入力..."
                className="flex-1 border border-(--border) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
              />
              <button
                onClick={() => performSearch(false)}
                disabled={!query.trim() || loading}
                className="px-5 py-2 bg-(--primary) text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                検索
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchChannel()}
                  placeholder="チャンネル名・@ハンドル・URLを入力..."
                  className="flex-1 border border-(--border) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary)"
                />
                <button
                  onClick={searchChannel}
                  disabled={!channelQuery.trim() || loading}
                  className="px-5 py-2 bg-(--primary) text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  検索
                </button>
              </div>
              {selectedChannel && (
                <div className="flex items-center gap-3 bg-(--accent) rounded-lg px-3 py-2">
                  {selectedChannel.thumbnail && (
                    <img
                      src={selectedChannel.thumbnail}
                      className="w-8 h-8 rounded-full"
                      alt=""
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-(--foreground) truncate">
                      {selectedChannel.name}
                    </p>
                    <p className="text-xs text-(--muted)">
                      登録者 {fmt(selectedChannel.subscribers)}人
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedChannel(null);
                      setResults([]);
                      setHasSearched(false);
                    }}
                    className="text-xs text-(--muted) hover:text-red-500 transition-colors"
                  >
                    ✕ 解除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-white border border-(--border) rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 並び順 */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">並び順</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["viewCount", "再生数"],
                    ["date", "新着"],
                    ["spreadRate", "拡散率"],
                  ] as [SortOrder, string][]
                ).map(([v, l]) => (
                  <FilterBtn
                    key={v}
                    value={v}
                    current={filters.sort}
                    onSelect={(val) =>
                      setFilters((f) => ({ ...f, sort: val as SortOrder }))
                    }
                  >
                    {l}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* 期間 */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">期間</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["1m", "1ヶ月"],
                    ["3m", "3ヶ月"],
                    ["6m", "6ヶ月"],
                    ["1y", "1年"],
                    ["all", "全期間"],
                  ] as [Period, string][]
                ).map(([v, l]) => (
                  <FilterBtn
                    key={v}
                    value={v}
                    current={filters.period}
                    onSelect={(val) =>
                      setFilters((f) => ({ ...f, period: val as Period }))
                    }
                  >
                    {l}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* 動画時間 */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">動画時間</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["any", "指定なし"],
                    ["short", "4分未満"],
                    ["medium", "4〜20分"],
                    ["long", "20分超"],
                  ] as [DurationFilter, string][]
                ).map(([v, l]) => (
                  <FilterBtn
                    key={v}
                    value={v}
                    current={filters.duration}
                    onSelect={(val) =>
                      setFilters((f) => ({ ...f, duration: val as DurationFilter }))
                    }
                  >
                    {l}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* 動画種別 */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">種別</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["all", "すべて"],
                    ["regular", "通常"],
                    ["shorts", "ショート"],
                  ] as [VideoType, string][]
                ).map(([v, l]) => (
                  <FilterBtn
                    key={v}
                    value={v}
                    current={filters.videoType}
                    onSelect={(val) =>
                      setFilters((f) => ({ ...f, videoType: val as VideoType }))
                    }
                  >
                    {l}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* 地域 */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">地域</p>
              <div className="flex flex-wrap gap-1">
                <FilterBtn
                  value="JP"
                  current={filters.region}
                  onSelect={(val) =>
                    setFilters((f) => ({ ...f, region: val as Region }))
                  }
                >
                  日本
                </FilterBtn>
                <FilterBtn
                  value="all"
                  current={filters.region}
                  onSelect={(val) =>
                    setFilters((f) => ({ ...f, region: val as Region }))
                  }
                >
                  全世界
                </FilterBtn>
              </div>
            </div>

            {/* 最低再生数/いいね */}
            <div>
              <p className="text-xs font-medium text-(--muted) mb-1.5">
                最低 再生数 / いいね
              </p>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={filters.minViews}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minViews: e.target.value }))
                  }
                  placeholder="再生数"
                  className="w-full border border-(--border) rounded px-2 py-1 text-xs focus:outline-none"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.minLikes}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minLikes: e.target.value }))
                  }
                  placeholder="いいね"
                  className="w-full border border-(--border) rounded px-2 py-1 text-xs focus:outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            エラー: {error}
          </div>
        )}

        {/* ローディング */}
        {loading && results.length === 0 && (
          <div className="text-center py-20 text-(--muted)">
            <div className="text-3xl mb-3 animate-spin inline-block">⟳</div>
            <p className="text-sm">検索中...</p>
          </div>
        )}

        {/* 空 */}
        {hasSearched && !loading && results.length === 0 && !error && (
          <div className="text-center py-20 text-(--muted)">
            <p className="text-lg mb-2">動画が見つかりませんでした</p>
            <p className="text-sm">検索キーワードやフィルターを変えてみてください</p>
          </div>
        )}

        {/* 検索結果 */}
        {results.length > 0 && (
          <>
            <p className="text-sm text-(--muted)">{results.length} 件の動画</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {results.map((video) => (
                <button
                  key={video.id}
                  onClick={() => openModal(video)}
                  className="bg-white border border-(--border) rounded-xl overflow-hidden text-left hover:shadow-md hover:border-(--primary) transition-all"
                >
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {parseDuration(video.duration)}
                    </span>
                    {video.isShort && (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        SHORT
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-(--foreground) line-clamp-2 leading-snug mb-1">
                      {video.title}
                    </p>
                    <p className="text-xs text-(--muted) truncate">
                      {video.channelTitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-(--muted)">
                        {fmt(video.viewCount)}回
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-(--muted)">
                        {fmtDate(video.publishedAt)}
                      </span>
                      {video.spreadRate >= 1 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          ×{video.spreadRate.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {nextPageToken && (
              <div className="text-center pt-2 pb-6">
                <button
                  onClick={() => performSearch(true)}
                  disabled={loading}
                  className="px-6 py-2.5 border border-(--border) rounded-lg text-sm text-(--foreground) hover:bg-(--accent) disabled:opacity-50 transition-colors"
                >
                  {loading ? "読み込み中..." : "もっと見る"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 動画詳細モーダル */}
      {modalVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 flex flex-col overflow-hidden">
            {/* モーダルヘッダー */}
            <div className="flex items-start gap-3 p-4 border-b border-(--border)">
              <img
                src={modalVideo.thumbnail}
                className="w-28 shrink-0 rounded-lg aspect-video object-cover"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-(--foreground) line-clamp-2">
                  {modalVideo.title}
                </h2>
                <p className="text-xs text-(--muted) mt-0.5">
                  {modalVideo.channelTitle}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs text-(--muted)">
                    {fmt(modalVideo.viewCount)}回再生
                  </span>
                  <span className="text-xs text-(--muted)">
                    {fmtDate(modalVideo.publishedAt)}
                  </span>
                  {modalVideo.spreadRate >= 1 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      拡散率 ×{modalVideo.spreadRate.toFixed(1)}
                    </span>
                  )}
                  <a
                    href={`https://www.youtube.com/watch?v=${modalVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    YouTubeで見る →
                  </a>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-(--muted) hover:text-(--foreground) text-xl shrink-0 leading-none"
              >
                ✕
              </button>
            </div>

            {/* タブ */}
            <div className="flex border-b border-(--border)">
              {(
                [
                  ["comments", "コメント"],
                  ["related", "関連動画"],
                  ["keywords", "キーワード"],
                ] as [TabType, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-(--primary) border-b-2 border-(--primary)"
                      : "text-(--muted) hover:text-(--foreground)"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* タブコンテンツ */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* コメント */}
              {activeTab === "comments" && (
                <div>
                  {commentsLoading && comments.length === 0 && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      読み込み中...
                    </p>
                  )}
                  {!commentsLoading && comments.length === 0 && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      コメントを取得できませんでした
                    </p>
                  )}
                  <div className="space-y-4">
                    {comments.map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <img
                          src={c.avatar}
                          className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                          alt=""
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-(--foreground)">
                            {c.author}
                          </p>
                          <p
                            className="text-xs text-(--foreground) mt-0.5 leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: c.text }}
                          />
                          {c.likes > 0 && (
                            <p className="text-xs text-(--muted) mt-0.5">
                              👍 {fmt(c.likes)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {commentsNextPage && (
                    <button
                      onClick={() => loadComments(modalVideo.id, true)}
                      disabled={commentsLoading}
                      className="mt-4 w-full py-2 border border-(--border) rounded-lg text-xs text-(--muted) hover:bg-(--accent) disabled:opacity-50 transition-colors"
                    >
                      もっと読み込む
                    </button>
                  )}
                </div>
              )}

              {/* 関連動画 */}
              {activeTab === "related" && (
                <div>
                  {relatedLoading && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      読み込み中...
                    </p>
                  )}
                  {!relatedLoading && relatedVideos.length === 0 && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      関連動画が見つかりませんでした
                    </p>
                  )}
                  <div className="space-y-2">
                    {relatedVideos.map((v) => (
                      <a
                        key={v.id}
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-2 hover:bg-(--accent) rounded-lg p-1.5 transition-colors"
                      >
                        <img
                          src={v.thumbnail}
                          className="w-24 rounded aspect-video object-cover shrink-0"
                          alt=""
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-(--foreground) line-clamp-2">
                            {v.title}
                          </p>
                          <p className="text-xs text-(--muted) mt-0.5">
                            {v.channelTitle}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* キーワード */}
              {activeTab === "keywords" && (
                <div>
                  {keywordsLoading && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      読み込み中...
                    </p>
                  )}
                  {!keywordsLoading && keywords.length === 0 && (
                    <p className="text-sm text-(--muted) text-center py-8">
                      キーワードが見つかりませんでした
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          closeModal();
                          setMode("keyword");
                          setQuery(kw);
                          setTimeout(() => performSearch(false), 50);
                        }}
                        className="flex items-center gap-1.5 bg-(--accent) hover:bg-gray-200 rounded-lg px-3 py-1.5 text-xs transition-colors"
                      >
                        <span className="text-(--muted) text-[10px]">
                          #{i + 1}
                        </span>
                        <span className="text-(--foreground)">{kw}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

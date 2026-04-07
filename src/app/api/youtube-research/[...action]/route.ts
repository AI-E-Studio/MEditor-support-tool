import { NextResponse } from "next/server";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(request: Request): string {
  return (
    request.headers.get("x-yt-api-key") ||
    process.env.YOUTUBE_API_KEY ||
    ""
  );
}

async function ytFetch(
  endpoint: string,
  params: Record<string, string | undefined>,
  apiKey: string
): Promise<Response> {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  url.searchParams.set("key", apiKey);
  return fetch(url.toString());
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string[] }> }
) {
  const { action } = await params;
  const endpoint = action[0];
  const { searchParams } = new URL(request.url);
  const apiKey = getApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube APIキーが設定されていません。設定パネルでAPIキーを入力してください。" },
      { status: 401 }
    );
  }

  try {
    switch (endpoint) {
      // ── キーワード検索 ──────────────────────────────────────────────────
      case "search": {
        const res = await ytFetch(
          "search",
          {
            part: "snippet",
            type: "video",
            q: searchParams.get("q") ?? undefined,
            order: searchParams.get("order") ?? "viewCount",
            maxResults: searchParams.get("maxResults") ?? "30",
            pageToken: searchParams.get("pageToken") ?? undefined,
            publishedAfter: searchParams.get("publishedAfter") ?? undefined,
            publishedBefore: searchParams.get("publishedBefore") ?? undefined,
            videoDuration: searchParams.get("videoDuration") ?? undefined,
            regionCode: searchParams.get("regionCode") ?? undefined,
            channelId: searchParams.get("channelId") ?? undefined,
          },
          apiKey
        );
        const data = await res.json();
        if (data.error) return NextResponse.json(data, { status: data.error.code ?? 500 });
        return NextResponse.json(data);
      }

      // ── 動画詳細 ──────────────────────────────────────────────────────
      case "videos": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
        const res = await ytFetch(
          "videos",
          { part: "snippet,statistics,contentDetails", id },
          apiKey
        );
        return NextResponse.json(await res.json());
      }

      // ── チャンネル情報 ────────────────────────────────────────────────
      case "channels": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
        const res = await ytFetch(
          "channels",
          { part: "snippet,statistics", id },
          apiKey
        );
        return NextResponse.json(await res.json());
      }

      // ── コメント ─────────────────────────────────────────────────────
      case "comments": {
        const videoId = searchParams.get("videoId");
        if (!videoId) return NextResponse.json({ error: "videoId is required" }, { status: 400 });
        const res = await ytFetch(
          "commentThreads",
          {
            part: "snippet",
            videoId,
            maxResults: searchParams.get("maxResults") ?? "50",
            order: searchParams.get("order") ?? "relevance",
            pageToken: searchParams.get("pageToken") ?? undefined,
          },
          apiKey
        );
        return NextResponse.json(await res.json());
      }

      // ── チャンネル動画一覧 ────────────────────────────────────────────
      case "channel-videos": {
        const channelId = searchParams.get("channelId");
        if (!channelId) return NextResponse.json({ error: "channelId is required" }, { status: 400 });
        const res = await ytFetch(
          "search",
          {
            part: "snippet",
            type: "video",
            channelId,
            order: searchParams.get("order") ?? "date",
            maxResults: searchParams.get("maxResults") ?? "30",
            pageToken: searchParams.get("pageToken") ?? undefined,
            publishedAfter: searchParams.get("publishedAfter") ?? undefined,
            publishedBefore: searchParams.get("publishedBefore") ?? undefined,
          },
          apiKey
        );
        const data = await res.json();
        if (data.error) return NextResponse.json(data, { status: data.error.code ?? 500 });
        return NextResponse.json(data);
      }

      // ── Google サジェスト ─────────────────────────────────────────────
      case "suggest": {
        const q = searchParams.get("q");
        if (!q) return NextResponse.json({ suggestions: [] });
        const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&hl=ja`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const text = await res.text();
        const match = text.match(/\(([\s\S]+)\)/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          const suggestions = (parsed[1] as [string][]).map((item) => item[0]);
          return NextResponse.json({ suggestions });
        }
        return NextResponse.json({ suggestions: [] });
      }

      // ── 関連動画（タグ・タイトルで検索） ──────────────────────────────
      case "related": {
        const videoId = searchParams.get("videoId");
        if (!videoId) return NextResponse.json({ items: [] });

        const videoRes = await ytFetch(
          "videos",
          { part: "snippet", id: videoId },
          apiKey
        );
        const videoData = await videoRes.json();
        if (!videoData.items?.length) return NextResponse.json({ items: [] });

        const video = videoData.items[0];
        const tags: string[] = video.snippet.tags ?? [];
        const title: string = video.snippet.title;
        const searchTerms =
          tags.slice(0, 3).join(" ") ||
          title
            .split(/[\s\u3000]+/)
            .slice(0, 3)
            .join(" ");

        const searchRes = await ytFetch(
          "search",
          {
            part: "snippet",
            type: "video",
            q: searchTerms,
            maxResults: "15",
            order: "relevance",
          },
          apiKey
        );
        const searchData = await searchRes.json();
        if (searchData.items) {
          searchData.items = searchData.items.filter(
            (item: { id: { videoId: string } }) => item.id.videoId !== videoId
          );
        }
        return NextResponse.json(searchData);
      }

      // ── チャンネル名解決 ──────────────────────────────────────────────
      case "resolve-channel": {
        const q = searchParams.get("q");
        if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });
        const res = await ytFetch(
          "search",
          { part: "snippet", type: "channel", q, maxResults: "5" },
          apiKey
        );
        return NextResponse.json(await res.json());
      }

      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    console.error(`youtube-research [${endpoint}] error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-20250514";

// ---- 型 ----
export type CategoryKey = "works" | "profile" | "terms" | "cta";

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number; // 0-25
  summary: string;
  findings: string[];
}

export interface ActionItem {
  priority: "high" | "medium" | "low";
  category: CategoryKey;
  title: string;
  detail: string;
}

export interface AnalyzeResult {
  overallScore: number; // 0-100
  overallSummary: string;
  strengths: string[];
  categories: CategoryScore[];
  actions: ActionItem[];
}

// ---- HTML取得 & パース ----

const MAX_HTML_BYTES = 2_000_000; // 2MB
const TEXT_CAP = 12_000;
const FETCH_TIMEOUT_MS = 25_000;

// サーバー判定回避のため、最新Chromeに寄せたUA/ヘッダ
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchHtml(
  url: string
): Promise<{ html: string; finalUrl: string; contentType: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) {
      throw new Error(`URLの取得に失敗しました (HTTP ${res.status})`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      throw new Error(
        `HTMLではないコンテンツです (${contentType || "content-type不明"})`
      );
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error("HTMLサイズが大きすぎます (2MB超)");
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { html, finalUrl: res.url, contentType };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `URL取得がタイムアウトしました (${FETCH_TIMEOUT_MS / 1000}秒)。サイトの応答が遅いか、ボット判定で応答が返らなかった可能性があります。`
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

function allMatches(html: string, re: RegExp, groupIndex = 1): string[] {
  const out: string[] = [];
  const g = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : re.flags + "g"
  );
  let m: RegExpExecArray | null;
  while ((m = g.exec(html))) {
    const v = m[groupIndex];
    if (v) out.push(decodeEntities(v).trim());
  }
  return out;
}

interface PageSummary {
  url: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  headings: string[];
  text: string; // 本文抜粋 (長さ上限付き)
  imageCount: number;
  iframeHosts: string[];
  videoEmbeds: string[];
  links: { internal: number; external: number; snsLinks: string[] };
  rawByteSize: number;
}

const SNS_DOMAINS = [
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "tiktok.com",
  "facebook.com",
  "note.com",
  "github.com",
  "behance.net",
  "linkedin.com",
  "threads.net",
];

// ---- 下層ページクロール ----

const WORK_PATH_PATTERN =
  /\/(works?|portfolios?|projects?|cases?|gallery|galleries|showcase|archive|productions?|videos?|movies?|reels?|creations?|作品|実績|事例)(\/|$|\?|#)/i;

const WORK_ANCHOR_KEYWORDS = [
  "works",
  "work",
  "portfolio",
  "project",
  "case",
  "gallery",
  "showcase",
  "archive",
  "production",
  "video",
  "movie",
  "reel",
  "creation",
  "作例",
  "制作実績",
  "実績",
  "事例",
  "作品",
  "ギャラリー",
  "動画一覧",
  "動画",
  "案件",
  "view all",
  "see all",
  "view more",
  "もっと見る",
  "一覧",
];

interface Anchor {
  href: string;
  text: string;
}

function extractInternalAnchors(html: string, topUrl: string): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let baseHost = "";
  try {
    baseHost = new URL(topUrl).hostname;
  } catch {
    return out;
  }
  while ((m = re.exec(html))) {
    const href = decodeEntities(m[1]).trim();
    const text = stripTags(m[2]).slice(0, 100);
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    )
      continue;
    try {
      const u = new URL(href, topUrl);
      if (u.hostname !== baseHost) continue;
      u.hash = "";
      out.push({ href: u.toString(), text });
    } catch {
      // ignore
    }
  }
  return out;
}

function selectWorkLinks(
  anchors: Anchor[],
  topUrl: string,
  maxCount = 5
): string[] {
  const scored = new Map<string, { score: number }>();
  for (const a of anchors) {
    if (a.href === topUrl) continue;
    let score = 0;
    try {
      const u = new URL(a.href);
      if (WORK_PATH_PATTERN.test(u.pathname)) score += 3;
      // 数字末尾のパス (作品詳細ページと推定)
      if (score === 0 && /\/[0-9a-f]{3,}(\/|$)/i.test(u.pathname)) score += 1;
    } catch {
      // ignore
    }
    const t = a.text.toLowerCase();
    if (
      WORK_ANCHOR_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()))
    )
      score += 2;
    if (score > 0) {
      const prev = scored.get(a.href);
      if (!prev || prev.score < score) scored.set(a.href, { score });
    }
  }
  return Array.from(scored.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxCount)
    .map(([href]) => href);
}

interface SubPageSummary {
  url: string;
  title: string | null;
  imageCount: number;
  videoEmbeds: string[];
  iframeHosts: string[];
  textExcerpt: string;
  headings: string[];
}

async function fetchSubPage(
  url: string,
  timeoutMs = 10_000
): Promise<SubPageSummary | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) return null;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const s = summarizePage(html, res.url);
    return {
      url: s.url,
      title: s.title,
      imageCount: s.imageCount,
      videoEmbeds: s.videoEmbeds,
      iframeHosts: s.iframeHosts,
      textExcerpt: s.text.slice(0, 800),
      headings: s.headings.slice(0, 15),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function summarizePage(html: string, url: string): PageSummary {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  );
  const ogTitle = firstMatch(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i
  );
  const ogDescription = firstMatch(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
  );

  const headings = [
    ...allMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    ...allMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
    ...allMatches(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi),
  ]
    .map((t) => stripTags(t))
    .filter((t) => t && t.length <= 200)
    .slice(0, 60);

  const imageCount = (html.match(/<img\b[^>]*>/gi) ?? []).length;

  const iframeSrcs = allMatches(html, /<iframe[^>]+src=["']([^"']+)["']/gi);
  const iframeHosts: string[] = [];
  const videoEmbeds: string[] = [];
  for (const src of iframeSrcs) {
    try {
      const u = new URL(src, url);
      iframeHosts.push(u.hostname);
      if (/youtube|youtu\.be|vimeo|player\.vimeo/i.test(u.hostname)) {
        videoEmbeds.push(src);
      }
    } catch {
      // ignore invalid
    }
  }

  const hrefs = allMatches(html, /<a[^>]+href=["']([^"']+)["']/gi);
  let internal = 0;
  let external = 0;
  const snsSet = new Set<string>();
  let baseHost = "";
  try {
    baseHost = new URL(url).hostname;
  } catch {
    // ignore
  }
  for (const h of hrefs) {
    if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:"))
      continue;
    try {
      const u = new URL(h, url);
      if (u.hostname === baseHost) internal++;
      else external++;
      const host = u.hostname.toLowerCase();
      if (SNS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
        snsSet.add(host + u.pathname.split("/").slice(0, 3).join("/"));
      }
    } catch {
      // ignore
    }
  }

  const text = stripTags(html).slice(0, TEXT_CAP);

  return {
    url,
    title,
    description,
    ogTitle,
    ogDescription,
    headings,
    text,
    imageCount,
    iframeHosts: Array.from(new Set(iframeHosts)).slice(0, 20),
    videoEmbeds: Array.from(new Set(videoEmbeds)).slice(0, 30),
    links: {
      internal,
      external,
      snsLinks: Array.from(snsSet).slice(0, 20),
    },
    rawByteSize: html.length,
  };
}

// ---- プロンプト ----

const SYSTEM_PROMPT = `あなたは動画編集フリーランス向けのポートフォリオ改善コンサルタントです。
与えられた**Webサイト(HTMLから抽出した要約)**を読み取り、動画編集者のポートフォリオとしての魅力度を4つの観点で採点します。

## 採点観点 (各25点、合計100点)
1. **works (作例の見せ方)**
   - 作例/制作実績がサイトに掲載されているか、数は十分か
   - 作例のジャンル(YouTube編集/VP/広告/MV等)が整理されているか
   - サムネ・プレビュー画像の存在と量(imageCount や video embed数から推測)
   - 動画埋め込みや外部プレイヤー(YouTube/Vimeo)の数
2. **profile (プロフィールの信頼性)**
   - 編集者本人のプロフィール、経歴、得意領域、実績の数値/ブランド名があるか
   - 顔写真・自己紹介文・対応可能な編集ソフト等
3. **terms (料金/納期/対応範囲の明記)**
   - 料金表または料金の目安
   - 納期/対応スピード
   - 対応ジャンル/対応範囲(撮影/構成/モーション/縦動画 等)
   - 修正対応・NG領域の明記
4. **cta (お問い合わせ導線)**
   - 問い合わせフォーム/メール/DM などのCTAが目立つ位置にあるか
   - 問い合わせハードルが低いか(フォーム項目が多すぎない/返信時間が明記 等)
   - SNSリンクの存在

## 出力ルール
- **必ずJSONのみ出力**。前置き文章・コードフェンス・Markdown見出しは不要。
- overallScore は categories の合計と一致させる。端数は四捨五入で整数にする。
- 観点のスコアは、単に「ある/ない」だけでなく、量と質を加味する。
- findings には、その観点で読み取れた事実を簡潔に3〜5個。
- strengths は全体として良かった点を2〜4個。
- actions は合計4〜8個、優先度 high/medium/low を付ける。
- 各 action の detail は「何を」「どう」「どこに」直すかを具体的に書く。

## 出力JSONスキーマ
{
  "overallScore": 0-100の整数,
  "overallSummary": "全体講評 (3〜5文の日本語)",
  "strengths": ["良かった点", ...],
  "categories": [
    {
      "key": "works" | "profile" | "terms" | "cta",
      "label": "作例の見せ方" 等,
      "score": 0-25の整数,
      "summary": "その観点での総評 (1〜2文)",
      "findings": ["読み取れた事実", ...]
    },
    ...4件 (works, profile, terms, cta の順で必ず4件)
  ],
  "actions": [
    {
      "priority": "high" | "medium" | "low",
      "category": "works" | "profile" | "terms" | "cta",
      "title": "改善アクションの見出し",
      "detail": "具体的な改善手順 (1〜3文)"
    },
    ...
  ]
}

## 注意
- JavaScript でレンダリングされる SPA の場合、本文テキストが取得できていないことがある。その場合は overallSummary で「SPA のため本文解析不可・可能な範囲での評価」と明示し、スコアは低めに保守的に付ける。
- 情報が不足しているときに憶測で高得点を付けない。`;

function buildUserMessage(
  page: PageSummary,
  subPages: SubPageSummary[]
): string {
  const totalVideoEmbeds =
    page.videoEmbeds.length +
    subPages.reduce((s, p) => s + p.videoEmbeds.length, 0);
  const totalImages =
    page.imageCount + subPages.reduce((s, p) => s + p.imageCount, 0);

  const subBlock = subPages.length
    ? `\n## 下層ページ (作例系と推定してクロール、${subPages.length}ページ)\n` +
      subPages
        .map(
          (sp, i) => `### 下層 ${i + 1}: ${sp.url}
- title: ${sp.title ?? "(なし)"}
- 画像タグ数: ${sp.imageCount}
- 動画埋め込み (YouTube/Vimeo): ${sp.videoEmbeds.length}
${sp.videoEmbeds.slice(0, 5).map((v) => `  - ${v}`).join("\n")}
- 主な見出し: ${sp.headings.slice(0, 5).join(" / ") || "(なし)"}
- 本文抜粋: ${sp.textExcerpt.slice(0, 400)}`
        )
        .join("\n\n")
    : "\n## 下層ページ\n(作例系の内部リンクが見つからなかったか、クロールに失敗しました)";

  return `以下のポートフォリオサイトを解析してください。

## URL (トップページ)
${page.url}

## トップページ基本情報
- title: ${page.title ?? "(なし)"}
- meta description: ${page.description ?? "(なし)"}
- og:title: ${page.ogTitle ?? "(なし)"}
- og:description: ${page.ogDescription ?? "(なし)"}

## トップページの構造シグナル
- 画像タグ数 (<img>): ${page.imageCount}
- iframe 埋め込み数: ${page.iframeHosts.length}
- 動画埋め込み (YouTube/Vimeo): ${page.videoEmbeds.length}
${page.videoEmbeds.slice(0, 10).map((v) => `  - ${v}`).join("\n")}
- 内部リンク数: ${page.links.internal}
- 外部リンク数: ${page.links.external}
- 検出されたSNS/外部プラットフォーム:
${page.links.snsLinks.length ? page.links.snsLinks.map((s) => `  - ${s}`).join("\n") : "  (なし)"}

## 見出し (h1/h2/h3)
${page.headings.length ? page.headings.map((h) => `- ${h}`).join("\n") : "(取得できず)"}

## トップページ本文テキスト (先頭${TEXT_CAP}文字まで)
${"```"}
${page.text}
${"```"}
${subBlock}

## 合計シグナル (トップ + 下層)
- 累計 動画埋め込み(YouTube/Vimeo): ${totalVideoEmbeds}
- 累計 画像タグ数: ${totalImages}
- 作例の充実度は、**トップだけでなく下層ページの動画数も合算して評価**してください。

JSONで出力してください。`;
}

function extractJson(text: string): string | null {
  const t = text.trim();
  if (t.startsWith("{") && t.endsWith("}")) return t;
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) return t.slice(first, last + 1);
  return null;
}

// ---- ハンドラ ----

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { url: rawUrl } = body as { url?: string };

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: "URLを入力してください" },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json(
        { error: "URL形式が正しくありません (http:// または https:// から始めてください)" },
        { status: 400 }
      );
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "http / https のURLのみ対応しています" },
        { status: 400 }
      );
    }

    // SSRF ゆるく抑止: ループバック・プライベート等の直指定を拒否
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return NextResponse.json(
        { error: "内部ネットワーク/ループバックのURLは解析できません" },
        { status: 400 }
      );
    }

    let page: PageSummary;
    let topHtml: string;
    try {
      const fetched = await fetchHtml(parsed.toString());
      topHtml = fetched.html;
      page = summarizePage(fetched.html, fetched.finalUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "取得エラー";
      return NextResponse.json(
        { error: `URLの取得/解析に失敗しました: ${msg}` },
        { status: 400 }
      );
    }

    // 下層ページ (作例系) を自動検出してクロール
    const anchors = extractInternalAnchors(topHtml, page.url);
    const workUrls = selectWorkLinks(anchors, page.url, 5);
    const subPagesRaw = await Promise.all(
      workUrls.map((u) => fetchSubPage(u, 10_000))
    );
    const subPages = subPagesRaw.filter(
      (p): p is SubPageSummary => p !== null
    );

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserMessage(page, subPages),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "AIの応答を解析できませんでした", raw: text.slice(0, 400) },
        { status: 500 }
      );
    }

    let result: AnalyzeResult;
    try {
      result = JSON.parse(jsonStr) as AnalyzeResult;
    } catch {
      return NextResponse.json(
        { error: "AIの応答JSONが不正でした", raw: jsonStr.slice(0, 400) },
        { status: 500 }
      );
    }

    const totalVideoEmbeds =
      page.videoEmbeds.length +
      subPages.reduce((s, p) => s + p.videoEmbeds.length, 0);
    const totalImages =
      page.imageCount + subPages.reduce((s, p) => s + p.imageCount, 0);

    return NextResponse.json({
      result,
      meta: {
        url: page.url,
        title: page.title,
        description: page.description,
        imageCount: page.imageCount,
        videoEmbeds: page.videoEmbeds.length,
        totalImageCount: totalImages,
        totalVideoEmbeds,
        snsLinks: page.links.snsLinks,
        crawledSubPages: subPages.map((p) => ({
          url: p.url,
          title: p.title,
          imageCount: p.imageCount,
          videoEmbeds: p.videoEmbeds.length,
        })),
      },
    });
  } catch (error) {
    console.error("Portfolio check error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `解析中にエラーが発生しました: ${msg}` },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

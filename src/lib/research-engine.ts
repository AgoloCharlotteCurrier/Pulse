import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import {
  ResearchParams,
  RedditResult,
  XResult,
} from "./types";

// Depth configs: how many items to request from each source
const DEPTH_CONFIG: Record<string, { min: number; max: number }> = {
  quick: { min: 10, max: 15 },
  default: { min: 20, max: 35 },
  deep: { min: 50, max: 70 },
};

function getDepthConfig(depth: string) {
  return DEPTH_CONFIG[depth] || DEPTH_CONFIG.default;
}

// ---------------------------------------------------------------------------
// JSON extraction helpers
// ---------------------------------------------------------------------------

function extractJsonObject(text: string): any | null {
  const cleaned = text.trim();

  // Extract from markdown code blocks
  const codeBlockMatch = cleaned.match(
    /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/
  );
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : cleaned;

  // Try direct parse
  try {
    return JSON.parse(jsonStr);
  } catch {}

  // Try to find a JSON object with "items" key
  const objMatch = jsonStr.match(/\{[\s\S]*"items"[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }

  return null;
}

// ---------------------------------------------------------------------------
// Response text extraction (works for both OpenAI and xAI Responses API)
// ---------------------------------------------------------------------------

function extractOutputText(output: any[]): string {
  return (
    output
      .filter((b: any) => b.type === "message")
      .flatMap((b: any) => b.content || [])
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join("\n") || ""
  );
}

// ---------------------------------------------------------------------------
// Reddit: Enrichment via Reddit's public JSON API
// ---------------------------------------------------------------------------

async function fetchRedditThreadJson(
  url: string
): Promise<any | null> {
  try {
    // Extract path from Reddit URL
    const parsed = new URL(url);
    if (!parsed.hostname.includes("reddit.com")) return null;

    let path = parsed.pathname.replace(/\/$/, "");
    if (!path.endsWith(".json")) path += ".json";

    const res = await fetch(`https://www.reddit.com${path}?raw_json=1`, {
      headers: {
        "User-Agent": "Pulse/1.0 (social-research-tool)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseRedditThreadData(data: any): {
  title: string;
  author: string;
  score: number;
  numComments: number;
  upvoteRatio: number;
  createdUtc: number;
  selftext: string;
  subreddit: string;
} | null {
  if (!Array.isArray(data) || data.length < 1) return null;

  const children = data[0]?.data?.children;
  if (!children?.length) return null;

  const sub = children[0]?.data;
  if (!sub) return null;

  return {
    title: sub.title || "",
    author: sub.author || "unknown",
    score: sub.score ?? 0,
    numComments: sub.num_comments ?? 0,
    upvoteRatio: sub.upvote_ratio ?? 0,
    createdUtc: sub.created_utc ?? 0,
    selftext: (sub.selftext || "").slice(0, 300),
    subreddit: sub.subreddit || "unknown",
  };
}

async function enrichRedditItem(
  item: { url: string; title: string; subreddit: string; relevance: number },
): Promise<RedditResult> {
  const threadData = await fetchRedditThreadJson(item.url);
  const parsed = threadData ? parseRedditThreadData(threadData) : null;

  if (parsed) {
    return {
      id: uuidv4(),
      title: parsed.title || item.title,
      subreddit: parsed.subreddit || item.subreddit,
      url: item.url,
      upvotes: parsed.score,
      commentCount: parsed.numComments,
      relevanceScore: Math.round(item.relevance * 100),
      snippet: parsed.selftext.slice(0, 300),
      author: parsed.author,
      createdAt: parsed.createdUtc
        ? new Date(parsed.createdUtc * 1000).toISOString()
        : new Date().toISOString(),
    };
  }

  // Fallback: return unenriched item
  return {
    id: uuidv4(),
    title: item.title,
    subreddit: item.subreddit,
    url: item.url,
    upvotes: 0,
    commentCount: 0,
    relevanceScore: Math.round(item.relevance * 100),
    snippet: "",
    author: "unknown",
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Reddit: Discovery via OpenAI Responses API + web_search
// ---------------------------------------------------------------------------

// Prompt adapted from last30days-skill (mvanhorn/last30days-skill)
const REDDIT_SEARCH_PROMPT = `Find Reddit discussion threads about: {topic}

STEP 1: EXTRACT THE CORE SUBJECT
Get the MAIN NOUN/PRODUCT/TOPIC:
- "best nano banana prompting practices" → "nano banana"
- "killer features of clawdbot" → "clawdbot"
DO NOT include "best", "top", "tips", "practices", "features" in your search.

STEP 2: SEARCH BROADLY
Search for the core subject on Reddit:
1. "[core subject] site:reddit.com"
2. "reddit [core subject]"

Return as many relevant threads as you find.

STEP 3: INCLUDE ALL MATCHES
- Include ALL threads about the core subject
- Set date to "YYYY-MM-DD" if you can determine it, otherwise null
- DO NOT pre-filter aggressively - include anything relevant

REQUIRED: URLs must contain "/r/" AND "/comments/"
REJECT: developers.reddit.com, business.reddit.com

Find {min_items}-{max_items} threads. Return MORE rather than fewer.

Return JSON:
{
  "items": [
    {
      "title": "Thread title",
      "url": "https://www.reddit.com/r/sub/comments/xyz/title/",
      "subreddit": "subreddit_name",
      "date": "YYYY-MM-DD or null",
      "why_relevant": "Why relevant",
      "relevance": 0.85
    }
  ]
}`;

function parseRedditDiscoveryResponse(response: any): Array<{
  url: string;
  title: string;
  subreddit: string;
  relevance: number;
}> {
  const text = extractOutputText(response.output || []);
  const parsed = extractJsonObject(text);
  const rawItems = parsed?.items || [];

  const items: Array<{
    url: string;
    title: string;
    subreddit: string;
    relevance: number;
  }> = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;

    const url = String(item.url || "");
    // Validate: must be a real Reddit thread URL with /r/ and /comments/
    if (
      !url.includes("reddit.com") ||
      !url.includes("/r/") ||
      !url.includes("/comments/")
    ) {
      continue;
    }

    items.push({
      url,
      title: String(item.title || "").trim(),
      subreddit: String(item.subreddit || "").replace(/^r\//, ""),
      relevance: Math.min(
        1.0,
        Math.max(0.0, parseFloat(String(item.relevance || 0.5)))
      ),
    });
  }

  return items;
}

export async function searchReddit(
  params: ResearchParams
): Promise<{ results: RedditResult[]; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { results: [], error: "OpenAI API key not configured" };
  }

  try {
    const client = new OpenAI({ apiKey });
    const { min, max } = getDepthConfig(params.depth);

    const prompt = REDDIT_SEARCH_PROMPT.replace("{topic}", params.topic)
      .replace("{min_items}", String(min))
      .replace("{max_items}", String(max));

    // Step 1: Discover Reddit thread URLs via web_search with domain filtering
    const response = await client.responses.create({
      model: "gpt-4o",
      tools: [
        {
          type: "web_search_preview" as any,
          search_context_size: "high",
        },
      ],
      input: prompt,
    } as any);

    const discoveredItems = parseRedditDiscoveryResponse(response);

    if (discoveredItems.length === 0) {
      return { results: [] };
    }

    // Step 2: Enrich each discovered thread with real data from Reddit's JSON API
    const enrichPromises = discoveredItems
      .slice(0, max)
      .map((item) => enrichRedditItem(item));

    const results = await Promise.allSettled(enrichPromises);

    const enrichedResults: RedditResult[] = results
      .filter(
        (r): r is PromiseFulfilledResult<RedditResult> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    return { results: enrichedResults };
  } catch (err) {
    return {
      results: [],
      error: `Reddit search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

// ---------------------------------------------------------------------------
// X/Twitter: Discovery via xAI Responses API + x_search
// ---------------------------------------------------------------------------

// Prompt adapted from last30days-skill (mvanhorn/last30days-skill)
const X_SEARCH_PROMPT = `You have access to real-time X (Twitter) data. Search for posts about: {topic}

Focus on posts from the last {lookback_days} days. Find {min_items}-{max_items} high-quality, relevant posts.

IMPORTANT: Return ONLY valid JSON in this exact format, no other text:
{
    "items": [
        {
            "text": "Post text content (truncated if long)",
            "url": "https://x.com/user/status/...",
            "author_handle": "username",
            "author_name": "Display Name",
            "date": "YYYY-MM-DD or null if unknown",
            "engagement": {
                "likes": 100,
                "reposts": 25,
                "replies": 15
            },
            "why_relevant": "Brief explanation of relevance",
            "relevance": 0.85
        }
    ]
}

Rules:
- relevance is 0.0 to 1.0 (1.0 = highly relevant)
- date must be YYYY-MM-DD format or null
- engagement can be null if unknown
- Include diverse voices/accounts if applicable
- Prefer posts with substantive content, not just links
- Only include REAL posts you found through search`;

function parseXDiscoveryResponse(response: any): XResult[] {
  const text = extractOutputText(response.output || []);
  const parsed = extractJsonObject(text);
  const rawItems = parsed?.items || [];

  const results: XResult[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;

    const url = String(item.url || "");
    if (!url) continue;

    const handle = String(item.author_handle || "")
      .trim()
      .replace(/^@/, "");

    const text = String(item.text || "").trim().slice(0, 500);
    if (!text || text.length < 5) continue;

    // Parse engagement
    const eng = item.engagement;
    const likes =
      eng && typeof eng === "object"
        ? parseInt(String(eng.likes || 0)) || 0
        : 0;
    const reposts =
      eng && typeof eng === "object"
        ? parseInt(String(eng.reposts || 0)) || 0
        : 0;
    const replies =
      eng && typeof eng === "object"
        ? parseInt(String(eng.replies || 0)) || 0
        : 0;

    const relevance = Math.min(
      1.0,
      Math.max(0.0, parseFloat(String(item.relevance || 0.5)))
    );

    results.push({
      id: uuidv4(),
      text,
      authorHandle: handle || "unknown",
      authorName: String(item.author_name || item.display_name || handle || "unknown").trim(),
      url,
      likes,
      reposts,
      replies,
      relevanceScore: Math.round(relevance * 100),
      createdAt: item.date
        ? new Date(item.date).toISOString()
        : new Date().toISOString(),
    });
  }

  return results;
}

export async function searchX(
  params: ResearchParams
): Promise<{ results: XResult[]; error?: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { results: [], error: "xAI API key not configured" };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });
    const { min, max } = getDepthConfig(params.depth);

    const prompt = X_SEARCH_PROMPT.replace("{topic}", params.topic)
      .replace("{lookback_days}", String(params.lookbackDays))
      .replace("{min_items}", String(min))
      .replace("{max_items}", String(max));

    // Use Responses API with x_search tool for real X/Twitter search
    const response = await client.responses.create({
      model: "grok-4",
      tools: [{ type: "x_search" } as any],
      input: [{ role: "user", content: prompt }] as any,
    } as any);

    const results = parseXDiscoveryResponse(response);
    return { results };
  } catch (err) {
    return {
      results: [],
      error: `X search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

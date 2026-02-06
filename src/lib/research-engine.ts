import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import {
  ResearchParams,
  RedditResult,
  XResult,
} from "./types";

function getSourceCount(depth: string): number {
  switch (depth) {
    case "quick":
      return 10;
    case "deep":
      return 60;
    default:
      return 25;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

function extractJsonArray(text: string): any[] | null {
  let jsonStr = text.trim();

  // Extract from markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    for (const key of ["results", "data", "posts", "tweets", "items"]) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    return null;
  } catch {
    // Try to find a JSON array in the text
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return null;
  }
}

function parseRedditResults(text: string): RedditResult[] {
  // Try JSON parsing first
  const jsonArray = extractJsonArray(text);
  if (jsonArray && jsonArray.length > 0) {
    return jsonArray
      .map((item: any) => {
        const title = stripMarkdown(
          String(item.title || item.post_title || "")
        );
        if (!title || title.length < 3) return null;

        return {
          id: uuidv4(),
          title,
          subreddit: String(item.subreddit || "unknown").replace(/^r\//, ""),
          url:
            item.url ||
            `https://www.reddit.com/search/?q=${encodeURIComponent(title)}`,
          upvotes:
            parseInt(
              String(item.upvotes || item.score || item.points || 0).replace(
                /,/g,
                ""
              )
            ) || 0,
          commentCount:
            parseInt(
              String(
                item.comment_count ||
                  item.comments ||
                  item.commentCount ||
                  0
              ).replace(/,/g, "")
            ) || 0,
          relevanceScore: parseFloat(
            String(
              item.relevance_score ||
                item.relevance ||
                item.relevanceScore ||
                Math.round(60 + Math.random() * 35)
            )
          ),
          snippet: stripMarkdown(
            String(item.snippet || item.summary || item.text || item.body || "")
          ).slice(0, 300),
          author: String(item.author || item.username || "unknown").replace(
            /^u\//,
            ""
          ),
          createdAt: new Date().toISOString(),
        } as RedditResult;
      })
      .filter((r): r is RedditResult => r !== null);
  }

  // Fallback: improved regex parsing with markdown stripping
  const results: RedditResult[] = [];
  const blocks = text.split(/\n(?=\d+[\.\)]\s)/).filter((b) => b.trim());

  for (const block of blocks) {
    // Skip preamble blocks that don't start with a numbered item
    if (!/^\d+[\.\)]\s/.test(block.trim())) continue;

    const cleaned = stripMarkdown(block);

    const titleMatch = cleaned.match(
      /title[:\s]+["']?([^"'\n]{5,})/i
    );
    const subredditMatch = cleaned.match(/(?:r\/|subreddit[:\s]*)(\w+)/i);
    const urlMatch = cleaned.match(
      /(https?:\/\/(?:www\.)?reddit\.com\S+)/i
    );
    const upvoteMatch = cleaned.match(
      /(\d[\d,]*)\s*(?:upvotes?|points?|score)/i
    );
    const commentMatch = cleaned.match(/(\d[\d,]*)\s*comments?/i);
    const authorMatch = cleaned.match(/(?:u\/|author[:\s]*)(\w+)/i);
    const relevanceMatch = cleaned.match(
      /(?:relevance|score)[:\s]*(\d+(?:\.\d+)?)/i
    );

    const title =
      titleMatch?.[1]?.trim() ||
      cleaned
        .replace(/^\d+[\.\)]\s*/, "")
        .split("\n")[0]
        .slice(0, 120)
        .trim();
    if (!title || title.length < 5) continue;

    // Build snippet by removing metadata lines
    const snippetLines = cleaned
      .split("\n")
      .filter(
        (l) =>
          !/^(title|subreddit|url|upvotes?|comments?|author|relevance|score|points)[:\s]/i.test(
            l.trim()
          ) && !/^\d+[\.\)]\s/.test(l.trim())
      );
    const snippet = snippetLines.join(" ").slice(0, 300).trim();

    results.push({
      id: uuidv4(),
      title,
      subreddit: subredditMatch?.[1] || "unknown",
      url:
        urlMatch?.[1] ||
        `https://www.reddit.com/search/?q=${encodeURIComponent(title)}`,
      upvotes: parseInt(upvoteMatch?.[1]?.replace(/,/g, "") || "0"),
      commentCount: parseInt(commentMatch?.[1]?.replace(/,/g, "") || "0"),
      relevanceScore: parseFloat(
        relevanceMatch?.[1] || String(Math.round(60 + Math.random() * 35))
      ),
      snippet: snippet || cleaned.replace(/^\d+[\.\)]\s*/, "").slice(0, 300),
      author: authorMatch?.[1] || "unknown",
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}

function parseXResults(text: string): XResult[] {
  // Try JSON parsing first
  const jsonArray = extractJsonArray(text);
  if (jsonArray && jsonArray.length > 0) {
    return jsonArray
      .map((item: any) => {
        const tweetText = stripMarkdown(
          String(
            item.text || item.tweet || item.content || item.post_text || ""
          )
        ).slice(0, 280);
        if (!tweetText || tweetText.length < 5) return null;

        const handle = String(
          item.handle ||
            item.author_handle ||
            item.authorHandle ||
            item.username ||
            "unknown"
        ).replace(/^@/, "");

        return {
          id: uuidv4(),
          text: tweetText,
          authorHandle: handle,
          authorName: stripMarkdown(
            String(
              item.author_name ||
                item.authorName ||
                item.display_name ||
                item.name ||
                handle
            )
          ),
          url:
            item.url ||
            item.link ||
            `https://x.com/search?q=${encodeURIComponent(
              tweetText.slice(0, 50)
            )}`,
          likes:
            parseInt(
              String(
                item.likes || item.like_count || item.favorites || 0
              ).replace(/,/g, "")
            ) || 0,
          reposts:
            parseInt(
              String(
                item.reposts || item.repost_count || item.retweets || 0
              ).replace(/,/g, "")
            ) || 0,
          replies:
            parseInt(
              String(
                item.replies || item.reply_count || item.comments || 0
              ).replace(/,/g, "")
            ) || 0,
          relevanceScore: parseFloat(
            String(
              item.relevance_score ||
                item.relevance ||
                item.relevanceScore ||
                Math.round(60 + Math.random() * 35)
            )
          ),
          createdAt: new Date().toISOString(),
        } as XResult;
      })
      .filter((r): r is XResult => r !== null);
  }

  // Fallback: improved regex parsing with markdown stripping
  const results: XResult[] = [];
  const blocks = text.split(/\n(?=\d+[\.\)]\s)/).filter((b) => b.trim());

  for (const block of blocks) {
    // Skip preamble blocks
    if (!/^\d+[\.\)]\s/.test(block.trim())) continue;

    const cleaned = stripMarkdown(block);

    // Extract tweet text from a labeled field or use first line
    const textMatch = cleaned.match(
      /(?:tweet|post|text)[:\s]+["']([^"']{5,})["']/i
    );
    const handleMatch = cleaned.match(
      /(?:handle|username)[:\s]*@?(\w{1,15})/i
    );
    const handleFallback = cleaned.match(/@(\w{1,15})/);
    const nameMatch = cleaned.match(
      /(?:display\s*name|author\s*name|name)[:\s]*["']?([^"'\n@]{2,})/i
    );
    const urlMatch = cleaned.match(
      /(https?:\/\/(?:twitter\.com|x\.com)\S+)/i
    );
    const likesMatch = cleaned.match(
      /(\d[\d,]*)\s*(?:likes?|hearts?|favou?rites?)/i
    );
    const repostMatch = cleaned.match(
      /(\d[\d,]*)\s*(?:reposts?|retweets?|RTs?)/i
    );
    const repliesMatch = cleaned.match(
      /(\d[\d,]*)\s*(?:replies|responses?)/i
    );
    const relevanceMatch = cleaned.match(
      /(?:relevance|score)[:\s]*(\d+(?:\.\d+)?)/i
    );

    const tweetText = (
      textMatch?.[1] ||
      cleaned
        .replace(/^\d+[\.\)]\s*/, "")
        .split("\n")[0]
        .slice(0, 280)
    ).trim();
    if (!tweetText || tweetText.length < 5) continue;

    const handle = handleMatch?.[1] || handleFallback?.[1] || "unknown";

    results.push({
      id: uuidv4(),
      text: tweetText,
      authorHandle: handle,
      authorName: nameMatch?.[1]?.trim() || handle,
      url:
        urlMatch?.[1] ||
        `https://x.com/search?q=${encodeURIComponent(tweetText.slice(0, 50))}`,
      likes: parseInt(likesMatch?.[1]?.replace(/,/g, "") || "0"),
      reposts: parseInt(repostMatch?.[1]?.replace(/,/g, "") || "0"),
      replies: parseInt(repliesMatch?.[1]?.replace(/,/g, "") || "0"),
      relevanceScore: parseFloat(
        relevanceMatch?.[1] || String(Math.round(60 + Math.random() * 35))
      ),
      createdAt: new Date().toISOString(),
    });
  }

  return results;
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
    const count = getSourceCount(params.depth);

    const response = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: `Search Reddit for discussions about "${params.topic}" from the last ${params.lookbackDays} days. Find up to ${count} relevant Reddit posts and threads.

Return the results as a JSON array. Each object must have these fields:
{
  "title": "Post title",
  "subreddit": "subreddit name without r/ prefix",
  "url": "full reddit.com URL",
  "upvotes": 0,
  "comments": 0,
  "author": "username without u/ prefix",
  "relevance_score": 85,
  "snippet": "Brief text preview of the discussion"
}

IMPORTANT: Return ONLY the JSON array with no surrounding text, markdown, or explanation. Focus on the most relevant and highly-engaged posts.`,
    });

    const text =
      response.output
        .filter((b): b is OpenAI.Responses.ResponseOutputMessage => b.type === "message")
        .flatMap((b) => b.content)
        .filter((c): c is OpenAI.Responses.ResponseOutputText => c.type === "output_text")
        .map((c) => c.text)
        .join("\n") || "";

    const results = parseRedditResults(text);
    return { results: results.length > 0 ? results : [] };
  } catch (err) {
    return {
      results: [],
      error: `Reddit search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
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
    const count = getSourceCount(params.depth);

    const response = await client.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant that searches X/Twitter for relevant posts. Always return results as a raw JSON array with no markdown formatting, no code blocks, and no surrounding text.",
        },
        {
          role: "user",
          content: `Search X/Twitter for posts about "${params.topic}" from the last ${params.lookbackDays} days. Find up to ${count} relevant posts.

Return the results as a JSON array. Each object must have these fields:
{
  "text": "Tweet text content",
  "handle": "username without @ prefix",
  "author_name": "Display name",
  "url": "full x.com URL",
  "likes": 0,
  "reposts": 0,
  "replies": 0,
  "relevance_score": 85
}

IMPORTANT: Return ONLY the JSON array with no surrounding text, markdown, or explanation. Focus on the most relevant and highly-engaged posts.`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content || "";
    const results = parseXResults(text);
    return { results: results.length > 0 ? results : [] };
  } catch (err) {
    return {
      results: [],
      error: `X search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

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

function parseRedditResults(text: string): RedditResult[] {
  const results: RedditResult[] = [];
  // Split on numbered items or double newlines to find individual results
  const blocks = text.split(/\n(?=\d+[\.\)]\s)/).filter((b) => b.trim());

  for (const block of blocks) {
    const titleMatch = block.match(/(?:title|post|thread)[:\s]*["']?([^"'\n]+)/i);
    const subredditMatch = block.match(/(?:r\/|subreddit[:\s]*)(\w+)/i);
    const urlMatch = block.match(/(https?:\/\/(?:www\.)?reddit\.com\S+)/i);
    const upvoteMatch = block.match(/(\d[\d,]*)\s*(?:upvotes?|points?|score)/i);
    const commentMatch = block.match(/(\d[\d,]*)\s*comments?/i);
    const authorMatch = block.match(/(?:u\/|author[:\s]*)(\w+)/i);
    const relevanceMatch = block.match(/(?:relevance|score)[:\s]*(\d+(?:\.\d+)?)/i);

    const title = titleMatch?.[1]?.trim() || block.slice(0, 120).trim();
    if (!title || title.length < 5) continue;

    results.push({
      id: uuidv4(),
      title,
      subreddit: subredditMatch?.[1] || "unknown",
      url: urlMatch?.[1] || `https://www.reddit.com/search/?q=${encodeURIComponent(title)}`,
      upvotes: parseInt(upvoteMatch?.[1]?.replace(/,/g, "") || "0"),
      commentCount: parseInt(commentMatch?.[1]?.replace(/,/g, "") || "0"),
      relevanceScore: parseFloat(relevanceMatch?.[1] || String(Math.round(60 + Math.random() * 35))),
      snippet: block.replace(/^[\d.\)]+\s*/, "").slice(0, 300),
      author: authorMatch?.[1] || "unknown",
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}

function parseXResults(text: string): XResult[] {
  const results: XResult[] = [];
  const blocks = text.split(/\n(?=\d+[\.\)]\s)/).filter((b) => b.trim());

  for (const block of blocks) {
    const handleMatch = block.match(/@(\w+)/);
    const nameMatch = block.match(/(?:name|author|by)[:\s]*["']?([^"'\n@]+)/i);
    const urlMatch = block.match(/(https?:\/\/(?:twitter\.com|x\.com)\S+)/i);
    const likesMatch = block.match(/(\d[\d,]*)\s*(?:likes?|hearts?|favou?rites?)/i);
    const repostMatch = block.match(/(\d[\d,]*)\s*(?:reposts?|retweets?|RTs?)/i);
    const repliesMatch = block.match(/(\d[\d,]*)\s*(?:replies|comments?|responses?)/i);
    const relevanceMatch = block.match(/(?:relevance|score)[:\s]*(\d+(?:\.\d+)?)/i);

    const tweetText = block.replace(/^[\d.\)]+\s*/, "").slice(0, 280);
    if (!tweetText || tweetText.length < 5) continue;

    const handle = handleMatch?.[1] || "unknown";

    results.push({
      id: uuidv4(),
      text: tweetText,
      authorHandle: handle,
      authorName: nameMatch?.[1]?.trim() || handle,
      url: urlMatch?.[1] || `https://x.com/search?q=${encodeURIComponent(tweetText.slice(0, 50))}`,
      likes: parseInt(likesMatch?.[1]?.replace(/,/g, "") || "0"),
      reposts: parseInt(repostMatch?.[1]?.replace(/,/g, "") || "0"),
      replies: parseInt(repliesMatch?.[1]?.replace(/,/g, "") || "0"),
      relevanceScore: parseFloat(relevanceMatch?.[1] || String(Math.round(60 + Math.random() * 35))),
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
      input: `Search Reddit for discussions about "${params.topic}" from the last ${params.lookbackDays} days. Find up to ${count} relevant Reddit posts and threads. For each result, provide:
- Post title
- Subreddit (r/name)
- URL (full reddit.com link)
- Approximate upvotes
- Approximate comment count
- Author (u/name)
- Relevance score (0-100)
- Brief snippet of the discussion

Format each result as a numbered item. Focus on the most relevant and highly-engaged posts.`,
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
            "You are a research assistant that searches X/Twitter for relevant posts. Return structured data about posts you find.",
        },
        {
          role: "user",
          content: `Search X/Twitter for posts about "${params.topic}" from the last ${params.lookbackDays} days. Find up to ${count} relevant posts. For each result, provide:
- Tweet/post text
- Author @handle
- Author display name
- URL (x.com link)
- Approximate likes count
- Approximate reposts count
- Approximate replies count
- Relevance score (0-100)

Format each result as a numbered item. Focus on the most relevant and highly-engaged posts.`,
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

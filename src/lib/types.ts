export type ResearchSource = "auto" | "reddit" | "x";
export type ResearchDepth = "quick" | "default" | "deep";
export type RunStatus = "running" | "completed" | "failed";

export interface ResearchParams {
  topic: string;
  lookbackDays: number;
  source: ResearchSource;
  depth: ResearchDepth;
}

export interface RedditResult {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  upvotes: number;
  commentCount: number;
  relevanceScore: number;
  snippet: string;
  author: string;
  createdAt: string;
}

export interface XResult {
  id: string;
  text: string;
  authorHandle: string;
  authorName: string;
  url: string;
  likes: number;
  reposts: number;
  replies: number;
  relevanceScore: number;
  createdAt: string;
}

export interface ResearchRun {
  id: string;
  topic: string;
  params: ResearchParams;
  status: RunStatus;
  createdAt: string;
  completedAt?: string;
  redditResults: RedditResult[];
  xResults: XResult[];
  redditError?: string;
  xError?: string;
  userId: string;
}

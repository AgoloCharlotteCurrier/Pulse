import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import { authOptions } from "@/lib/auth";
import { ResearchParams, ResearchRun } from "@/lib/types";
import { saveRun, updateRun, getUserRuns } from "@/lib/store";
import { searchReddit, searchX } from "@/lib/research-engine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const params: ResearchParams = {
    topic: body.topic,
    lookbackDays: body.lookbackDays || 7,
    source: body.source || "auto",
    depth: body.depth || "default",
  };

  if (!params.topic?.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const run: ResearchRun = {
    id: uuidv4(),
    topic: params.topic,
    params,
    status: "running",
    createdAt: new Date().toISOString(),
    redditResults: [],
    xResults: [],
    userId: session.user.email,
  };

  saveRun(run);

  // Run research asynchronously
  (async () => {
    try {
      const shouldSearchReddit = params.source === "auto" || params.source === "reddit";
      const shouldSearchX = params.source === "auto" || params.source === "x";

      const promises: Promise<void>[] = [];

      if (shouldSearchReddit) {
        promises.push(
          searchReddit(params).then(({ results, error }) => {
            updateRun(run.id, {
              redditResults: results,
              ...(error ? { redditError: error } : {}),
            });
          })
        );
      }

      if (shouldSearchX) {
        promises.push(
          searchX(params).then(({ results, error }) => {
            updateRun(run.id, {
              xResults: results,
              ...(error ? { xError: error } : {}),
            });
          })
        );
      }

      await Promise.allSettled(promises);
      updateRun(run.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    } catch {
      updateRun(run.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
    }
  })();

  return NextResponse.json({ id: run.id, status: "running" });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = getUserRuns(session.user.email);
  return NextResponse.json(runs);
}

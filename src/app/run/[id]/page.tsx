"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ResearchRun } from "@/lib/types";
import { RedditResultCard, XResultCard } from "@/components/ResultCard";
import Spinner from "@/components/Spinner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status === "running" && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RunPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<ResearchRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/research/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Research run not found");
        } else {
          setError("Failed to load research run");
        }
        return;
      }
      const data = await res.json();
      setRun(data);
    } catch {
      setError("Failed to load research run");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchRun();
    }
  }, [authStatus, router, fetchRun]);

  // Poll while running
  useEffect(() => {
    if (run?.status !== "running") return;
    const interval = setInterval(fetchRun, 2000);
    return () => clearInterval(interval);
  }, [run?.status, fetchRun]);

  if (authStatus === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link
          href="/history"
          className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
        >
          Back to History
        </Link>
      </div>
    );
  }

  if (!run) return null;

  const totalResults = run.redditResults.length + run.xResults.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/history"
          className="text-sm text-indigo-600 hover:text-indigo-500 mb-4 inline-block"
        >
          &larr; Back to History
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{run.topic}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <StatusBadge status={run.status} />
              <span>
                {run.params.source === "auto"
                  ? "Reddit + X"
                  : run.params.source === "reddit"
                  ? "Reddit"
                  : "X"}
              </span>
              <span>{run.params.depth} depth</span>
              <span>{run.params.lookbackDays}d lookback</span>
              <span>{totalResults} results</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Started: {formatDate(run.createdAt)}
          {run.completedAt && <> &middot; Completed: {formatDate(run.completedAt)}</>}
        </div>
      </div>

      {/* Running state */}
      {run.status === "running" && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <Spinner size="sm" />
          <span className="text-sm font-medium">Research in progress... Results will appear as they come in.</span>
        </div>
      )}

      {/* Error alerts */}
      {run.redditError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">
          <strong>Reddit:</strong> {run.redditError}
        </div>
      )}
      {run.xError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">
          <strong>X/Twitter:</strong> {run.xError}
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reddit Results */}
        {(run.params.source === "auto" || run.params.source === "reddit") && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
              Reddit
              <span className="text-sm font-normal text-gray-400">
                ({run.redditResults.length})
              </span>
            </h2>
            {run.redditResults.length === 0 && run.status === "completed" ? (
              <p className="text-sm text-gray-500">No Reddit results found.</p>
            ) : (
              <div className="space-y-3">
                {run.redditResults.map((result) => (
                  <RedditResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* X Results */}
        {(run.params.source === "auto" || run.params.source === "x") && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />
              X / Twitter
              <span className="text-sm font-normal text-gray-400">
                ({run.xResults.length})
              </span>
            </h2>
            {run.xResults.length === 0 && run.status === "completed" ? (
              <p className="text-sm text-gray-500">No X results found.</p>
            ) : (
              <div className="space-y-3">
                {run.xResults.map((result) => (
                  <XResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

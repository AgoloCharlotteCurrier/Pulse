"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ResearchRun } from "@/lib/types";
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

export default function HistoryPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/research");
      if (res.ok) {
        setRuns(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
    if (authStatus === "authenticated") {
      fetchRuns();
    }
  }, [authStatus, router, fetchRuns]);

  if (authStatus === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Research History</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          New Research
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No research runs yet</h3>
          <p className="mt-1 text-gray-500">
            Start a new research to see results here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start Research
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/run/${run.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {run.topic}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(run.createdAt)} &middot;{" "}
                    {run.params.source === "auto"
                      ? "Reddit + X"
                      : run.params.source === "reddit"
                      ? "Reddit"
                      : "X"}{" "}
                    &middot; {run.params.depth} &middot; {run.params.lookbackDays}d lookback
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {run.redditResults.length + run.xResults.length} results
                  </span>
                  <StatusBadge status={run.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResearchDepth, ResearchSource } from "@/lib/types";
import Spinner from "./Spinner";

export default function ResearchForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [source, setSource] = useState<ResearchSource>("auto");
  const [depth, setDepth] = useState<ResearchDepth>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), lookbackDays, source, depth }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Research request failed");
      }

      const data = await res.json();
      router.push(`/run/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
          Research Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., AI coding assistants, React Server Components, Rust vs Go..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="lookback" className="block text-sm font-medium text-gray-700 mb-1">
            Lookback Period
          </label>
          <div className="relative">
            <input
              id="lookback"
              type="number"
              min={1}
              max={365}
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              disabled={loading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              days
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as ResearchSource)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
            disabled={loading}
          >
            <option value="auto">Auto (Reddit + X)</option>
            <option value="reddit">Reddit only</option>
            <option value="x">X / Twitter only</option>
          </select>
        </div>

        <div>
          <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
            Depth
          </label>
          <select
            id="depth"
            value={depth}
            onChange={(e) => setDepth(e.target.value as ResearchDepth)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
            disabled={loading}
          >
            <option value="quick">Quick (8-12 sources)</option>
            <option value="default">Default (~25 sources)</option>
            <option value="deep">Deep (50-70 sources)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !topic.trim()}
        className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            Researching...
          </>
        ) : (
          "Start Research"
        )}
      </button>
    </form>
  );
}

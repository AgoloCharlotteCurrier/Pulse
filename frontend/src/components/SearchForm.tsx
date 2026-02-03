import { useState } from "react";

interface Props {
  onSubmit: (params: { topic: string; days_back: number; sources: string; depth: string }) => void;
  loading: boolean;
}

export default function SearchForm({ onSubmit, loading }: Props) {
  const [topic, setTopic] = useState("");
  const [daysBack, setDaysBack] = useState(30);
  const [sources, setSources] = useState("auto");
  const [depth, setDepth] = useState("default");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onSubmit({ topic: topic.trim(), days_back: daysBack, sources, depth });
  };

  return (
    <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. AI agents, React Server Components"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Days back</label>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sources</label>
          <select
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="auto">Auto</option>
            <option value="reddit">Reddit</option>
            <option value="x">X</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="quick">Quick</option>
            <option value="default">Default</option>
            <option value="deep">Deep</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !topic.trim()}
        className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Researching..." : "Research"}
      </button>
    </form>
  );
}

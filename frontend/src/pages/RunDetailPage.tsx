import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import ResultsDisplay from "../components/ResultsDisplay";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/research/${id}`)
      .then(({ data }) => setRun(data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load run"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm py-8 text-center">{error}</p>;
  }

  if (!run) return null;

  return (
    <div>
      <Link to="/history" className="text-sm text-indigo-600 hover:underline">
        &larr; Back to history
      </Link>

      <div className="mt-4 bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900">{run.topic}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <span>{run.days_back} days back</span>
          <span>Sources: {run.sources}</span>
          <span>Depth: {run.depth}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              run.status === "completed"
                ? "bg-green-100 text-green-700"
                : run.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {run.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {new Date(run.created_at).toLocaleString()}
        </p>
      </div>

      {run.error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {run.error}
        </div>
      )}

      {run.result && <ResultsDisplay result={run.result} />}
    </div>
  );
}

import { useState } from "react";
import api from "../api";
import SearchForm from "../components/SearchForm";
import ResultsDisplay from "../components/ResultsDisplay";

export default function SearchPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (params: {
    topic: string;
    days_back: number;
    sources: string;
    depth: string;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.post("/research", params);
      if (data.status === "failed") {
        setError(data.error || "Research failed");
      } else {
        setResult(data.result);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SearchForm onSubmit={handleSearch} loading={loading} />
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
          Running research pipeline...
        </div>
      )}
      {result && <ResultsDisplay result={result} />}
    </div>
  );
}

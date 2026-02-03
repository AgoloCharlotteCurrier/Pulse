import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

interface HistoryItem {
  id: number;
  topic: string;
  days_back: number;
  sources: string;
  depth: string;
  status: string;
  reddit_count: number;
  x_count: number;
  error: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const perPage = 20;

  useEffect(() => {
    setLoading(true);
    api
      .get("/history", { params: { page, per_page: perPage } })
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No research runs yet.</p>;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-800 mb-4">History</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Topic</th>
              <th className="px-4 py-3 text-left">Days</th>
              <th className="px-4 py-3 text-left">Sources</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Reddit</th>
              <th className="px-4 py-3 text-right">X</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/run/${item.id}`} className="text-indigo-600 hover:underline">
                    {item.topic}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.days_back}</td>
                <td className="px-4 py-3 text-gray-600">{item.sources}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : item.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{item.reddit_count}</td>
                <td className="px-4 py-3 text-right text-gray-600">{item.x_count}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

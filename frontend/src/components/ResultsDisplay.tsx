interface RedditItem {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  date: string | null;
  engagement: { score?: number; num_comments?: number } | null;
  score: number;
  why_relevant: string;
}

interface XItem {
  id: string;
  text: string;
  url: string;
  author_handle: string;
  date: string | null;
  engagement: { likes?: number; reposts?: number; replies?: number } | null;
  score: number;
  why_relevant: string;
}

interface Props {
  result: {
    topic: string;
    reddit: RedditItem[];
    x: XItem[];
    reddit_error?: string;
    x_error?: string;
    range?: { from: string; to: string };
  };
}

function RedditCard({ item }: { item: RedditItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h3>
        <span className="shrink-0 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
          {item.score}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>r/{item.subreddit}</span>
        {item.date && <span>{item.date}</span>}
        {item.engagement?.score != null && <span>{item.engagement.score} pts</span>}
        {item.engagement?.num_comments != null && <span>{item.engagement.num_comments} comments</span>}
      </div>
      {item.why_relevant && (
        <p className="mt-1 text-xs text-gray-600">{item.why_relevant}</p>
      )}
    </a>
  );
}

function XCard({ item }: { item: XItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-900 line-clamp-3">{item.text}</p>
        <span className="shrink-0 bg-sky-100 text-sky-700 text-xs font-medium px-2 py-0.5 rounded">
          {item.score}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>@{item.author_handle}</span>
        {item.date && <span>{item.date}</span>}
        {item.engagement?.likes != null && <span>{item.engagement.likes} likes</span>}
        {item.engagement?.reposts != null && <span>{item.engagement.reposts} reposts</span>}
      </div>
      {item.why_relevant && (
        <p className="mt-1 text-xs text-gray-600">{item.why_relevant}</p>
      )}
    </a>
  );
}

export default function ResultsDisplay({ result }: Props) {
  const hasReddit = result.reddit.length > 0;
  const hasX = result.x.length > 0;

  if (!hasReddit && !hasX && !result.reddit_error && !result.x_error) {
    return <p className="text-gray-500 text-sm mt-4">No results found.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {result.range && (
        <p className="text-xs text-gray-400">
          {result.range.from} to {result.range.to}
        </p>
      )}

      {result.reddit_error && (
        <p className="text-sm text-red-600">Reddit error: {result.reddit_error}</p>
      )}
      {result.x_error && (
        <p className="text-sm text-red-600">X error: {result.x_error}</p>
      )}

      {hasReddit && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Reddit ({result.reddit.length})
          </h2>
          <div className="space-y-3">
            {result.reddit.map((item) => (
              <RedditCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {hasX && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            X ({result.x.length})
          </h2>
          <div className="space-y-3">
            {result.x.map((item) => (
              <XCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

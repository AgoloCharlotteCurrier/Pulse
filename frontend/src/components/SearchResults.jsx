import { useState } from 'react'
import { format } from 'date-fns'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline'

function formatTimeRange(timeRange) {
  const ranges = {
    '2_days': 'Last 2 days',
    '7_days': 'Last 7 days',
    '14_days': 'Last 14 days',
    '30_days': 'Last 30 days'
  }
  return ranges[timeRange] || timeRange
}

function ExpandableSection({ title, children, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

function SourceIcon({ source }) {
  if (source === 'twitter') {
    return (
      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  }
  
  if (source === 'reddit') {
    return (
      <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    )
  }
  
  return null
}

function PostCard({ post }) {
  const engagement = JSON.parse(post.engagement_metrics || '{}')
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <SourceIcon source={post.source} />
          <span className="text-sm font-medium text-gray-900">@{post.author}</span>
          <span className="text-sm text-gray-500">
            {format(new Date(post.date), 'MMM d, yyyy')}
          </span>
        </div>
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>
      
      {post.title && post.title !== post.content && (
        <h4 className="text-sm font-medium text-gray-900 mb-2">{post.title}</h4>
      )}
      
      <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>
      
      <div className="flex items-center space-x-4 text-xs text-gray-500">
        {post.source === 'twitter' && (
          <>
            <span>❤️ {engagement.likes || 0}</span>
            <span>🔁 {engagement.retweets || 0}</span>
            <span>💬 {engagement.replies || 0}</span>
          </>
        )}
        {post.source === 'reddit' && (
          <>
            <span>⬆️ {engagement.upvotes || 0}</span>
            <span>💬 {engagement.comments || 0}</span>
            <span>Score: {engagement.score || 0}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchResults({ results }) {
  const { topic, timeRange, posts, synthesis, totalPosts } = results

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Results for "{topic}"
        </h2>
        <p className="text-sm text-gray-600">
          {formatTimeRange(timeRange)} • {totalPosts} posts found
        </p>
      </div>

      {/* AI Synthesis */}
      {synthesis && (
        <div className="space-y-4">
          <ExpandableSection title="AI Analysis" defaultExpanded={true}>
            <div className="space-y-4">
              {synthesis.summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-700">{synthesis.summary}</p>
                </div>
              )}
              
              {synthesis.key_themes && synthesis.key_themes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {synthesis.key_themes.map((theme, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {synthesis.pain_points && synthesis.pain_points.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Pain Points</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {synthesis.pain_points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {synthesis.notable_quotes && synthesis.notable_quotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notable Quotes</h4>
                  <div className="space-y-2">
                    {synthesis.notable_quotes.map((quote, index) => (
                      <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic text-sm text-gray-700">
                        "{quote.text}"
                        <footer className="text-xs text-gray-500 mt-1">
                          — @{quote.author} on {quote.source}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
              
              {synthesis.engagement_summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Engagement Overview</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Sentiment:</span>
                        <span className="ml-2 font-medium capitalize">{synthesis.sentiment}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">High Engagement Posts:</span>
                        <span className="ml-2 font-medium">{synthesis.engagement_summary.high_engagement_posts || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ExpandableSection>
        </div>
      )}

      {/* Raw Posts */}
      <ExpandableSection title={`Raw Posts (${totalPosts})`} defaultExpanded={false}>
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard key={index} post={post} />
          ))}
        </div>
      </ExpandableSection>
    </div>
  )
}
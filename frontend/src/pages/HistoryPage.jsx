import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { 
  TrashIcon, 
  EyeIcon, 
  ArrowLeftIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'
import { historyAPI } from '../utils/api'
import SearchResults from '../components/SearchResults'

function formatTimeRange(timeRange) {
  const ranges = {
    '2_days': 'Last 2 days',
    '7_days': 'Last 7 days', 
    '14_days': 'Last 14 days',
    '30_days': 'Last 30 days'
  }
  return ranges[timeRange] || timeRange
}

function HistoryList({ searchRuns, onView, onDelete }) {
  return (
    <div className="space-y-4">
      {searchRuns.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No search history</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by running your first search.
          </p>
          <div className="mt-6">
            <Link to="/" className="btn-primary">
              Start Searching
            </Link>
          </div>
        </div>
      ) : (
        searchRuns.map((run) => (
          <div key={run.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 truncate">
                  {run.topic}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                  <span>{formatTimeRange(run.time_range)}</span>
                  <span>{run.post_count} posts</span>
                  <span>{format(new Date(run.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => onView(run.id)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  title="View results"
                >
                  <EyeIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={() => onDelete(run.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  title="Delete"
                >
                  <TrashIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default function HistoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchRuns, setSearchRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSearchRuns()
  }, [])

  useEffect(() => {
    if (id && searchRuns.length > 0) {
      viewRun(id)
    }
  }, [id, searchRuns])

  const loadSearchRuns = async () => {
    try {
      const runs = await historyAPI.getAll()
      setSearchRuns(runs)
    } catch (err) {
      setError('Failed to load search history')
    } finally {
      setLoading(false)
    }
  }

  const viewRun = async (runId) => {
    try {
      const run = await historyAPI.getById(runId)
      setSelectedRun(run)
      if (!id) {
        navigate(`/history/${runId}`, { replace: true })
      }
    } catch (err) {
      setError('Failed to load search details')
    }
  }

  const deleteRun = async (runId) => {
    if (!confirm('Are you sure you want to delete this search run?')) {
      return
    }

    try {
      await historyAPI.delete(runId)
      setSearchRuns(runs => runs.filter(run => run.id !== runId))
      
      if (selectedRun && selectedRun.id === runId) {
        setSelectedRun(null)
        navigate('/history', { replace: true })
      }
    } catch (err) {
      setError('Failed to delete search run')
    }
  }

  const goBack = () => {
    setSelectedRun(null)
    navigate('/history', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search history...</p>
        </div>
      </div>
    )
  }

  if (selectedRun) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Search Results</h1>
              <p className="text-sm text-gray-600">
                Searched on {format(new Date(selectedRun.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          <SearchResults results={selectedRun} />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6">
      <div className="max-w-4xl">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Search History</h1>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <HistoryList 
          searchRuns={searchRuns} 
          onView={viewRun}
          onDelete={deleteRun}
        />
      </div>
    </div>
  )
}
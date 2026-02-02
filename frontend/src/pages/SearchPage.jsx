import { useState } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { searchAPI } from '../utils/api'
import SearchResults from '../components/SearchResults'

const timeRangeOptions = [
  { value: '2_days', label: 'Last 2 days' },
  { value: '7_days', label: 'Last 7 days' },
  { value: '14_days', label: 'Last 14 days' },
  { value: '30_days', label: 'Last 30 days' },
]

export default function SearchPage() {
  const [topic, setTopic] = useState('')
  const [timeRange, setTimeRange] = useState('7_days')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!topic.trim()) {
      setError('Please enter a search topic')
      return
    }

    setIsSearching(true)
    setError(null)
    setResults(null)

    try {
      const searchResults = await searchAPI.search(topic.trim(), timeRange)
      setResults(searchResults)
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const clearResults = () => {
    setResults(null)
    setError(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Search Trends</h1>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Search Topic
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input-primary pr-10"
                  placeholder="e.g., knowledge management pain points, competitor X feedback"
                  disabled={isSearching}
                />
                <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input-primary"
                disabled={isSearching}
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={isSearching || !topic.trim()}
                className="btn-primary"
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Researching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Research
                  </>
                )}
              </button>
              
              {results && (
                <button
                  type="button"
                  onClick={clearResults}
                  className="btn-secondary"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Clear Results
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Search Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="flex-1 overflow-y-auto">
          <SearchResults results={results} />
        </div>
      )}
    </div>
  )
}
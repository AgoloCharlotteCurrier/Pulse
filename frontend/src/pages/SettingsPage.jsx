import { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { settingsAPI } from '../utils/api'

const API_KEY_FIELDS = [
  {
    key: 'twitter_bearer_token',
    label: 'X/Twitter Bearer Token',
    description: 'Required for searching X/Twitter posts. Get this from the X Developer Portal.',
    placeholder: 'Enter your Twitter Bearer Token'
  },
  {
    key: 'reddit_client_id', 
    label: 'Reddit Client ID',
    description: 'Reddit app client ID for searching Reddit posts.',
    placeholder: 'Enter your Reddit Client ID'
  },
  {
    key: 'reddit_client_secret',
    label: 'Reddit Client Secret', 
    description: 'Reddit app client secret for searching Reddit posts.',
    placeholder: 'Enter your Reddit Client Secret'
  },
  {
    key: 'openai_api_key',
    label: 'OpenAI API Key',
    description: 'Required for AI synthesis of search results. Get this from OpenAI.',
    placeholder: 'Enter your OpenAI API Key'
  }
]

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const keys = await settingsAPI.getKeys()
      setApiKeys(keys)
    } catch (err) {
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key, value) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await settingsAPI.updateKeys(apiKeys)
      setMessage('API keys updated successfully!')
      
      // Reload to get masked values
      await loadApiKeys()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update API keys')
    } finally {
      setSaving(false)
    }
  }

  const isKeySet = (key) => {
    const value = apiKeys[key]
    return value && value.includes('****')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6">
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Settings</h1>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure your API keys to enable search functionality. Keys are stored securely on the server.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {API_KEY_FIELDS.map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  {isKeySet(field.key) && (
                    <div className="flex items-center text-green-600">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Configured</span>
                    </div>
                  )}
                </div>
                
                <input
                  type="password"
                  value={apiKeys[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="input-primary"
                  placeholder={field.placeholder}
                />
                
                <p className="mt-1 text-xs text-gray-500">
                  {field.description}
                </p>
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save API Keys'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Getting API Keys</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <div>
              <strong>X/Twitter:</strong> Visit{' '}
              <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="underline">
                developer.twitter.com
              </a>{' '}
              to create an app and get your Bearer Token.
            </div>
            <div>
              <strong>Reddit:</strong> Visit{' '}
              <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline">
                reddit.com/prefs/apps
              </a>{' '}
              to create an app and get your client credentials.
            </div>
            <div>
              <strong>OpenAI:</strong> Visit{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                platform.openai.com/api-keys
              </a>{' '}
              to generate an API key.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
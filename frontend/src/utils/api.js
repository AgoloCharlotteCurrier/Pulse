import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for searches
})

export const searchAPI = {
  search: async (topic, timeRange) => {
    const response = await api.post('/search', { topic, timeRange })
    return response.data
  }
}

export const historyAPI = {
  getAll: async () => {
    const response = await api.get('/history')
    return response.data
  },
  
  getById: async (id) => {
    const response = await api.get(`/history/${id}`)
    return response.data
  },
  
  delete: async (id) => {
    const response = await api.delete(`/history/${id}`)
    return response.data
  }
}

export const settingsAPI = {
  getKeys: async () => {
    const response = await api.get('/settings')
    return response.data
  },
  
  updateKeys: async (keys) => {
    const response = await api.post('/settings', keys)
    return response.data
  }
}

export default api
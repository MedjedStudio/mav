/**
 * API service functions
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || (() => {
  throw new Error('VITE_API_URL environment variable is required')
})()

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export { api }
export { API_BASE_URL }
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

// 401エラー時に自動ログアウト
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // トークン削除
      localStorage.removeItem('token')
      // グローバルなログアウト関数があれば呼び出し
      if (typeof window !== 'undefined' && typeof window.handleGlobalLogout === 'function') {
        window.handleGlobalLogout()
      } else {
        // フォールバック: ページリロード
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

export { api }
export { API_BASE_URL }
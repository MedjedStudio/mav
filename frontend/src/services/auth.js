/**
 * Authentication API services
 */
import { api } from './api'

export const authService = {
  // Check current user authentication
  checkAuth: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  // Check if initial setup is needed
  checkSetupNeeded: async () => {
    const response = await api.get('/auth/setup-status')
    return response.data
  },

  // Perform initial setup
  initialSetup: async (email, username, password) => {
    const response = await api.post('/auth/initial-setup', {
      email,
      username,
      password
    })
    return response.data
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData)
    return response.data
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/password', passwordData)
    return response.data
  }
}
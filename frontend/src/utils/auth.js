/**
 * Authentication utilities
 */

export const getToken = () => localStorage.getItem('token')
export const setToken = (token) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')

export const isAdmin = (user) => user?.role === 'admin'
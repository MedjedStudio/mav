/**
 * Navigation utilities
 */

export const updateUrl = (id) => {
  const url = id ? `/content/${id}` : '/'
  window.history.pushState({}, '', url)
}

export const parseContentIdFromPath = (path = window.location.pathname) => {
  const contentMatch = path.match(/\/content\/(\d+)/)
  return contentMatch ? parseInt(contentMatch[1], 10) : null
}
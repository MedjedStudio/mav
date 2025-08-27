import { createContext, useContext } from 'react'

// ユーザー情報を管理するContext
const UserContext = createContext({
  user: null,
  setUser: () => {},
  getUserTimezone: () => 1 // デフォルトはUTC
})

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children, user, setUser }) => {
  const getUserTimezone = () => {
    return user?.timezone || 1 // ログインしていない場合はUTC
  }

  return (
    <UserContext.Provider value={{ user, setUser, getUserTimezone }}>
      {children}
    </UserContext.Provider>
  )
}

export default UserContext
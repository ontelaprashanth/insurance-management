import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../api/endpoints'
import { setUnauthorizedHandler, tokenStore } from '../api/client'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const qc = useQueryClient()
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(!!tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.clear()
  }, [qc])

  const loadSession = useCallback(async () => {
    const s = await auth.session()
    setUser({ ...s, role: String(s.role || '').toUpperCase() })
    return s
  }, [])

  // Restore a session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return
    loadSession().catch(() => tokenStore.clear()).finally(() => setBooting(false))
  }, [loadSession])

  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])

  const login = useCallback(async (identifier, password) => {
    const { token } = await auth.login({ identifier, password })
    tokenStore.set(token)
    try {
      return await loadSession()
    } catch (e) {
      tokenStore.clear()
      throw e
    }
  }, [loadSession])

  const value = useMemo(
    () => ({ user, booting, login, logout, refresh: loadSession, isAdmin: user?.role === 'ADMIN', isUser: user?.role === 'USER' }),
    [user, booting, login, logout, loadSession],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

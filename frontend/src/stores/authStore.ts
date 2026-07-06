import { create } from 'zustand'
import { authApi } from '@/api/auth'

interface AuthUser {
  id: number
  name: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('au_token'),

  login: async (username, password) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('au_token', data.access_token)
    set({ token: data.access_token, user: { id: data.user_id, name: data.name, role: data.role } })
  },

  logout: () => {
    localStorage.removeItem('au_token')
    set({ token: null, user: null })
  },

  // 새로고침 시 token은 localStorage에서 복원되지만 user는 유실됨 — /auth/me로 재조회
  hydrate: async () => {
    if (!get().token || get().user) return
    try {
      const me = await authApi.me()
      set({ user: { id: me.id, name: me.name, role: me.role } })
    } catch {
      localStorage.removeItem('au_token')
      set({ token: null, user: null })
    }
  },
}))

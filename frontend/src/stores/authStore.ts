import { create } from 'zustand'

export interface User {
  uid: number
  email: string
  name: string
  sid: string
  avatar: string
  created_at: string
  is_bind: boolean
}

export interface Admin {
  uid: number
  email: string
  name: string
  avatar: string
  created_at: string
}

interface AuthState {
  token: string | null
  user: User | null
  adminToken: string | null
  admin: Admin | null
  isAuthenticated: boolean
  isAdminAuthenticated: boolean

  initialize: () => void
  setAuth: (token: string, user: User) => void
  setAdminAuth: (token: string, admin: Admin) => void
  setUser: (user: User) => void
  logout: () => void
  adminLogout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  adminToken: null,
  admin: null,
  isAuthenticated: false,
  isAdminAuthenticated: false,

  initialize: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const adminToken = localStorage.getItem('admin_token')
    const adminStr = localStorage.getItem('admin')

    set({
      token,
      user: userStr ? JSON.parse(userStr) : null,
      adminToken,
      admin: adminStr ? JSON.parse(adminStr) : null,
      isAuthenticated: !!token,
      isAdminAuthenticated: !!adminToken,
    })
  },

  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  setAdminAuth: (token, admin) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin', JSON.stringify(admin))
    set({ adminToken: token, admin, isAdminAuthenticated: true })
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  adminLogout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin')
    set({ adminToken: null, admin: null, isAdminAuthenticated: false })
  },
}))

import { create } from 'zustand'

interface AppState {
  currentTerm: string | null
  loading: boolean
  setCurrentTerm: (term: string) => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentTerm: null,
  loading: false,
  setCurrentTerm: (term) => set({ currentTerm: term }),
  setLoading: (loading) => set({ loading }),
}))

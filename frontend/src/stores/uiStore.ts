import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  todoBoardCollapsed: boolean
  toggleTodoBoard: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  todoBoardCollapsed: false,
  toggleTodoBoard: () => set((s) => ({ todoBoardCollapsed: !s.todoBoardCollapsed })),
}))

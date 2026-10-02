import { create } from 'zustand'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
}

let seq = 1

interface ToastState {
  toasts: Toast[]
  push: (kind: Toast['kind'], message: string) => void
  dismiss: (id: number) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, message) =>
    set((s) => ({ toasts: [...s.toasts, { id: seq++, kind, message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

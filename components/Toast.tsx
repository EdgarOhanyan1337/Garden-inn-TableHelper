'use client'

import { useEffect, useState } from 'react'
import { ToastMessage, ToastType } from '@/types'

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const show = setTimeout(() => setVisible(true), 10)
    // Auto-dismiss after 4s
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 4000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [toast.id, onDismiss])

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-900/90 border-emerald-600/50 text-emerald-100',
    error:   'bg-red-900/90 border-red-600/50 text-red-100',
    info:    'bg-sky-900/90 border-sky-600/50 text-sky-100',
  }

  const icons: Record<ToastType, string> = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  }

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border
        shadow-2xl backdrop-blur-sm min-w-[280px] max-w-[380px]
        transition-all duration-300
        ${styles[toast.type]}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      <span className="text-lg font-bold leading-none mt-0.5 flex-shrink-0">
        {icons[toast.type]}
      </span>
      <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300) }}
        className="text-current opacity-60 hover:opacity-100 transition-opacity ml-1 flex-shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

/** Hook — manage toast state from any component */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, dismissToast }
}

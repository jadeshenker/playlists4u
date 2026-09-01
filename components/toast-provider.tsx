"use client"

import { createContext, useContext, useRef, useState } from "react"

type ToastContextValue = { showToast: (message: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}

/** One shared toast, shown in the bottom-right corner, for anything on the
 * page that wants to confirm an action (e.g. a successful clipboard copy). */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setToast(null), 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${toast ? "toast-visible" : ""}`}>{toast}</div>
    </ToastContext.Provider>
  )
}

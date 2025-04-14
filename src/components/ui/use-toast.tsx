"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastProps = {
  id?: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
  onClose?: () => void
}

type ToastContextType = {
  toast: (props: ToastProps) => void
  dismissToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])
  
  const toast = React.useCallback((props: ToastProps) => {
    const id = String(Date.now())
    const newToast = { id, ...props }
    
    setToasts(prev => [...prev, newToast])
    
    if (props.duration !== Infinity) {
      setTimeout(() => {
        dismissToast(id)
      }, props.duration || 5000)
    }
  }, [])
  
  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-0 right-0 z-50 flex max-h-screen flex-col-reverse gap-2 overflow-hidden p-4 md:max-w-[420px]">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => dismissToast(toast.id!)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({
  title,
  description,
  variant = "default",
  onClose,
}: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all duration-200 bg-white",
        variant === "destructive" && "border-destructive bg-destructive/10 text-destructive"
      )}
    >
      <div className="flex flex-col gap-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-500"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  
  return context
} 
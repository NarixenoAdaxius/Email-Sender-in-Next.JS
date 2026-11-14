"use client";

import { toast as reactToastify, type ToastContent } from "react-toastify";
import React, { createContext, useCallback, useContext, useMemo } from "react";

type ToastActionElement = React.ReactElement;

export type Toast = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
  onClose?: () => void;
};

interface ToastContextValue {
  toast: (props: Toast) => void;
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function formatToastContent(
  title?: React.ReactNode,
  description?: React.ReactNode
): ToastContent {
  if (title && description) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-semibold leading-snug">{title}</div>
        <div className="text-xs opacity-85 leading-snug">{description}</div>
      </div>
    );
  }
  return (title ?? description ?? "") as ToastContent;
}

function dispatchToast({ title, description, variant, duration, onClose }: Toast) {
  const content = formatToastContent(title, description);
  const options = {
    ...(duration !== undefined ? { autoClose: duration } : {}),
    ...(onClose ? { onClose } : {}),
  };

  if (variant === "destructive") {
    reactToastify.error(content, options);
  } else {
    reactToastify.success(content, options);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useCallback((props: Toast) => {
    dispatchToast(props);
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      reactToastify.dismiss(toastId);
    } else {
      reactToastify.dismiss();
    }
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    return {
      toast: dispatchToast,
      dismiss: (toastId?: string) => {
        if (toastId) {
          reactToastify.dismiss(toastId);
        } else {
          reactToastify.dismiss();
        }
      },
    };
  }

  return context;
}

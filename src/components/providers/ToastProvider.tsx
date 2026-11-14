"use client";

import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastProvider as InternalToastProvider } from "@/components/ui/use-toast";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <InternalToastProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </InternalToastProvider>
  );
}

export default ToastProvider;

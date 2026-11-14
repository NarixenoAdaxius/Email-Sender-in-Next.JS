"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value?: string
  onValueChange: (value: string) => void
  indicatorLayoutId: string
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(
      defaultValue
    )
    const isControlled = value !== undefined
    const activeValue = isControlled ? value : uncontrolledValue
    const instanceId = React.useId()

    const handleValueChange = React.useCallback(
      (nextValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(nextValue)
        }
        onValueChange?.(nextValue)
      },
      [isControlled, onValueChange]
    )

    const contextValue = React.useMemo(
      () => ({
        value: activeValue,
        onValueChange: handleValueChange,
        indicatorLayoutId: `tabs-indicator-${instanceId}`,
      }),
      [activeValue, handleValueChange, instanceId]
    )

    return (
      <TabsContext.Provider value={contextValue}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

type TabsListProps = React.HTMLAttributes<HTMLDivElement>

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-muted/80 p-1 text-muted-foreground border border-border/50",
          className
        )}
        {...props}
      />
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context?.onValueChange(value)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/85",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {isActive && context && (
          <motion.span
            layoutId={context.indicatorLayoutId}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/60"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-1.5">
          {children}
        </span>
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value

    if (!isActive) return null

    return (
      <motion.div
        ref={ref}
        role="tabpanel"
        data-state="active"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.28, bounce: 0 }}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

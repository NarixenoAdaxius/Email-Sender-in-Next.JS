"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function MotionFadeIn({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        duration: 0.45,
        bounce: 0,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionPreviewCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        duration: 0.55,
        bounce: 0.08,
        delay: 0.1,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            duration: 0.42,
            bounce: 0,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

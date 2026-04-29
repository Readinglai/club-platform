"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "none";
  className?: string;
  style?: CSSProperties;
}

export function FadeIn({ children, delay = 0, direction = "up", className, style }: Props) {
  const y = direction === "up" ? 24 : direction === "down" ? -24 : 0;
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

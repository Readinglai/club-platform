"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}

export function MotionCard({ children, className, style, delay = 0 }: Props) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
}

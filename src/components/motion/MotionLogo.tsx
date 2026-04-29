"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
  title?: string;
}

export function MotionLogo({ children, href, target, rel, className, title }: Props) {
  return (
    <motion.a
      href={href}
      target={target}
      rel={rel}
      className={className}
      title={title}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.a>
  );
}

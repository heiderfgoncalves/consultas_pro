import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Subtle in/out transition for route content. Place inside each route component.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="h-full w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

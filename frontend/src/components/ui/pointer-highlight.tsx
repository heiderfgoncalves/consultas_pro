import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function PointerHighlight({
  children,
  rectangleClassName,
  pointerClassName,
  containerClassName,
  /** Atraso em segundos antes da moldura e do ícone (ex.: após typewriter). */
  effectDelaySec = 0,
}: {
  children: React.ReactNode;
  rectangleClassName?: string;
  pointerClassName?: string;
  containerClassName?: string;
  effectDelaySec?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  const fadeEase = [0.22, 1, 0.36, 1] as const;

  return (
    <div className={cn("relative inline-block w-fit", containerClassName)} ref={containerRef}>
      <motion.span
        className="inline-block"
        initial={{ opacity: 0.72 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: effectDelaySec,
          duration: 0.6,
          ease: fadeEase,
        }}
      >
        {children}
      </motion.span>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0"
          style={{ transformOrigin: "0 0" }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: effectDelaySec,
            duration: 0.55,
            ease: fadeEase,
          }}
        >
          <motion.div
            className={cn(
              "absolute inset-0 border border-neutral-800 dark:border-neutral-200",
              rectangleClassName,
            )}
            initial={{
              width: 0,
              height: 0,
              opacity: 0,
            }}
            whileInView={{
              width: dimensions.width,
              height: dimensions.height,
              opacity: 1,
            }}
            viewport={{ once: true, amount: "some" }}
            transition={{
              delay: effectDelaySec + 0.1,
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="pointer-events-none absolute"
            initial={{ opacity: 0, x: 0, y: 0 }}
            whileInView={{
              opacity: 1,
              x: dimensions.width + 4,
              y: dimensions.height + 4,
            }}
            viewport={{ once: true, amount: "some" }}
            style={{
              rotate: -90,
            }}
            transition={{
              delay: effectDelaySec + 0.16,
              duration: 0.78,
              ease: "easeInOut",
            }}
          >
            <Pointer className={cn("h-5 w-5 text-blue-500", pointerClassName)} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

const Pointer = ({ ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
    </svg>
  );
};

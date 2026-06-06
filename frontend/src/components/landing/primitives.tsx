import { motion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * FadeUp: fires on mount (not on scroll). We've seen IntersectionObserver-based
 * viewport detection fail intermittently with the current SSR + hydration
 * pipeline, leaving entire sections invisible. Mounting-based animation is
 * deterministic and still feels premium.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
  as: _as,
  ...rest
}: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" } & HTMLMotionProps<"div">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <motion.div
      initial={false}
      animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

export function BracketLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground", className)}>
      <span className="text-brand">[</span> {children} <span className="text-brand">]</span>
    </span>
  );
}

export function HUDFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("hud-frame hud-corners relative rounded-md", className)} style={style}>
      <span className="hud-tl" />
      <span className="hud-tr" />
      <span className="hud-bl" />
      <span className="hud-br" />
      {children}
    </div>
  );
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span className="dot-ping absolute inset-0 rounded-full" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <FadeUp>
        <BracketLabel>{eyebrow}</BracketLabel>
      </FadeUp>
      <FadeUp delay={0.05}>
        <h2 className="mt-4 text-3xl md:text-5xl font-medium tracking-[-0.03em] text-foreground">
          {title}
        </h2>
      </FadeUp>
      {sub && (
        <FadeUp delay={0.1}>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{sub}</p>
        </FadeUp>
      )}
    </div>
  );
}

import { motion } from "framer-motion";
import { useState } from "react";

const HERO_LINES = "Consultas de crédito\ninteligentes e modulares.";

const DELAY_BEFORE_TYPING = 0.35;
const STAGGER = 0.038;
const CHAR_DURATION = 0.12;
const CURSOR_PAUSE_AFTER_TEXT = 0.1;
const CURSOR_FADE_DURATION = 0.55;

function getSegments() {
  return HERO_LINES.split("");
}

/** Duração aproximada até o cursor do typewriter aparecer (para sincronizar outros efeitos). */
export function getHeroTypewriterCursorStartMs(): number {
  const n = getSegments().length;
  if (n === 0) return 0;
  return (DELAY_BEFORE_TYPING + (n - 1) * STAGGER + CHAR_DURATION + CURSOR_PAUSE_AFTER_TEXT) * 1000;
}

type HeroTypewriterHeadingProps = {
  className?: string;
};

export function HeroTypewriterHeading({ className }: HeroTypewriterHeadingProps) {
  const segments = getSegments();
  const cursorDelay =
    DELAY_BEFORE_TYPING + Math.max(0, segments.length - 1) * STAGGER + CHAR_DURATION + CURSOR_PAUSE_AFTER_TEXT;
  const [cursorPhase, setCursorPhase] = useState<"fadeIn" | "blink">("fadeIn");

  return (
    <h1 className={className}>
      {segments.map((char, i) => {
        const delay = DELAY_BEFORE_TYPING + i * STAGGER;
        if (char === "\n") {
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay, duration: CHAR_DURATION }}
              className="block"
              aria-hidden
            />
          );
        }
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay, duration: CHAR_DURATION }}
            className="inline"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        );
      })}
      <motion.span
        initial={{ opacity: 0, scaleY: 0.2 }}
        animate={
          cursorPhase === "fadeIn"
            ? { opacity: 1, scaleY: 1 }
            : { opacity: [1, 0.35, 1], scaleY: 1 }
        }
        transition={
          cursorPhase === "fadeIn"
            ? {
                delay: cursorDelay,
                duration: CURSOR_FADE_DURATION,
                ease: [0.22, 1, 0.36, 1],
              }
            : {
                duration: 1.15,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        onAnimationComplete={() => {
          setCursorPhase((p) => (p === "fadeIn" ? "blink" : p));
        }}
        className="inline-block w-[3px] h-[0.85em] origin-center bg-primary-foreground/90 ml-1 align-middle rounded-sm"
        aria-hidden
      />
    </h1>
  );
}

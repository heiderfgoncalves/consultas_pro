import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  CHAR_DURATION,
  CURSOR_FADE_DURATION,
  CURSOR_PAUSE_AFTER_TEXT,
  DELAY_BEFORE_TYPING,
  HERO_LINES,
  STAGGER,
} from '@/lib/hero-typewriter';

function getCharacterCount() {
  return HERO_LINES.join('').length;
}

type HeroTypewriterHeadingProps = {
  className?: string;
};

export function HeroTypewriterHeading({ className }: HeroTypewriterHeadingProps) {
  const totalCharacters = getCharacterCount();
  const cursorDelay =
    DELAY_BEFORE_TYPING + Math.max(0, totalCharacters - 1) * STAGGER + CHAR_DURATION + CURSOR_PAUSE_AFTER_TEXT;
  const [cursorPhase, setCursorPhase] = useState<'fadeIn' | 'blink'>('fadeIn');
  let charIndex = 0;

  return (
    <h1 className={className}>
      {HERO_LINES.map((line, lineIndex) => (
        <span
          key={line}
          className={lineIndex === HERO_LINES.length - 1 ? 'block whitespace-nowrap' : 'block'}
        >
          {line.split('').map((char) => {
            const delay = DELAY_BEFORE_TYPING + charIndex * STAGGER;
            const key = `${lineIndex}-${charIndex}`;
            charIndex += 1;

            return (
              <motion.span
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay, duration: CHAR_DURATION }}
                className="inline"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            );
          })}
          {lineIndex === HERO_LINES.length - 1 ? (
            <motion.span
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={
                cursorPhase === 'fadeIn'
                  ? { opacity: 1, scaleY: 1 }
                  : { opacity: [1, 0.35, 1], scaleY: 1 }
              }
              transition={
                cursorPhase === 'fadeIn'
                  ? {
                      delay: cursorDelay,
                      duration: CURSOR_FADE_DURATION,
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : {
                      duration: 1.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              onAnimationComplete={() => {
                setCursorPhase((p) => (p === 'fadeIn' ? 'blink' : p));
              }}
              className="inline-block w-[3px] h-[0.85em] origin-center bg-primary-foreground/90 ml-1 align-middle rounded-sm"
              aria-hidden
            />
          ) : null}
        </span>
      ))}
    </h1>
  );
}

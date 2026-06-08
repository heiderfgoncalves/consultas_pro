import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './TrueFocus.css';

interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
}

const isVisualDivider = (word: string) => /^[•·|/\\\-–—]+$/.test(word.trim());

const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'True Focus',
  separator = ' ',
  manualMode = false,
  blurAmount = 5,
  borderColor = 'var(--brand)',
  glowColor = 'var(--brand-glow)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1,
  className = ''
}) => {
  const words = useMemo(() => sentence.split(separator), [sentence, separator]);
  const focusableIndices = useMemo(
    () => words.map((word, index) => (isVisualDivider(word) ? -1 : index)).filter((index) => index >= 0),
    [words],
  );
  const [currentIndex, setCurrentIndex] = useState(focusableIndices[0] ?? 0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const normalizeIndex = (index: number) => {
    if (focusableIndices.includes(index)) return index;
    return focusableIndices[0] ?? 0;
  };

  const activeIndex = hoveredIndex !== null ? hoveredIndex : normalizeIndex(currentIndex);

  useEffect(() => {
    if (focusableIndices.length === 0) return;
    setCurrentIndex((current) => normalizeIndex(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusableIndices.join('|')]);

  useEffect(() => {
    if (!manualMode && hoveredIndex === null && focusableIndices.length > 1) {
      const interval = setInterval(
        () => {
          setCurrentIndex((prev) => {
            const safePrev = normalizeIndex(prev);
            const currentPosition = focusableIndices.indexOf(safePrev);
            return focusableIndices[(currentPosition + 1) % focusableIndices.length] ?? 0;
          });
        },
        (animationDuration + pauseBetweenAnimations) * 1000
      );

      return () => clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, hoveredIndex, focusableIndices]);

  useEffect(() => {
    if (activeIndex === null || activeIndex === -1) return;
    if (!wordRefs.current[activeIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeEl = wordRefs.current[activeIndex];
    if (activeEl) {
      const activeRect = activeEl.getBoundingClientRect();
      setFocusRect({
        x: activeRect.left - parentRect.left,
        y: activeRect.top - parentRect.top,
        width: activeRect.width,
        height: activeRect.height
      });
    }
  }, [activeIndex, words.length]);

  const handleMouseEnter = (index: number) => {
    if (isVisualDivider(words[index] ?? '')) return;
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    } else {
      setHoveredIndex(index);
    }
  };

  const handleContainerMouseLeave = () => {
    if (manualMode) {
      setCurrentIndex(normalizeIndex(lastActiveIndex ?? 0));
    } else {
      if (hoveredIndex !== null) {
        setCurrentIndex(normalizeIndex(hoveredIndex));
        setHoveredIndex(null);
      }
    }
  };

  const customStyle = {
    '--border-color': borderColor,
    '--glow-color': glowColor
  } as React.CSSProperties;

  return (
    <div 
      className={`focus-container ${className}`} 
      ref={containerRef} 
      style={customStyle}
      onMouseLeave={handleContainerMouseLeave}
    >
      {words.map((word, index) => {
        const isDivider = isVisualDivider(word);
        const isActive = index === activeIndex && !isDivider;
        return (
          <span
            key={index}
            ref={el => {
              wordRefs.current[index] = el;
            }}
            className={`focus-word ${isDivider ? 'focus-word-divider' : ''} ${manualMode ? 'manual' : ''} ${isActive && !manualMode ? 'active' : ''}`}
            style={{
              filter: isDivider || isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              transition: `filter ${animationDuration}s cubic-bezier(0.25, 0.8, 0.25, 1)`
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            aria-hidden={isDivider ? true : undefined}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: focusableIndices.length > 0 && activeIndex >= 0 ? 1 : 0
        }}
        transition={{
          type: 'spring',
          damping: 18,
          stiffness: 160,
          mass: 0.8
        }}
      >
        <span className="corner top-left"></span>
        <span className="corner top-right"></span>
        <span className="corner bottom-left"></span>
        <span className="corner bottom-right"></span>
      </motion.div>
    </div>
  );
};

export default TrueFocus;

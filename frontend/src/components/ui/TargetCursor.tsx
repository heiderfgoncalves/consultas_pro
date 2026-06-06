import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import './TargetCursor.css';

interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
}

const getContainingBlock = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      style.transform !== 'none' ||
      style.perspective !== 'none' ||
      style.filter !== 'none' ||
      style.willChange.includes('transform') ||
      style.willChange.includes('perspective') ||
      style.willChange.includes('filter') ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const getContainingBlockOffset = (block: HTMLElement | null) => {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
};

const TargetCursor: React.FC<TargetCursorProps> = ({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<NodeListOf<HTMLElement> | null>(null);
  const spinTl = useRef<gsap.core.Timeline | null>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const containingBlockRef = useRef<HTMLElement | null>(null);

  const isActiveRef = useRef<boolean>(false);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const targetCornerPositionsRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const activeStrengthRef = useRef<{ current: number }>({ current: 0 });

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent?.toLowerCase() || '');
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }, []);

  const constants = useMemo(
    () => ({
      borderWidth: 3,
      cornerSize: 12
    }),
    []
  );  useEffect(() => {
    if (isMobile || !cursorRef.current) return;

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll('.target-cursor-corner');

    containingBlockRef.current = getContainingBlock(cursor);
    const getOffset = () => getContainingBlockOffset(containingBlockRef.current);

    let activeTarget: HTMLElement | null = null;
    let currentLeaveHandler: (() => void) | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanupTarget = (target: HTMLElement) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler);
      }
      currentLeaveHandler = null;
    };

    const initialOffset = getOffset();
    const mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const currentPos = { 
      x: window.innerWidth / 2 - initialOffset.x, 
      y: window.innerHeight / 2 - initialOffset.y 
    };

    const { cornerSize } = constants;
    const cornerPositions = [
      { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: cornerSize * 0.5 },
      { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
    ];

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: currentPos.x,
      y: currentPos.y
    });

    const createSpinTimeline = () => {
      if (spinTl.current) {
        spinTl.current.kill();
      }
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    };

    createSpinTimeline();

    const tickerFn = () => {
      if (!cursorRef.current || !cornersRef.current) return;

      const { x: offsetX, y: offsetY } = getOffset();
      let targetX = mousePos.x - offsetX;
      let targetY = mousePos.y - offsetY;

      const strength = activeStrengthRef.current.current;

      // Efeito magnético de 35% de atração em direção ao centro do elemento hoverado
      if (isActiveRef.current && activeTargetRef.current) {
        const rect = activeTargetRef.current.getBoundingClientRect();
        const targetCenterX = rect.left + rect.width / 2;
        const targetCenterY = rect.top + rect.height / 2;
        
        const force = 0.35 * strength;
        targetX = targetX + (targetCenterX - offsetX - targetX) * force;
        targetY = targetY + (targetCenterY - offsetY - targetY) * force;
      }

      // LERP dinâmico e elástico ultra suave para a movimentação do cursor
      currentPos.x += (targetX - currentPos.x) * 0.25;
      currentPos.y += (targetY - currentPos.y) * 0.25;

      gsap.set(cursor, {
        x: currentPos.x,
        y: currentPos.y
      });

      const corners = Array.from(cornersRef.current);
      if (corners.length === 4) {
        if (isActiveRef.current && activeTargetRef.current && strength > 0) {
          const rect = activeTargetRef.current.getBoundingClientRect();
          const { borderWidth, cornerSize: cSize } = constants;

          // Posições-alvo das quinas relativas à posição atual do cursor (pois as quinas são filhas do cursor)
          const targetCorners = [
            { x: rect.left - borderWidth - offsetX - currentPos.x, y: rect.top - borderWidth - offsetY - currentPos.y },
            { x: rect.right + borderWidth - cSize - offsetX - currentPos.x, y: rect.top - borderWidth - offsetY - currentPos.y },
            { x: rect.right + borderWidth - cSize - offsetX - currentPos.x, y: rect.bottom + borderWidth - cSize - offsetY - currentPos.y },
            { x: rect.left - borderWidth - offsetX - currentPos.x, y: rect.bottom + borderWidth - cSize - offsetY - currentPos.y }
          ];

          corners.forEach((corner, i) => {
            const cp = cornerPositions[i];
            cp.x += (targetCorners[i].x - cp.x) * 0.22 * strength;
            cp.y += (targetCorners[i].y - cp.y) * 0.22 * strength;
            gsap.set(corner, { x: cp.x, y: cp.y });
          });
        } else {
          const { cornerSize: cSize } = constants;
          const defaultPositions = [
            { x: -cSize * 1.5, y: -cSize * 1.5 },
            { x: cSize * 0.5, y: -cSize * 1.5 },
            { x: cSize * 0.5, y: cSize * 0.5 },
            { x: -cSize * 1.5, y: cSize * 0.5 }
          ];

          corners.forEach((corner, i) => {
            const cp = cornerPositions[i];
            cp.x += (defaultPositions[i].x - cp.x) * 0.2;
            cp.y += (defaultPositions[i].y - cp.y) * 0.2;
            gsap.set(corner, { x: cp.x, y: cp.y });
          });
        }
      }
    };

    gsap.ticker.add(tickerFn);

    const moveHandler = (e: MouseEvent) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    };
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      const { x: offsetX, y: offsetY } = getOffset();
      const mouseX = currentPos.x + offsetX;
      const mouseY = currentPos.y + offsetY;
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY) as HTMLElement | null;
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget || elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget) {
        if (currentLeaveHandler) {
          currentLeaveHandler();
        }
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
    };

    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    const enterHandler = (e: MouseEvent) => {
      const directTarget = e.target as HTMLElement;
      const allTargets: HTMLElement[] = [];
      let current: HTMLElement | null = directTarget;
      while (current && current !== document.body && current !== document.documentElement) {
        if (current.matches) {
          const style = window.getComputedStyle(current);
          const isPointer = style.cursor === 'pointer' || style.cursor === 'grab';
          if (isPointer || current.matches(targetSelector)) {
            allTargets.push(current);
          }
        }
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) {
        cleanupTarget(activeTarget);
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      activeTargetRef.current = target;

      gsap.killTweensOf(cursorRef.current, 'rotation');
      spinTl.current?.pause();
      gsap.set(cursorRef.current, { rotation: 0 });

      isActiveRef.current = true;

      gsap.to(activeStrengthRef.current, {
        current: 1,
        duration: hoverDuration,
        ease: 'power2.out'
      });

      const leaveHandler = () => {
        isActiveRef.current = false;
        activeTargetRef.current = null;
        activeTarget = null;

        gsap.to(activeStrengthRef.current, {
          current: 0,
          duration: hoverDuration,
          ease: 'power2.out',
          onComplete: () => {
            if (!isActiveRef.current && cursorRef.current && spinTl.current) {
              const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number;
              const normalizedRotation = currentRotation % 360;
              spinTl.current.kill();
              spinTl.current = gsap
                .timeline({ repeat: -1 })
                .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
              gsap.to(cursorRef.current, {
                rotation: normalizedRotation + 360,
                duration: spinDuration * (1 - normalizedRotation / 360),
                ease: 'none',
                onComplete: () => {
                  spinTl.current?.restart();
                }
              });
            }
          }
        });

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler, { passive: true });

    const resizeHandler = () => {
      containingBlockRef.current = getContainingBlock(cursor);
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
      gsap.ticker.remove(tickerFn);

      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);

      if (activeTarget) {
        cleanupTarget(activeTarget);
      }

      spinTl.current?.kill();
      document.body.style.cursor = originalCursor;

      isActiveRef.current = false;
      activeTargetRef.current = null;
      activeStrengthRef.current.current = 0;
    };
  }, [targetSelector, spinDuration, constants, hideDefaultCursor, isMobile, hoverDuration, parallaxOn]);

  useEffect(() => {
    if (isMobile || !cursorRef.current || !spinTl.current) return;
    if (spinTl.current.isActive()) {
      spinTl.current.kill();
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    }
  }, [spinDuration, isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  );
};

export default TargetCursor;

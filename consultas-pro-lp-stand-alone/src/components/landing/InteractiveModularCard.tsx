import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useDragControls,
  animate,
} from "framer-motion";
import { GripHorizontal, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";

interface InteractiveModularCardProps {
  children: React.ReactNode;
  className?: string;
  resetOnDoubleClick?: boolean;
  dragGroup?: string;
  index?: number;
  onSwap?: (draggedIdx: number, targetIdx: number, group: string) => void;
  hoverScale?: number;
  isActive?: boolean;
  showScanner?: boolean;
  useDragHandle?: boolean;
}

export function InteractiveModularCard({
  children,
  className = "",
  resetOnDoubleClick = true,
  dragGroup,
  index,
  onSwap,
  hoverScale,
  isActive = false,
  showScanner = false,
  useDragHandle = false,
}: InteractiveModularCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const currentIndexRef = useRef(index);
  const lastSwapAtRef = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      currentIndexRef.current = index;
    }
  }, [index, isDragging]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  // Motion values de coordenadas reais para o arraste
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Controls de drag focado se requisitado
  const dragControls = useDragControls();

  // Motion values para anular a translação no fantasma de origem
  const ghostX = useTransform(x, (v) => -v);
  const ghostY = useTransform(y, (v) => -v);

  // Reset animado suave para a posição de origem
  const handleDoubleClick = () => {
    if (resetOnDoubleClick && !useDragHandle) {
      animate(x, 0, { type: "spring", damping: 22, stiffness: 220 });
      animate(y, 0, { type: "spring", damping: 22, stiffness: 220 });
    }
  };

  const getClosestSlotIndex = () => {
    if (dragGroup === undefined || !cardRef.current) return null;

    const slots = document.querySelectorAll(
      `.grid-anchor-slot[data-grid-group="${dragGroup}"]`,
    );

    if (!slots.length) return null;

    const cardRect = cardRef.current.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    let targetIdx: number | null = null;
    let minDistance = Infinity;
    let maxAcceptableDistance = 0;

    slots.forEach((slotNode) => {
      const slot = slotNode as HTMLElement;
      const slotRect = slot.getBoundingClientRect();
      const slotCenterX = slotRect.left + slotRect.width / 2;
      const slotCenterY = slotRect.top + slotRect.height / 2;
      const dist = Math.hypot(cardCenterX - slotCenterX, cardCenterY - slotCenterY);

      if (dist < minDistance) {
        minDistance = dist;
        targetIdx = parseInt(slot.getAttribute("data-slot-index") || "0", 10);
        const slotDiagonal = Math.hypot(slotRect.width, slotRect.height);
        maxAcceptableDistance = Math.min(300, Math.max(86, slotDiagonal * 0.64));
      }
    });

    if (targetIdx === null || minDistance > maxAcceptableDistance) return null;
    return targetIdx;
  };

  const handleLiveSwap = () => {
    if (dragGroup === undefined || currentIndexRef.current === undefined || !onSwap) {
      return;
    }

    const now = performance.now();
    if (now - lastSwapAtRef.current < 120) return;

    const targetIdx = getClosestSlotIndex();
    const currentIdx = currentIndexRef.current;

    if (targetIdx !== null && targetIdx !== currentIdx) {
      lastSwapAtRef.current = now;
      onSwap(currentIdx, targetIdx, dragGroup);
      currentIndexRef.current = targetIdx;
    }
  };

  // Finaliza no slot atual. A troca principal já ocorre durante o arraste para dar feedback imediato.
  const handleDragEnd = () => {
    setIsDragging(false);
    currentIndexRef.current = index;
    animate(x, 0, { type: "spring", damping: 20, stiffness: 180 });
    animate(y, 0, { type: "spring", damping: 20, stiffness: 180 });
  };

  return (
    <motion.div
      ref={cardRef}
      layout // Habilita animações fluidas automáticas de mola quando o layout do DOM mudar
      style={{
        x,
        y,
      }}
      drag
      dragControls={useDragHandle ? dragControls : undefined}
      dragListener={!useDragHandle}
      dragElastic={0.12}
      dragMomentum={false} // Mantém o controle preciso sem empurrões extras
      onDragStart={() => {
        currentIndexRef.current = index;
        lastSwapAtRef.current = 0;
        setIsDragging(true);
      }}
      onDrag={handleLiveSwap}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        scale: hoverScale ?? 1.015,
        zIndex: 40,
        translateZ: 0,
        boxShadow: isActive
          ? `0 12px 30px color-mix(in srgb, var(--brand) ${isDark ? "25%" : "12%"}, transparent)`
          : `0 15px 35px color-mix(in srgb, var(--brand) ${isDark ? "15%" : "8%"}, transparent)`,
        borderColor: isActive
          ? "var(--brand)"
          : `color-mix(in srgb, var(--brand) ${isDark ? "45%" : "22%"}, transparent)`,
        transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
      }}
      whileDrag={{
        scale: 1.03,
        zIndex: 50,
        translateZ: 0,
        boxShadow: `0 25px 50px color-mix(in srgb, var(--brand) ${isDark ? "25%" : "14%"}, transparent)`,
        borderColor: `color-mix(in srgb, var(--brand) ${isDark ? "70%" : "35%"}, transparent)`,
        cursor: "grabbing",
        transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
      }}
      className={`relative select-none border interactive-modular-card group/card ${
        isActive
          ? "border-brand bg-card/98 dark:bg-stone-950/98 shadow-[0_0_24px_color-mix(in srgb, var(--brand) 22%, transparent)] scale-[1.01]"
          : "border-hairline bg-card/98 dark:bg-stone-950/98 backdrop-blur-md"
      } ${isDragging ? "cursor-grabbing" : isHovered ? (useDragHandle ? "cursor-default" : "cursor-grab") : ""} ${className}`}
    >
      {/* Scanner vertical individual de fundo quando ativo ou showScanner for requisitado */}
      {(showScanner || isActive) && (
        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none z-0">
          <div
            className="absolute left-0 right-0 h-[35%] bg-gradient-to-b from-transparent via-brand/20 to-transparent opacity-100"
            style={{
              animation: "scan-down 2.5s linear infinite",
            }}
          />
        </div>
      )}

      {/* Fundo e borda pulsante com Glow sutil */}
      <div
        className={`absolute inset-0 rounded-md pointer-events-none z-0 transition-opacity duration-300 ${
          isActive
            ? "bg-brand/5 animate-pulse opacity-100"
            : "bg-brand/[0.01] opacity-30"
        }`}
      />
      <div
        className={`absolute -inset-px rounded-md border pointer-events-none z-0 transition-opacity duration-300 ${
          isActive
            ? "border-brand/35 animate-pulse opacity-100"
            : "border-brand/10 opacity-10 group-hover/card:opacity-50"
        }`}
      />

      {/* Clone fantasma estático de preview na posição original de onde foi arrastado por contra-movimento */}
      {isDragging && (
        <motion.div
          style={{
            x: ghostX,
            y: ghostY,
          }}
          className="absolute inset-0 rounded-md border border-dashed border-brand/55 bg-brand/5 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-0"
        >
          <div className="mono text-[8px] tracking-[0.2em] text-brand/80 uppercase animate-pulse font-semibold">
            PREVIEW DETECTADO
          </div>
          <div className="mono text-[6.5px] tracking-widest text-muted-foreground/60 mt-0.5 font-mono">
            [ OFFLINE_SLOT_0{index !== undefined ? index + 1 : "?"} ]
          </div>
        </motion.div>
      )}

      {/* Indicador de drag "Grip" */}
      <div
        onPointerDown={
          useDragHandle
            ? (e) => {
                e.stopPropagation();
                dragControls.start(e);
              }
            : undefined
        }
        className={`absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface border border-hairline text-muted-foreground transition-all duration-300 z-30 ${
          useDragHandle && (isHovered || isDragging)
            ? "cursor-grab active:cursor-grabbing pointer-events-auto"
            : "pointer-events-none"
        } ${isHovered || isDragging ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
      >
        <GripHorizontal className="h-3 w-3 text-brand animate-pulse" />
        <span className="mono text-[8px] tracking-wider uppercase font-semibold text-brand/90">
          {useDragHandle ? "ARRASTAR" : "AGARRAR"}
        </span>
      </div>

      {/* Dica de Reset em hover ou arrasto */}
      {!useDragHandle && (
        <div
          className={`absolute bottom-2 right-3 flex items-center gap-1.5 text-muted-foreground/50 transition-all duration-300 pointer-events-none z-30 ${
            isHovered && !isDragging ? "opacity-100" : "opacity-0"
          }`}
        >
          <RotateCcw className="h-2.5 w-2.5 text-brand/70" />
          <span className="mono text-[7px] tracking-wider uppercase">
            Dbl Clique p/ Reset
          </span>
        </div>
      )}

      {/* Conteúdo interno do card com z-index para ficar sobre o fundo de scanner/pulse */}
      <div className="h-full w-full pointer-events-auto relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

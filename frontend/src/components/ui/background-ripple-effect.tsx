import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

export const BackgroundRippleEffect = ({
  rows = 8,
  cols = 27,
  cellSize = 56,
  className,
  gridClassName,
  /** Máscara radial forte (estilo Aceternity); em false a grade cobre a área inteira e fica bem visível. */
  masked = false,
  /** Escala a grade para cobrir 100% do container (largura e altura), com leve folga. */
  cover = false,
  /** Em modo cover, permite ancorar a malha em vez de centralizar. */
  coverPosition = "center",
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
  gridClassName?: string;
  masked?: boolean;
  cover?: boolean;
  coverPosition?: "center" | "top-right" | "top-left";
}) => {
  const coverWrapRef = useRef<HTMLDivElement>(null);
  const [coverDimensions, setCoverDimensions] = useState({ rows, cols });

  useEffect(() => {
    if (!cover) return;
    const el = coverWrapRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || cellSize < 1) return;
      const overscan = coverPosition === "center" ? 4 : 0;
      setCoverDimensions({
        cols: Math.max(cols, Math.ceil(r.width / cellSize) + overscan),
        rows: Math.max(rows, Math.ceil(r.height / cellSize) + overscan),
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cellSize, cols, cover, coverPosition, rows]);

  const activeRows = cover ? coverDimensions.rows : rows;
  const activeCols = cover ? coverDimensions.cols : cols;

  const grid = (
    <DivGrid
      className={cn(
        "relative z-[3]",
        masked ? "opacity-40 ripple-grid-mask" : "opacity-100",
        gridClassName,
      )}
      rows={activeRows}
      cols={activeCols}
      cellSize={cellSize}
      borderColor="var(--cell-border-color)"
      fillColor="var(--cell-fill-color)"
      interactive
    />
  );

  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:hsl(var(--border))] [--cell-fill-color:hsl(var(--muted))] [--cell-shadow-color:hsl(var(--muted-foreground))]",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full min-h-full w-full overflow-hidden",
          cover ? "absolute inset-0" : "flex items-center justify-center",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />
        {cover ? (
          <div
            ref={coverWrapRef}
            className={cn(
              "absolute inset-0 flex",
              coverPosition === "top-right" && "items-start justify-end",
              coverPosition === "top-left" && "items-start justify-start",
              coverPosition === "center" && "items-center justify-center",
            )}
          >
            <div className="flex items-center justify-center">
              {grid}
            </div>
          </div>
        ) : (
          grid
        )}
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  interactive?: boolean;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  fillColor = "rgba(14,165,233,0.3)",
  interactive = true,
}: DivGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Armazena as dimensões e células sem remontar ou re-renderizar desnecessariamente
  const gridStyle: React.CSSProperties = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  }), [cols, rows, cellSize]);

  const totalCells = rows * cols;
  const cells = useMemo(() => Array.from({ length: totalCells }, (_, idx) => idx), [totalCells]);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !gridRef.current) return;

    // Delegação de eventos para encontrar o elemento de célula clicado de forma síncrona e rápida
    const target = (e.target as HTMLElement).closest(".cell-ripple-item");
    if (!target) return;

    const rowIdx = parseInt(target.getAttribute("data-row") || "0", 10);
    const colIdx = parseInt(target.getAttribute("data-col") || "0", 10);

    // Obtém todas as células filhas diretamente via DOM real, evitando overhead de ciclo de vida do React
    const children = gridRef.current.children;
    const length = children.length;

    for (let i = 0; i < length; i++) {
      const child = children[i] as HTMLDivElement;
      if (!child) continue;

      const r = parseInt(child.getAttribute("data-row") || "0", 10);
      const c = parseInt(child.getAttribute("data-col") || "0", 10);

      const distance = Math.hypot(r - rowIdx, c - colIdx);
      const delay = Math.max(0, distance * 55);
      const duration = 200 + distance * 80;

      // Injeta os valores das propriedades CSS diretamente no style inline
      child.style.setProperty("--delay", `${delay}ms`);
      child.style.setProperty("--duration", `${duration}ms`);

      // Reinicia a animação de forma determinística
      child.classList.remove("animate-cell-ripple");
      
      // Força um reflow síncrono no elemento individual para reiniciar o ciclo da animação do browser
      void child.offsetWidth;
      
      child.classList.add("animate-cell-ripple");
    }
  };

  return (
    <div
      ref={gridRef}
      className={cn("relative", className)}
      style={gridStyle}
      onClick={handleGridClick}
    >
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;

        return (
          <div
            key={idx}
            data-row={rowIdx}
            data-col={colIdx}
            className={cn(
              "cell-ripple-item cell relative border-[0.5px] opacity-40 transition-opacity duration-150 will-change-transform hover:opacity-80 dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              !interactive && "pointer-events-none"
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
            }}
          />
        );
      })}
    </div>
  );
};

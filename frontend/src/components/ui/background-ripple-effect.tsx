import { cn } from "@/lib/utils";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

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
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
  gridClassName?: string;
  masked?: boolean;
  cover?: boolean;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const coverWrapRef = useRef<HTMLDivElement>(null);
  const [coverScale, setCoverScale] = useState(1);

  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  useLayoutEffect(() => {
    if (!cover) return;
    const el = coverWrapRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || gridW < 1 || gridH < 1) return;
      const s = Math.max(r.width / gridW, r.height / gridH) * 1.04;
      setCoverScale(s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cover, gridW, gridH]);

  const grid = (
    <DivGrid
      key={`base-${rippleKey}`}
      className={cn(
        "relative z-[3]",
        masked ? "opacity-40 ripple-grid-mask" : "opacity-100",
        gridClassName,
      )}
      rows={rows}
      cols={cols}
      cellSize={cellSize}
      borderColor="var(--cell-border-color)"
      fillColor="var(--cell-fill-color)"
      clickedCell={clickedCell}
      onCellClick={(row, col) => {
        setClickedCell({ row, col });
        setRippleKey((k) => k + 1);
      }}
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
          <div ref={coverWrapRef} className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center will-change-transform"
              style={{
                transform: `scale(${coverScale})`,
                transformOrigin: "center center",
              }}
            >
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
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  fillColor = "rgba(14,165,233,0.3)",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols],
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx) : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0;
        const duration = 200 + distance * 80;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-[0.55] transition-opacity duration-150 will-change-transform hover:opacity-90 dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none",
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined}
          />
        );
      })}
    </div>
  );
};

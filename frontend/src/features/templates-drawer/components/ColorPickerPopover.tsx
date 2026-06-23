import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditorStore } from "../store/editor.store";
import { cn } from "@/lib/utils";
import { type ReactNode, useRef, useState } from "react";

type Props = {
  value: string | undefined;
  onChange: (color: string) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  title?: string;
};

const PRESETS = [
  "#000000", "#1f2937", "#475569", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

// Utilitários para manipular cores de 8 caracteres hexadecimais (#RRGGBBAA) e "transparent"
function parseColorHex(colorStr: string | undefined): { hex6: string; opacity: number } {
  if (!colorStr) return { hex6: "#000000", opacity: 100 };
  if (colorStr === "transparent") return { hex6: "#ffffff", opacity: 0 };
  
  const clean = colorStr.trim();
  if (/^#[0-9a-fA-F]{8}$/.test(clean)) {
    const hex6 = clean.substring(0, 7);
    const aa = clean.substring(7, 9);
    const opacity = Math.round((parseInt(aa, 16) / 255) * 100);
    return { hex6, opacity };
  }
  
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    return { hex6: clean, opacity: 100 };
  }
  
  return { hex6: "#000000", opacity: 100 };
}

function stringifyColorHex(hex6: string, opacity: number): string {
  if (opacity === 0) return "transparent";
  if (opacity === 100) return hex6;
  const aa = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0");
  return `${hex6}${aa}`;
}

export function ColorPickerPopover({ value, onChange, children, align = "start", side, title }: Props) {
  const [open, setOpen] = useState(false);
  const lastPushedRef = useRef<string | null>(null);
  const recent = useEditorStore((s) => s.recentColors);
  const push = useEditorStore((s) => s.pushRecentColor);

  const { hex6, opacity: opacityValue } = parseColorHex(value);

  function apply(c: string) {
    const cleanColor = c.trim().toLowerCase();
    onChange(cleanColor);
    push(cleanColor, lastPushedRef.current ?? undefined);
    lastPushedRef.current = cleanColor;
  }

  function handleColorChange(newHex6: string) {
    const updated = stringifyColorHex(newHex6, opacityValue === 0 ? 100 : opacityValue);
    apply(updated);
  }

  function handleOpacityChange(newOpacity: number) {
    const updated = stringifyColorHex(hex6, newOpacity);
    apply(updated);
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        lastPushedRef.current = null;
      }
    }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-64 p-3.5 space-y-3.5 bg-white dark:bg-popover border border-slate-200 dark:border-border shadow-xl rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && <div className="text-xs font-semibold text-slate-700 dark:text-foreground">{title}</div>}
        
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex6}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-8 p-0.5 border border-slate-200 dark:border-border rounded-lg cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => e.target.value && push(e.target.value)}
            placeholder="#000000 ou transparent"
            className="flex-1 h-8 px-2 py-1 text-xs border border-slate-200 dark:border-border dark:bg-muted dark:text-foreground rounded-lg font-mono outline-none focus:ring-1 ring-indigo-500"
          />
        </div>

        {/* Range Slider de Opacidade */}
        <div className="space-y-1.5 border-t border-slate-100 dark:border-border pt-2.5">
          <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 dark:text-muted-foreground">
            <span>Opacidade</span>
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-foreground">{opacityValue}%</span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="range"
              min="0"
              max="100"
              value={opacityValue}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-100 dark:bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <button
              onClick={() => handleOpacityChange(0)}
              className={cn(
                "px-2 py-1 text-[10px] font-semibold border rounded-md transition-colors",
                opacityValue === 0
                  ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
                  : "bg-slate-50 dark:bg-muted text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-accent"
              )}
            >
              Transparente
            </button>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="border-t border-slate-100 dark:border-border pt-2.5">
            <div className="text-[10px] text-slate-500 dark:text-muted-foreground mb-1.5 font-medium">Recentes</div>
            <div className="grid grid-cols-8 gap-1.5">
              {recent.slice(0, 16).map((c) => (
                <button
                  key={c}
                  onClick={() => apply(c)}
                  title={c}
                  className={cn(
                    "w-5 h-5 rounded-md border border-slate-200 dark:border-border shadow-sm transition-transform hover:scale-110",
                    value === c && "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-border pt-2.5">
          <div className="text-[10px] text-slate-500 dark:text-muted-foreground mb-1.5 font-medium">Paleta Padrão</div>
          <div className="grid grid-cols-8 gap-1.5">
            {PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => apply(c)}
                title={c}
                className={cn(
                  "w-5 h-5 rounded-md border border-slate-200 dark:border-border shadow-sm transition-transform hover:scale-110",
                  value === c && "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
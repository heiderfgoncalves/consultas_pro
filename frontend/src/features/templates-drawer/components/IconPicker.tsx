import { useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { icons as LucideIcons } from "lucide-react";
import { ICON_CATALOG } from "../utils/icon-catalog";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onPick: (name: string) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
};

export function IconPicker({ value, onPick, children, align = "start", side }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ICON_CATALOG.map((c) => ({
      ...c,
      names: c.names.filter((n) => !q || n.toLowerCase().includes(q)),
    })).filter((c) => c.names.length > 0);
  }, [query]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} side={side} className="w-[360px] p-2" onMouseDown={(e) => e.stopPropagation()}>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ícone..."
          className="w-full px-2 py-1.5 text-xs border rounded mb-2"
        />
        <div className="max-h-[320px] overflow-auto space-y-3 pr-1">
          {filtered.map((cat) => (
            <div key={cat.category}>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                {cat.category}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {cat.names.map((n) => {
                  const Icon = (LucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[n];
                  if (!Icon) return null;
                  return (
                    <button
                      key={n}
                      onClick={() => onPick(n)}
                      title={n}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center rounded hover:bg-slate-100 text-slate-700",
                        value === n && "bg-slate-200 ring-1 ring-slate-400",
                      )}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-6">Nenhum ícone encontrado.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
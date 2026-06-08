interface PlaceholderTableProps {
  label: string;
  cols?: number;
}

export default function PlaceholderTable({ label, cols = 3 }: PlaceholderTableProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border/60 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-dashed border-border/40">
        <div className="w-3 h-3 rounded border border-dashed border-muted-foreground/30" />
        <span className="text-[10px] text-muted-foreground/70 font-medium">{label}</span>
      </div>
      <div className="p-3 space-y-2.5">
        <div className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-2.5 rounded-sm border border-dashed border-border/50 flex-1" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-2 rounded-sm border border-dashed border-border/30 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 text-[9px] text-muted-foreground/50 italic text-center border-t border-dashed border-border/40">
        Dados exibidos após emissão da consulta
      </div>
    </div>
  );
}

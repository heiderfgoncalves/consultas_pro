import { Gauge } from 'lucide-react';

export default function PlaceholderScore() {
  return (
    <div className="rounded-lg border-2 border-dashed border-border/60 p-4 text-center space-y-3">
      <div className="w-[120px] h-[65px] mx-auto rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center">
        <Gauge className="w-6 h-6 text-muted-foreground/25" />
      </div>
      <div className="h-5 w-14 mx-auto rounded border border-dashed border-border/40" />
      <div className="grid grid-cols-2 gap-2 max-w-[280px] mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center"
          >
            <div className="w-8 h-1.5 rounded-sm border border-dashed border-border/30" />
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/50 italic">
        Score e métricas exibidos após emissão
      </p>
    </div>
  );
}

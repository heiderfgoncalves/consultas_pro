import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  chartColor: string;
  chartData: { val: number }[];
  delay?: number;
}

export default function KpiCard({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon: Icon,
  chartColor,
  chartData,
  delay = 0,
}: KpiCardProps) {
  // Higieniza o ID do gradiente SVG para evitar quebras por espaços ou caracteres especiais
  const gradId = `kpiGrad-${title.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-elevated flex flex-col justify-between h-40 hover:border-border transition-all group overflow-hidden relative"
      style={{
        // Define uma borda ligeiramente colorida no hover baseada na cor de acento do card
        '--hover-border-color': `${chartColor}40`,
      } as React.CSSProperties}
    >
      {/* Backlight / Glow Premium no canto superior direito */}
      <div
        className="absolute -top-10 -right-10 w-28 h-24 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-500 group-hover:opacity-25"
        style={{ backgroundColor: chartColor }}
      />

      <div className="flex justify-between items-start">
        <div className="space-y-1.5 z-10">
          {/* Título */}
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            {title}
          </span>
          {/* Valor */}
          <h3 className="text-2xl font-black text-foreground tracking-tight mt-1 group-hover:text-foreground/90 transition-colors">
            {value}
          </h3>
          
          {/* Indicador de Tendência ou Subtítulo */}
          {change ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                <span className="text-[11px] leading-none">{isPositive ? '↑' : '↓'}</span>
                {change}
              </span>
            </div>
          ) : subtitle ? (
            <span className="text-[10px] font-bold text-muted-foreground/70 block mt-1.5 leading-tight">
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* Ícone no topo direito com vidro colorido e brilho sutil */}
        <div
          className="p-2.5 rounded-xl border transition-all duration-300 z-10 group-hover:scale-110 group-hover:rotate-1"
          style={{
            backgroundColor: `${chartColor}12`, // ~7% de opacidade
            borderColor: `${chartColor}25`,     // ~15% de opacidade
            color: chartColor,
            boxShadow: `0 4px 15px -2px ${chartColor}20`,
          }}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* Mini gráfico no rodapé com bordas fluidas */}
      <div className="h-10 w-full mt-3 -mx-5 -mb-5 relative opacity-80 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="val"
              stroke={chartColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface ScoreSpeedometerProps {
  score?: number;
  size?: 'small' | 'large';
}

export default function ScoreSpeedometer({
  score = 0,
  size = 'large',
}: ScoreSpeedometerProps) {
  const clampedScore = Math.max(0, Math.min(1000, score));
  const angle = (clampedScore / 1000) * 180;
  const radian = (angle * Math.PI) / 180;
  const cx = 100,
    cy = 90,
    r = 80;
  const needleX = cx - r * Math.cos(radian);
  const needleY = cy - r * Math.sin(radian);

  const getBand = (s: number) => {
    if (s <= 200) return { label: 'Péssimo', color: '#dc2626' };
    if (s <= 400) return { label: 'Ruim', color: '#ea580c' };
    if (s <= 600) return { label: 'Regular', color: '#ca8a04' };
    if (s <= 800) return { label: 'Bom', color: '#65a30d' };
    return { label: 'Ótimo', color: '#16a34a' };
  };

  const band = getBand(clampedScore);
  const isSmall = size === 'small';

  return (
    <div className="text-center">
      <svg
        viewBox="0 0 200 115"
        className={`w-full mx-auto ${isSmall ? 'max-w-[120px]' : 'max-w-[175px]'}`}
      >
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path d="M 20 90 A 80 80 0 0 1 35.28 42.98" fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" />
        <path d="M 35.28 42.98 A 80 80 0 0 1 75.28 13.91" fill="none" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
        <path d="M 75.28 13.91 A 80 80 0 0 1 124.72 13.91" fill="none" stroke="#eab308" strokeWidth="14" strokeLinecap="round" />
        <path d="M 124.72 13.91 A 80 80 0 0 1 164.72 42.98" fill="none" stroke="#84cc16" strokeWidth="14" strokeLinecap="round" />
        <path d="M 164.72 42.98 A 80 80 0 0 1 180 90" fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" />
        <circle cx={needleX} cy={needleY} r="7" fill={band.color} stroke="white" strokeWidth="2" />
        <circle cx={needleX} cy={needleY} r="3" fill="white" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={band.color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="white" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2" fill="hsl(var(--muted-foreground))" />
        <text x="15" y="110" fontSize="11" fill="hsl(var(--muted-foreground))" fontWeight="700">0</text>
        <text x="165" y="110" fontSize="11" fill="hsl(var(--muted-foreground))" fontWeight="700">1000</text>
      </svg>
      <p
        className={`font-semibold mt-1 tracking-tight ${isSmall ? 'text-lg' : 'text-2xl'}`}
        style={{ color: band.color }}
      >
        {clampedScore}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: band.color }}>
        {band.label}
      </p>
    </div>
  );
}

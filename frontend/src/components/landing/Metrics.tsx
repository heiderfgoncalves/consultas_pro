import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 40, suffix: "+", label: "FORNECEDORES INTEGRADOS" },
  { value: 9, suffix: "", label: "TIPOS DE CONSULTA" },
  { value: 99.9, suffix: "%", label: "UPTIME GARANTIDO" },
  { value: 250, suffix: "ms", prefix: "<", label: "LATÊNCIA MÉDIA" },
];

function Counter({ to, decimals = 0, delay = 0 }: { to: number; decimals?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const startTimer = setTimeout(() => {
      const start = performance.now();
      const dur = 1400;
      let raf = 0;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setVal(to * e);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [to, delay]);
  return <span ref={ref}>{decimals ? val.toFixed(decimals) : Math.round(val)}</span>;
}

export function Metrics() {
  return (
    <section className="py-14 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-[-0.035em] text-foreground tabular-nums">
              {s.prefix}
              <Counter to={s.value} decimals={s.value % 1 !== 0 ? 1 : 0} />
              <span className="brand-text">{s.suffix}</span>
            </div>
            <div className="mt-3 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const lines = [
  { t: "10:00:08", tag: "EMIT", tagColor: "text-brand", msg: "Enfileirando job de emissão no BullMQ..." },
  { t: "10:00:10", tag: "FETCH", tagColor: "text-blue-300", msg: "Consultando 4 provedores em paralelo (SOLLOS, SERASA, BOA_VISTA, SCPC)..." },
  { t: "10:00:12", tag: "MAP", tagColor: "text-cyan-300", msg: "Aplicando de-para FLAT → TEMPLATE (137 variáveis ativas)" },
  { t: "10:00:13", tag: "MATH", tagColor: "text-violet-300", msg: 'Resolvendo math("R$ 14.877,35" * 0.1) → 1487.735' },
  { t: "10:00:14", tag: "LEDGER", tagColor: "text-emerald-300", msg: "Débito R$ 14,77 confirmado (locking pessimista OK)" },
  { t: "10:00:15", tag: "DONE", tagColor: "text-brand", msg: "PDF gerado em 1.2s • template: ANALISE_COMPLETA_v3" },
];

export function TerminalOutput() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= lines.length ? 1 : x + 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-md border border-hairline bg-background/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2 bg-surface/60">
        <div className="flex items-center gap-2 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
          <span className="text-brand">◆</span> CONSULTAS // OUTPUT
        </div>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-muted" />
          <span className="h-2 w-2 rounded-full bg-muted" />
          <span className="h-2 w-2 rounded-full bg-brand" />
        </div>
      </div>
      <div className="p-4 mono text-[11.5px] leading-[1.7] min-h-[180px]">
        {lines.slice(0, n).map((l, i) => (
          <motion.div
            key={i + "-" + n}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-3"
          >
            <span className="text-muted-foreground">[{l.t}]</span>
            <span className={`${l.tagColor} w-14 shrink-0`}>{l.tag}</span>
            <span className="text-foreground/85">{l.msg}</span>
          </motion.div>
        ))}
        <span className="inline-block w-2 h-3.5 bg-brand blink ml-0.5 align-middle" />
      </div>
    </div>
  );
}

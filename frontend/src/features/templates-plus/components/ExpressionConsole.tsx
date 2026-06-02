import { useState, useRef } from "react";
import { useEditorStore, useActiveQuery, useActiveTemplate, buildContext } from "../store";
import { evaluate, listPaths } from "../expr";
import { ChevronDown, ChevronRight, X, Trash2 } from "lucide-react";

interface Entry { input: string; result: unknown; error?: string }

export function ExpressionConsole() {
  const close = useEditorStore((s) => s.toggleConsole);
  const query = useActiveQuery();
  const template = useActiveTemplate();
  const ctx = buildContext(query, template);

  const [entries, setEntries] = useState<Entry[]>([
    { input: "$cliente.nome", result: evaluate("$cliente.nome", ctx) },
    { input: "$cliente", result: evaluate("$cliente", ctx) },
  ]);
  const [input, setInput] = useState("$SCORE.valor");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const allPaths = listPaths(ctx);

  const onChange = (v: string) => {
    setInput(v);
    const match = v.match(/\$([\w.]*)$/);
    if (match) {
      const prefix = "$" + match[1];
      setSuggestions(allPaths.filter((p) => p.toLowerCase().startsWith(prefix.toLowerCase())).slice(0, 10));
    } else setSuggestions([]);
  };

  const run = () => {
    try {
      const result = evaluate(input, ctx);
      setEntries((e) => [...e, { input, result }]);
    } catch (err) {
      setEntries((e) => [...e, { input, result: undefined, error: String(err) }]);
    }
    setHistory((h) => [input, ...h].slice(0, 50));
    setHIdx(-1);
    setSuggestions([]);
    setInput("");
  };

  return (
    <div className="flex h-64 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-chrome px-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="font-mono text-accent">{">_"}</span> Console de Expressões
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEntries([])} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="h-3 w-3" /></button>
          <button onClick={close} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="tp-scroll flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[11px]">
        {entries.map((e, i) => (
          <div key={i} className="border-b border-border pb-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChevronRight className="h-3 w-3" /> {e.input}
            </div>
            <div className="mt-0.5 pl-5">
              {e.error ? <span className="text-destructive">{e.error}</span> : <ValueView value={e.result} />}
            </div>
          </div>
        ))}
      </div>
      <div className="relative border-t border-border">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-72 overflow-hidden rounded-md border border-border bg-background shadow-lg">
            {suggestions.map((s) => (
              <button key={s} onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
                className="block w-full truncate px-2 py-1 text-left font-mono text-[11px] hover:bg-muted">{s}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-accent">{">"}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); run(); }
              else if (e.key === "Tab" && suggestions.length) { e.preventDefault(); setInput(suggestions[0]); setSuggestions([]); }
              else if (e.key === "ArrowUp" && history.length) { e.preventDefault(); const ni = Math.min(history.length - 1, hIdx + 1); setHIdx(ni); setInput(history[ni]); }
              else if (e.key === "ArrowDown") { e.preventDefault(); const ni = Math.max(-1, hIdx - 1); setHIdx(ni); setInput(ni === -1 ? "" : history[ni]); }
              else if (e.key === "Escape") setSuggestions([]);
            }}
            placeholder="Digite $ para sugestões…"
            className="flex-1 bg-transparent font-mono text-[11px] outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function ValueView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof value === "string") return <span className="text-success">"{value}"</span>;
  if (typeof value === "number" || typeof value === "boolean") return <span className="text-accent">{String(value)}</span>;
  if (Array.isArray(value)) {
    return (
      <div>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Array({value.length})
        </button>
        {open && <div className="ml-4">{value.map((v, i) => <div key={i}><span className="text-muted-foreground">{i}: </span><ValueView value={v} depth={depth + 1} /></div>)}</div>}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} {`{${entries.length}}`}
        </button>
        {open && <div className="ml-4">{entries.map(([k, v]) => <div key={k}><span className="text-warning">{k}: </span><ValueView value={v} depth={depth + 1} /></div>)}</div>}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

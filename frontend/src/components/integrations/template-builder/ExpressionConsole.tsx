import { useState, useCallback, useRef, useEffect } from 'react';
import { Terminal, Trash2, Play, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluateExpressionSafe, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';

type ConsoleEntry = {
  id: number;
  input: string;
  output: string;
  error?: string;
};

interface ExpressionConsoleProps {
  context?: ExpressionContext;
  defaultCollapsed?: boolean;
}

export function ExpressionConsole({ context, defaultCollapsed = true }: ExpressionConsoleProps) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ctx = context ?? MOCK_EXPRESSION_CONTEXT;

  useEffect(() => {
    if (!collapsed) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [entries, collapsed]);

  const execute = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const { result, error } = evaluateExpressionSafe(trimmed, ctx);
    setEntries((prev) => [...prev, { id: nextId, input: trimmed, output: result, error }]);
    setNextId((n) => n + 1);
    setInput('');
    setHistoryIdx(-1);
  }, [input, ctx, nextId]);

  const clear = () => {
    setEntries([]);
    setHistoryIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      execute();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (entries.length === 0) return;
      const newIdx = historyIdx === -1 ? entries.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(newIdx);
      setInput(entries[newIdx]!.input);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= entries.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(newIdx);
        setInput(entries[newIdx]!.input);
      }
    }
  };

  return (
    <div className="border-t border-border bg-card">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <Terminal className="h-3 w-3 text-primary" />
          Console de Expressões
        </div>
        <div className="flex items-center gap-1">
          {!collapsed && (
            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); clear(); }} title="Limpar">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {collapsed ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <>
          <div ref={scrollRef} className="h-32 overflow-y-auto scrollbar-thin border-t border-border/50">
            {entries.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-muted-foreground/50 italic">
                  Ex: SCORE.valor
                </p>
              </div>
            )}
            {entries.map((entry) => (
              <div key={entry.id} className="px-2.5 py-1 border-b border-border/30 last:border-b-0">
                <div className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <code className="text-[10px] font-mono text-foreground break-all">{entry.input}</code>
                </div>
                <div className="pl-4">
                  {entry.error ? (
                    <code className="text-[10px] font-mono text-destructive">{entry.error}</code>
                  ) : (
                    <code className="text-[10px] font-mono text-success">{entry.output || '(vazio)'}</code>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 border-t border-border px-2 py-1">
            <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SCORE.valor"
              className="flex-1 bg-transparent text-[10px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={execute} title="Executar">
              <Play className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Terminal, Trash2, Play, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';

type ConsoleEntry = {
  id: number;
  input: string;
  output: unknown;
  error?: string;
};

interface ExpressionConsoleProps {
  context?: ExpressionContext;
  defaultCollapsed?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeConsoleExpression(value: string) {
  let normalized = value.trim();
  const wrapped = normalized.match(/^\{\$([^}]+)\}$/);
  if (wrapped) normalized = wrapped[1] ?? '';
  if (normalized.startsWith('$')) normalized = normalized.slice(1);
  return normalized;
}

function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, obj);
}

function resolveRaw(value: string, ctx: ExpressionContext): unknown {
  const expression = normalizeConsoleExpression(value);
  if (!expression) return '';
  if (/\{\$[^}]+\}/.test(value) && value.trim() !== `{$${expression}}`) return evaluateExpression(value, ctx);
  if (expression.startsWith('template.')) return resolvePath(ctx.$template, expression.slice(9));
  if (expression.startsWith('block.')) return resolvePath(ctx.$block, expression.slice(6));
  if (expression === 'template') return ctx.$template;
  if (expression === 'block') return ctx.$block;
  return resolvePath(ctx.$json, expression);
}

function tokenizeExpressions(input: string): string[] {
  const tokens = input.match(/\{\$[^}]+\}|\$[\w.]+/g);
  if (!tokens) return [input.trim()].filter(Boolean);
  return tokens;
}
function valueToInlineString(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenSuggestions(ctx: ExpressionContext) {
  const suggestions = new Set<string>();
  const walk = (prefix: string, value: unknown, depth = 0) => {
    if (depth > 5 || !isRecord(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      suggestions.add(`$${path}`);
      walk(path, child, depth + 1);
    }
  };

  walk('', ctx.$json);
  walk('template', ctx.$template);
  walk('block', ctx.$block);
  return Array.from(suggestions).sort((a, b) => a.localeCompare(b));
}

function ConsoleValue({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  if (value === undefined || value === null || value === '') return <code className="text-[10px] font-mono text-success">(vazio)</code>;
  if (!isRecord(value) && !Array.isArray(value)) return <code className="text-[10px] font-mono text-success">{String(value)}</code>;

  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  return (
    <div className="font-mono text-[10px] text-foreground">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-primary hover:underline">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {Array.isArray(value) ? `Array(${value.length})` : `Object {${entries.length}}`}
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
          {entries.map(([key, child]) => (
            <div key={key} className="flex items-start gap-1">
              <span className="text-muted-foreground">{key}:</span>
              <ConsoleValue value={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExpressionConsole({ context, defaultCollapsed = true }: ExpressionConsoleProps) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [visibleSuggestions, setVisibleSuggestions] = useState(10);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ctx = context ?? MOCK_EXPRESSION_CONTEXT;

  const suggestions = useMemo(() => flattenSuggestions(ctx), [ctx]);
  const filteredSuggestions = useMemo(() => {
    const marker = input.lastIndexOf('$');
    if (marker < 0) return [];
    const typed = input.slice(marker).replace(/^\{?/, '').toLowerCase();
    return suggestions.filter((suggestion) => suggestion.toLowerCase().includes(typed)).slice(0, visibleSuggestions);
  }, [input, suggestions, visibleSuggestions]);
  const exactMatch = suggestions.some((suggestion) => suggestion.toLowerCase() === input.trim().toLowerCase());
  const showSuggestions = !collapsed && suggestionsOpen && input.includes('$') && !exactMatch && filteredSuggestions.length > 0;

  useEffect(() => {
    if (!collapsed) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries, collapsed]);

  useEffect(() => {
    setVisibleSuggestions(10);
    setSuggestionsOpen(true);
  }, [input]);

  const execute = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      const parts = tokenizeExpressions(trimmed);
      const hasTokens = parts.some((part) => part.startsWith('$') || part.startsWith('{$'));
      const output = hasTokens
        ? trimmed.replace(/\{\$[^}]+\}|\$[\w.]+/g, (token) => valueToInlineString(resolveRaw(token, ctx)))
        : resolveRaw(trimmed, ctx);
      setEntries((prev) => [...prev, { id: nextId, input: trimmed, output }]);
    } catch (err) {
      setEntries((prev) => [...prev, { id: nextId, input: trimmed, output: '', error: String(err) }]);
    }
    setNextId((n) => n + 1);
    setInput('');
    setHistoryIdx(-1);
    setSuggestionsOpen(false);
  }, [input, ctx, nextId]);

  const clear = () => {
    setEntries([]);
    setHistoryIdx(-1);
  };

  const applySuggestion = (suggestion: string) => {
    const marker = input.lastIndexOf('$');
    setInput(marker >= 0 ? `${input.slice(0, marker)}${suggestion}` : suggestion);
    setSuggestionsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showSuggestions && filteredSuggestions[0]) {
      e.preventDefault();
      applySuggestion(filteredSuggestions[0]);
      return;
    }
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
      <button type="button" onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground"><Terminal className="h-3 w-3 text-primary" />Console de Expressões</div>
        <div className="flex items-center gap-1">
          {!collapsed && <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); clear(); }} title="Limpar"><Trash2 className="h-3 w-3" /></Button>}
          {collapsed ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <>
          <div ref={scrollRef} className="h-36 overflow-y-auto scrollbar-thin border-t border-border/50">
            {entries.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-[10px] text-muted-foreground/50 italic">Digite $ para listar variáveis</p></div>}
            {entries.map((entry) => (
              <div key={entry.id} className="px-2.5 py-1 border-b border-border/30 last:border-b-0">
                <div className="flex items-start gap-1"><ChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" /><code className="text-[10px] font-mono text-foreground break-all">{entry.input}</code></div>
                <div className="pl-4">{entry.error ? <code className="text-[10px] font-mono text-destructive">{entry.error}</code> : <ConsoleValue value={entry.output} />}</div>
              </div>
            ))}
          </div>

          <div className="relative flex items-center gap-1 border-t border-border px-2 py-1">
            {showSuggestions && (
              <div className="absolute bottom-7 left-5 z-30 max-h-44 w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg" onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setVisibleSuggestions((count) => Math.min(count + 10, suggestions.length)); }}>
                {filteredSuggestions.map((suggestion) => <button key={suggestion} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applySuggestion(suggestion)} className="block w-full rounded px-2 py-1 text-left font-mono text-[10px] text-foreground hover:bg-muted">{suggestion}</button>)}
              </div>
            )}
            <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="$SCORE.valor" className="flex-1 bg-transparent text-[10px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40" />
            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={execute} title="Executar"><Play className="h-3 w-3" /></Button>
          </div>
        </>
      )}
    </div>
  );
}

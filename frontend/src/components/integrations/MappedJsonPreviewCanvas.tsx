import { type ReactNode, type RefObject } from 'react';
import {
  User, AlertTriangle, Gauge, FileWarning, Building2, FileX, Users,
  DollarSign, TrendingUp, Award, Tag, Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TextMatch } from '@/lib/jsonSearchHighlight';
import type { LineGutterMeta } from '@/lib/jsonLineGutterMeta';

const previewTypeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User, AlertTriangle, Gauge, FileWarning, Building2, FileX, Users,
  DollarSign, TrendingUp, Award, Tag, Hash,
};

function PreviewTypeIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = previewTypeIconMap[icon] || Tag;
  return <Icon className={className} />;
}

type SegKind = 'def' | 'key' | 'str' | 'num' | 'kw' | 'punct';

function kindForPlainChunk(chunk: string): SegKind {
  if (/^[\s{}[\]:,]+$/.test(chunk) && /[{}\]:,[\]]/.test(chunk)) return 'punct';
  return 'def';
}

function segmentBetweenStrings(s: string): { kind: SegKind; text: string }[] {
  if (!s) return [];
  const out: { kind: SegKind; text: string }[] = [];
  const tokRe = /null|true|false|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tokRe.exec(s)) !== null) {
    if (m.index > last) {
      const plain = s.slice(last, m.index);
      if (plain) out.push({ kind: kindForPlainChunk(plain), text: plain });
    }
    const tok = m[0];
    const kind: SegKind =
      tok === 'null' || tok === 'true' || tok === 'false' ? 'kw' : 'num';
    out.push({ kind, text: tok });
    last = m.index + tok.length;
  }
  if (last < s.length) {
    const plain = s.slice(last);
    if (plain) out.push({ kind: kindForPlainChunk(plain), text: plain });
  }
  return out;
}

/** Destaque: chaves JSON, strings de valor, números e null/true/false. */
function segmentLine(line: string): { kind: SegKind; text: string }[] {
  const out: { kind: SegKind; text: string }[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(...segmentBetweenStrings(line.slice(last, m.index)));
    const quoted = m[0];
    const tail = line.slice(m.index + quoted.length);
    const isKey = /^\s*:/.test(tail);
    out.push({ kind: isKey ? 'key' : 'str', text: quoted });
    last = m.index + quoted.length;
  }
  if (last < line.length) out.push(...segmentBetweenStrings(line.slice(last)));
  return out;
}

function escapeSearchRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SEARCH_MARK_PREVIEW = 'rounded-[1px] bg-yellow-300/90 text-foreground dark:bg-yellow-500/45';
const SEARCH_MARK_PREVIEW_ACTIVE =
  'rounded-[1px] bg-amber-400/95 text-foreground ring-1 ring-amber-600 dark:bg-amber-500/80 dark:ring-amber-200';

function renderPreviewLineWithMatches(
  line: string,
  lineIndex: number,
  matches: TextMatch[],
  activeGlobalIndex: number,
): ReactNode {
  const lineMatches = matches.filter((m) => m.line === lineIndex).sort((a, b) => a.startInLine - b.startInLine);
  if (lineMatches.length === 0) return line.length > 0 ? line : '\u00a0';
  let pos = 0;
  const parts: ReactNode[] = [];
  let k = 0;
  for (const m of lineMatches) {
    if (m.startInLine > pos) parts.push(line.slice(pos, m.startInLine));
    const cls = m.globalIndex === activeGlobalIndex ? SEARCH_MARK_PREVIEW_ACTIVE : SEARCH_MARK_PREVIEW;
    parts.push(
      <mark key={`${m.globalIndex}-${k++}`} className={cls}>
        {line.slice(m.startInLine, m.endInLine)}
      </mark>,
    );
    pos = m.endInLine;
  }
  if (pos < line.length) parts.push(line.slice(pos));
  return <>{parts}</>;
}

function renderTextWithSearchMarks(text: string, searchQuery: string | undefined): React.ReactNode {
  const q = searchQuery?.trim();
  if (!q) return text;
  const re = new RegExp(escapeSearchRe(q), 'gi');
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <mark key={k++} className={SEARCH_MARK_PREVIEW}>
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : text;
}

function segClass(kind: SegKind): string {
  switch (kind) {
    case 'key':
      return 'text-violet-600 dark:text-violet-300';
    case 'str':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'num':
      return 'text-sky-600 dark:text-sky-300';
    case 'kw':
      return 'text-amber-600 dark:text-amber-400';
    case 'punct':
      return 'text-muted-foreground/80';
    default:
      return 'text-foreground/90';
  }
}

function HighlightedJsonLine({ line, searchQuery }: { line: string; searchQuery?: string }) {
  const segs = segmentLine(line);
  if (segs.length === 0) return <span className="text-foreground/70">{'\u00a0'}</span>;
  return (
    <>
      {segs.map((s, idx) => (
        <span key={idx} className={segClass(s.kind)}>
          {renderTextWithSearchMarks(s.text, searchQuery)}
        </span>
      ))}
    </>
  );
}

const PREVIEW_TYPE_REORDER_MIME = 'application/x-consultas-pro-mapped-type';

export function MappedJsonPreviewCanvas({
  jsonText,
  lineMeta,
  footer,
  highlightQuery,
  highlightNavigation,
  scrollBodyRef,
  onReorderMappedTypes,
}: {
  jsonText: string;
  lineMeta: LineGutterMeta[];
  /** Legenda minimalista (ex.: cores por tipo) */
  footer?: ReactNode;
  /** Destaca ocorrências (fundo amarelo) em cada linha */
  highlightQuery?: string;
  /** Com índice ativo: realça a ocorrência atual (âmbar) e permite scroll externo */
  highlightNavigation?: { matches: TextMatch[]; activeIndex: number };
  scrollBodyRef?: RefObject<HTMLDivElement | null>;
  /** Arrastar badge de tipo sobre outro cabeçalho para trocar a ordem no JSON e na coluna Tipos */
  onReorderMappedTypes?: (fromTypeKey: string, toTypeKey: string) => void;
}) {
  const lines = jsonText.length ? jsonText.split('\n') : ['{}'];
  const reorderEnabled = Boolean(onReorderMappedTypes);

  return (
    <div
      className={cn(
        /* h-full + min-h-0: encaixa no viewport; sem min-h-0 o flex filho estica com o conteúdo (milhares de px). */
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80',
        'bg-gradient-to-b from-muted/35 via-card to-card',
        'dark:from-muted/20 dark:via-card dark:to-card',
        /* Elevação + borda interna superior: hsl com opacidade só funciona com ` / ` (formato shadcn). */
        'shadow-[0_1px_2px_rgb(0_0_0/_0.05),0_1px_3px_rgb(0_0_0/_0.04),inset_0_1px_0_0_hsl(var(--border)_/_0.55)]',
        'dark:shadow-[0_1px_3px_rgb(0_0_0/_0.5),inset_0_1px_0_0_hsl(var(--border)_/_0.42)]',
      )}
      role="region"
      aria-label="Preview JSON com dados tratados e filtros"
    >
      <div
        ref={scrollBodyRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain [scrollbar-width:thin]"
      >
        <div className="min-w-max py-1.5 pr-1">
          {lines.map((line, i) => {
            const meta = lineMeta[i] ?? { barClass: 'bg-border/20' };
            const useNav =
              highlightNavigation &&
              highlightQuery?.trim() &&
              highlightNavigation.matches.length > 0;
            return (
              <div
                key={i}
                className={cn(
                  'group relative isolate flex min-h-[1.5rem] items-stretch',
                  meta.isSectionHeaderLine &&
                    'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-[1] after:h-px after:bg-border/60',
                  meta.isDuplicateLine &&
                    'border-l-[3px] border-destructive bg-destructive/[0.07] dark:bg-destructive/[0.11]',
                )}
              >
                {meta.sessionWashClass ? (
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 z-0',
                      meta.sessionWashClass,
                      meta.isSectionHeaderLine &&
                        '[box-shadow:inset_0_-1px_0_0_hsl(var(--border)_/_0.35)]',
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 w-[2px] shrink-0 rounded-[1px] transition-opacity group-hover:opacity-100',
                    meta.isDuplicateLine ? 'bg-destructive' : meta.barClass,
                  )}
                  title={meta.title}
                />
                <div
                  className="relative z-10 flex min-h-0 min-w-0 flex-1 items-center"
                  onDragOver={
                    reorderEnabled && meta.isSectionHeaderLine && meta.sectionTypeKey
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }
                      : undefined
                  }
                  onDrop={
                    reorderEnabled && meta.isSectionHeaderLine && meta.sectionTypeKey
                      ? (e) => {
                          e.preventDefault();
                          const raw =
                            e.dataTransfer.getData(PREVIEW_TYPE_REORDER_MIME)
                            || e.dataTransfer.getData('text/plain');
                          const fromKey = raw?.trim();
                          const toKey = meta.sectionTypeKey;
                          if (fromKey && toKey && fromKey !== toKey) {
                            onReorderMappedTypes?.(fromKey, toKey);
                          }
                        }
                      : undefined
                  }
                >
                  <code className="block min-w-0 flex-1 whitespace-pre pl-2 pr-2 font-mono text-[11px] leading-[1.55] text-foreground/90">
                    {line.length > 0 ? (
                      useNav ? (
                        renderPreviewLineWithMatches(
                          line,
                          i,
                          highlightNavigation.matches,
                          highlightNavigation.activeIndex,
                        )
                      ) : (
                        <HighlightedJsonLine line={line} searchQuery={highlightQuery} />
                      )
                    ) : (
                      '\u00a0'
                    )}
                  </code>
                  {meta.isSectionHeaderLine && meta.sectionBadgeLabel ? (
                    <div
                      className={cn(
                        'sticky right-1 ml-auto flex max-w-[9.5rem] shrink-0 flex-row flex-nowrap items-center justify-end gap-1 rounded-l-full bg-gradient-to-l from-card via-card/95 to-transparent pl-3 pr-1 shadow-sm dark:from-card dark:via-card/95',
                        reorderEnabled ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none',
                      )}
                      style={{
                        zIndex: meta.sectionBadgeStackZ ?? 24,
                      }}
                      title={
                        reorderEnabled && meta.sectionTypeKey
                          ? `${meta.sectionBadgeLabel} — arraste para reordenar tipos`
                          : meta.sectionBadgeLabel
                      }
                    >
                      <Badge
                        variant="outline"
                        draggable={reorderEnabled && Boolean(meta.sectionTypeKey)}
                        onDragStart={
                          reorderEnabled && meta.sectionTypeKey
                            ? (e) => {
                                e.dataTransfer.setData(PREVIEW_TYPE_REORDER_MIME, meta.sectionTypeKey!);
                                e.dataTransfer.setData('text/plain', meta.sectionTypeKey!);
                                e.dataTransfer.effectAllowed = 'move';
                              }
                            : undefined
                        }
                        className={cn(
                          'flex h-5 max-w-[8.75rem] items-center gap-1 truncate border-border bg-card/95 pl-1 pr-1.5 text-[9px] font-normal text-muted-foreground shadow-sm dark:border-border dark:bg-card/90',
                          reorderEnabled && meta.sectionTypeKey && 'select-none',
                        )}
                      >
                        {typeof meta.sectionBadgeOrdinal === 'number' ? (
                          <span className="shrink-0 tabular-nums text-[8px] font-semibold text-muted-foreground/90">
                            {meta.sectionBadgeOrdinal}.
                          </span>
                        ) : null}
                        {meta.sectionBadgeIcon ? (
                          <PreviewTypeIcon icon={meta.sectionBadgeIcon} className="h-3 w-3 shrink-0 opacity-85" />
                        ) : null}
                        <span className="truncate">{meta.sectionBadgeLabel}</span>
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border/50 bg-muted/15 px-2 py-1.5">{footer}</div>
      ) : null}
    </div>
  );
}

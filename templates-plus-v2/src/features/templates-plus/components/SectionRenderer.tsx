import React from "react";
import type { SectionNode, FieldNode } from "../types";
import { LucideIcon } from "./LucideIcon";
import { evaluate, interpolate } from "../expr";
import { useEditorStore } from "../store";
import {
  mockSpcData, mockSerasaData, mockBacenConsolidado, mockBacenOperacoes, queryTypes,
} from "../mocks";
import { RendererProvider, Selectable, InlineEdit, EditableText, useRendererCtx, fieldStyle } from "./inline";
import { ContainerRenderer } from "./ContainerRenderer";

interface Props {
  section: SectionNode;
  mode: "skeleton" | "preview";
  context: Record<string, unknown>;
  selectedFieldId?: string | null;
  onSelectField?: (id: string) => void;
  /** When provided, the renderer becomes fully editable (inline labels/values). */
  onFieldChange?: (fieldId: string, patch: Partial<FieldNode>) => void;
}

/* ============================================================================
 * Section dispatcher (provides the renderer context once, wraps in tp-skeleton)
 * ==========================================================================*/

export function SectionRenderer(p: Props) {
  return (
    <RendererProvider value={{
      sectionId: p.section.id,
      selectedFieldId: p.selectedFieldId,
      onSelectField: p.onSelectField,
      onFieldChange: p.onFieldChange,
      hideHotbar: !p.onFieldChange,
    }}>
      <div className={p.mode === "skeleton" ? "tp-skeleton" : ""}>
        {dispatch(p)}
      </div>
    </RendererProvider>
  );
}

function dispatch(p: Props) {
  switch (p.section.kind) {
    case "header":        return <HeaderBlock {...p} />;
    case "personal":      return <ClientInfoCard {...p} />;
    case "kpi-row":       return <FinancialSummary {...p} />;
    case "score":         return <ScoreBlock {...p} />;
    case "serasa-table":  return <SerasaTable {...p} />;
    case "spc-table":     return <SpcTable {...p} />;
    case "bacen":         return <BacenBlock {...p} />;
    case "protestos":     return <ProtestosBlock {...p} />;
    case "debt-table":    return <DebtTableGeneric {...p} />;
    case "footer":        return <FooterBlock {...p} />;
    case "container":     return <ContainerSection {...p} />;
    default:              return <FreeBlock {...p} />;
  }
}

/* ============================================================================
 * Shared helpers
 * ==========================================================================*/

const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

/** When `field` has a `value` that looks like a literal (no `{$expr}`), show it
 *  as inline-editable text. Otherwise render the interpolated value (read-only). */
function FieldValue({ field, context, as = "span", className = "" }:
  { field?: FieldNode; context: Record<string, unknown>; as?: "span" | "p" | "div" | "h3" | "h4"; className?: string }) {
  if (!field) return null;
  const raw = field.value ?? "";
  const isExpr = /\{\$|\$[A-Z_]/i.test(raw);
  if (isExpr) {
    const text = String(evaluate(raw, context) ?? "");
    const style = fieldStyle(field);
    if (as === "p")   return <p   className={className} style={style}>{text}</p>;
    if (as === "div") return <div className={className} style={style}>{text}</div>;
    if (as === "h3")  return <h3  className={className} style={style}>{text}</h3>;
    if (as === "h4")  return <h4  className={className} style={style}>{text}</h4>;
    return <span className={className} style={style}>{text}</span>;
  }
  return <InlineEdit field={field} prop="value" as={as} className={className} />;
}
void useRendererCtx;

function SectionHeader({
  icon, title, badge,
}: { icon?: string; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 min-w-[32px] rounded-lg bg-muted border border-border flex items-center justify-center">
        <LucideIcon name={icon} className="w-4 h-4 text-muted-foreground" />
      </div>
      <h3 className="text-[13px] font-bold uppercase text-muted-foreground tracking-wider whitespace-nowrap">{title}</h3>
      <div className="flex-1 border-b-2 border-dashed border-border ml-1 min-w-[24px]" />
      {badge && (
        <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ============================================================================
 * HEADER
 * ==========================================================================*/

function HeaderBlock({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const find = (label: string) => section.fields.find((f) => f.label === label);
  const logo = find("Logo");
  const empresa = find("Empresa");
  const subtitle = find("Subtítulo");
  const data = find("Data");
  const protocol = find("Protocolo");

  const isSkel = mode === "skeleton";
  const logoSrc = String(evaluate(logo?.value ?? "", context) ?? "") || (useEditorStore.getState().templates.find(t => t.id === useEditorStore.getState().activeTemplateId)?.logo ?? "");

  return (
    <div className="pb-3" style={{ borderBottom: "3px solid var(--color-accent)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Selectable fieldId={logo?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            {logoSrc && !isSkel ? (
              <img src={logoSrc} alt="Logo" className="h-[50px] object-contain" />
            ) : (
              <div className="w-[50px] h-[50px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5">
                <LucideIcon name="Image" className="w-4 h-4 text-muted-foreground" />
                <span className="text-[7px] text-muted-foreground font-medium">LOGO</span>
              </div>
            )}
          </Selectable>
          <div>
            <Selectable fieldId={empresa?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
              <FieldValue field={empresa} context={context} as="div" className="text-[10px] font-bold text-accent tracking-widest uppercase" />
            </Selectable>
            <Selectable fieldId={subtitle?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
              <FieldValue field={subtitle} context={context} as="div" className="text-[9px] text-muted-foreground" />
            </Selectable>
          </div>
        </div>
        <div className="text-right">
          <Selectable fieldId={data?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            {isSkel
              ? <p className="text-[9px] text-muted-foreground">DD/MM/AAAA</p>
              : <FieldValue field={data} context={context} as="p" className="text-[9px] text-muted-foreground" />}
          </Selectable>
          <Selectable fieldId={protocol?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            {isSkel
              ? <p className="text-[9px] text-muted-foreground font-mono">PROT: CP-XXXXXXXX</p>
              : <p className="text-[9px] text-muted-foreground font-mono">PROT: <FieldValue field={protocol} context={context} as="span" /></p>}
          </Selectable>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * CLIENT INFO CARD
 * ==========================================================================*/

function ClientInfoCard({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        {section.fields.map((f) => (
          <Selectable key={f.id} fieldId={f.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <LucideIcon name={f.icon} className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <InlineEdit field={f} prop="label" as="p" className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider" />
                {mode === "skeleton"
                  ? <p className="text-[13px] font-semibold text-foreground truncate">{`{${f.label ?? ""}}`}</p>
                  : <FieldValue field={f} context={context} as="p" className="text-[13px] font-semibold text-foreground truncate" />}
              </div>
            </div>
          </Selectable>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * FINANCIAL SUMMARY
 * ==========================================================================*/

function FinancialSummary({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const isSkel = mode === "skeleton";
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} />
      <div className="grid grid-cols-3 gap-3">
        {section.fields.map((f) => {
          const color = f.color ?? "var(--color-foreground)";
          return (
            <Selectable key={f.id} fieldId={f.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
              <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: color }} />
                <InlineEdit field={f} prop="label" as="p" className="text-[9px] uppercase text-muted-foreground font-semibold pl-2" />
                {isSkel
                  ? <p className="text-lg font-bold pl-2" style={{ color }}>—</p>
                  : <FieldValue field={f} context={context} as="p" className="text-lg font-bold pl-2" />}
                <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">{f.meta?.hint ?? ""}</p>
              </div>
            </Selectable>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * SCORE BLOCK
 * ==========================================================================*/

function ScoreSpeedometer({ score = 0 }: { score: number }) {
  const clamped = Math.max(0, Math.min(1000, score));
  const angle = (clamped / 1000) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 80;
  const nx = cx - r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  const band =
    clamped <= 200 ? { label: "Péssimo", color: "#dc2626" } :
    clamped <= 400 ? { label: "Ruim",    color: "#ea580c" } :
    clamped <= 600 ? { label: "Regular", color: "#ca8a04" } :
    clamped <= 800 ? { label: "Bom",     color: "#65a30d" } :
                     { label: "Ótimo",   color: "#16a34a" };

  return (
    <div className="text-center">
      <svg viewBox="0 0 200 115" className="w-full mx-auto max-w-[175px]">
        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="var(--color-border)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20 90 A 80 80 0 0 1 35.28 42.98" fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" />
        <path d="M 35.28 42.98 A 80 80 0 0 1 75.28 13.91" fill="none" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
        <path d="M 75.28 13.91 A 80 80 0 0 1 124.72 13.91" fill="none" stroke="#eab308" strokeWidth="14" strokeLinecap="round" />
        <path d="M 124.72 13.91 A 80 80 0 0 1 164.72 42.98" fill="none" stroke="#84cc16" strokeWidth="14" strokeLinecap="round" />
        <path d="M 164.72 42.98 A 80 80 0 0 1 180 90" fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" />
        <circle cx={nx} cy={ny} r="7" fill={band.color} stroke="white" strokeWidth="2" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={band.color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="white" stroke="var(--color-border)" strokeWidth="1" />
        <text x="15"  y="110" fontSize="11" fill="var(--color-muted-foreground)" fontWeight="700">0</text>
        <text x="165" y="110" fontSize="11" fill="var(--color-muted-foreground)" fontWeight="700">1000</text>
      </svg>
      <p className="font-semibold mt-1 tracking-tight text-2xl" style={{ color: band.color }}>{clamped}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: band.color }}>{band.label}</p>
    </div>
  );
}

type ScoreBand = { label: string; range: string; color: string };
const DEFAULT_SCORE_BANDS: ScoreBand[] = [
  { label: "Péssimo", range: "0–200",    color: "#dc2626" },
  { label: "Ruim",    range: "201–400",  color: "#ea580c" },
  { label: "Regular", range: "401–600",  color: "#ca8a04" },
  { label: "Bom",     range: "601–800",  color: "#65a30d" },
  { label: "Ótimo",   range: "801–1000", color: "#16a34a" },
];
function readBands(section: SectionNode): ScoreBand[] {
  const raw = section.meta?.bands;
  if (!raw) return DEFAULT_SCORE_BANDS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((b) => b && typeof b.label === "string")) return parsed as ScoreBand[];
  } catch { /* ignore */ }
  return DEFAULT_SCORE_BANDS;
}

function ScoreBlock({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const isSkel = mode === "skeleton";
  const find = (label: string) => section.fields.find((f) => f.label === label);

  const title = find("Título");
  const subtitle = find("Subtítulo");
  const speedo = find("Velocímetro");
  const faixa = find("Faixa");
  const score = find("Score");
  const chance = find("Chance de pagar (6 meses)");
  const inad = find("Probabilidade de inadimplência");
  const interp = find("Interpretação");
  const infT = find("Influência - título");
  const infTxt = find("Influência - texto");
  const diag = find("Diagnóstico");
  const planT = find("Plano - título");
  const steps = section.fields.filter((f) => f.label?.startsWith("Plano - passo"));
  const disclaimer = find("Disclaimer");

  const scoreVal = isSkel ? 0 : Number(evaluate(speedo?.value ?? "0", context)) || 0;
  const metrics = [
    { f: faixa,  desc: faixa?.meta?.desc,  color: "#ca8a04" },
    { f: score,  desc: score?.meta?.desc },
    { f: chance, desc: chance?.meta?.desc },
    { f: inad,   desc: inad?.meta?.desc },
  ];

  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} />
      <div className="rounded-xl border border-border p-5 shadow-sm space-y-4">
        {title && (
          <Selectable fieldId={title.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <FieldValue field={title} context={context} as="h3" className="text-[14px] font-bold text-foreground leading-snug" />
          </Selectable>
        )}
        {subtitle && (
          <Selectable fieldId={subtitle.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <FieldValue field={subtitle} context={context} as="p" className="text-[10px] text-muted-foreground leading-relaxed" />
          </Selectable>
        )}

        <div className="flex items-start gap-6 flex-wrap">
          {speedo && (
            <Selectable fieldId={speedo.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField} className="w-[175px] flex-shrink-0">
              <ScoreSpeedometer score={scoreVal} />
            </Selectable>
          )}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-2.5">
            {metrics.map((m) => m.f && (
              <Selectable key={m.f.id} fieldId={m.f.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
                <div className="flex items-start gap-2 rounded-lg border border-border p-2.5 shadow-sm">
                  <div className="w-[35px] h-[35px] min-w-[35px] rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <LucideIcon name={m.f.icon} className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <InlineEdit field={m.f} prop="label" as="span" className="text-[13px] text-muted-foreground font-bold" />
                    <span className="text-[13px] text-muted-foreground font-bold">: </span>
                    {isSkel
                      ? <span className="text-[14px] font-bold">—</span>
                      : <FieldValue field={m.f} context={context} as="span" className="text-[14px] font-bold" />}
                    {m.desc && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</p>}
                  </div>
                </div>
              </Selectable>
            ))}
          </div>
        </div>

        <ScoreBandsLegend section={section} />


        {interp && (
          <Selectable fieldId={interp.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <div className="border-l-[3px] border-accent rounded-r-lg bg-muted/30 p-3">
              <FieldValue field={interp} context={context} as="p" className="text-[10px] text-foreground leading-relaxed" />
            </div>
          </Selectable>
        )}

        {(infT || infTxt) && (
          <div className="border-t border-border pt-3">
            {infT && (
              <Selectable fieldId={infT.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
                <FieldValue field={infT} context={context} as="h4" className="text-[11px] font-bold text-muted-foreground mb-2" />
              </Selectable>
            )}
            {infTxt && (
              <Selectable fieldId={infTxt.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
                <FieldValue field={infTxt} context={context} as="p" className="text-[10px] text-foreground leading-relaxed mb-2" />
              </Selectable>
            )}
          </div>
        )}

        {diag && (
          <Selectable fieldId={diag.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <div className="rounded-lg p-3 bg-success/10 border border-success/20">
              <h4 className="text-[11px] font-bold text-success mb-1 flex items-center gap-1.5">
                <LucideIcon name="CheckCircle" className="w-3.5 h-3.5" />
                Nós te ajudamos com tudo isso!
              </h4>
              <FieldValue field={diag} context={context} as="p" className="text-[10px] text-foreground leading-relaxed" />
            </div>
          </Selectable>
        )}

        {(planT || steps.length > 0) && (
          <div className="rounded-lg p-3.5 bg-accent/10 border border-accent/20">
            {planT && (
              <Selectable fieldId={planT.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
                <FieldValue field={planT} context={context} as="h3" className="text-[11px] font-bold text-accent mb-3" />
              </Selectable>
            )}
            <div className="space-y-3">
              {steps.map((s, i) => {
                const [t, d] = (s.value ?? "").split(":::").map((x) => x.trim());
                return (
                  <Selectable key={s.id} fieldId={s.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
                    <div className="flex gap-2.5">
                      <div className="w-[22px] h-[22px] min-w-[22px] rounded-full bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                      <div>
                        <div className="text-[10px] font-bold text-foreground">{t}</div>
                        {d && <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">{d}</p>}
                      </div>
                    </div>
                  </Selectable>
                );
              })}
            </div>
          </div>
        )}

        {disclaimer && (
          <Selectable fieldId={disclaimer.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <div className="flex items-start gap-2 rounded-r-lg p-3 bg-warning/10 border-l-4 border-warning">
              <LucideIcon name="AlertTriangle" className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
              <div>
                <span className="text-[10px] font-bold text-foreground">Atenção: </span>
                <FieldValue field={disclaimer} context={context} as="span" className="text-[10px] text-muted-foreground leading-relaxed" />
              </div>
            </div>
          </Selectable>
        )}
      </div>
    </div>
  );
}

function ScoreBandsLegend({ section }: { section: SectionNode }) {
  const bands = readBands(section);
  const replaceSection = useEditorStore((s) => s.replaceSection);
  const update = (idx: number, patch: Partial<ScoreBand>) => {
    const next = bands.map((b, i) => i === idx ? { ...b, ...patch } : b);
    replaceSection(section.id, { ...section, meta: { ...(section.meta ?? {}), bands: JSON.stringify(next) } });
  };
  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3">
      <div className="grid grid-cols-5 gap-2">
        {bands.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
            <EditableText value={b.label} onChange={(v) => update(i, { label: v })} className="font-medium text-foreground" />
            <EditableText value={b.range} onChange={(v) => update(i, { range: v })} className="text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * SERASA / SPC TABLES (data-driven from query sample)
 * ==========================================================================*/

function activeQueryRows(key: "DIVIDAS_SERASA" | "DIVIDAS_SPC", context: Record<string, unknown>): Array<Record<string, unknown>> {
  const v = (context[key] as unknown);
  if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  // fallback: merge from selected query blocks of active template
  const st = useEditorStore.getState();
  const tpl = st.templates.find((t) => t.id === st.activeTemplateId);
  if (!tpl) return [];
  return tpl.selectedQueryBlocks.flatMap((qid) => {
    const q = queryTypes.find((x) => x.id === qid);
    const rows = q?.sample[key];
    return Array.isArray(rows) ? rows : [];
  }) as Array<Record<string, unknown>>;
}

function FieldTableHeader({ fields, selectedFieldId, onSelectField, rightAlignLast = true }: {
  fields: FieldNode[]; selectedFieldId?: string | null; onSelectField?: (id: string) => void; rightAlignLast?: boolean;
}) {
  const { onFieldChange } = useRendererCtx();
  return (
    <tr className="bg-muted/50">
      {fields.map((f, i) => {
        const right = rightAlignLast && i === fields.length - 1;
        const sel = selectedFieldId === f.id;
        return (
          <th
            key={f.id}
            onMouseDown={(e) => { e.stopPropagation(); onSelectField?.(f.id); }}
            className={[
              "text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider cursor-pointer",
              right ? "text-right" : "text-left",
              sel ? "bg-accent/10" : "",
            ].join(" ")}
          >
            <EditableText
              value={f.label ?? ""}
              onChange={onFieldChange ? (next) => onFieldChange(f.id, { label: next }) : undefined}
              className="inline"
            />
          </th>
        );
      })}
    </tr>
  );
}

function SerasaTable({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const rows = mode === "skeleton" ? [] : (activeQueryRows("DIVIDAS_SERASA", context) as typeof mockSerasaData);
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} badge={`${rows.length} registros`} />
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><FieldTableHeader fields={section.fields} selectedFieldId={selectedFieldId} onSelectField={onSelectField} /></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={section.fields.length} className="px-3 py-4 text-center text-[10px] text-muted-foreground">Dados exibidos após emissão da consulta</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {section.fields.map((f) => {
                  const k = f.value ?? "";
                  const v = row[k as keyof typeof row];
                  const isValor = k === "valor";
                  return (
                    <td key={f.id} className={[
                      "px-2.5 py-2",
                      isValor ? "text-[10px] text-right font-semibold text-destructive tabular-nums" : "text-[10px] text-foreground",
                      (k === "dtInclusao" || k === "dtVencimento" || k === "contrato") ? "font-mono" : "",
                    ].join(" ")}>
                      {isValor && typeof v === "number" ? fmtBRL(v) : String(v ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpcTable({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const rows = mode === "skeleton" ? [] : (activeQueryRows("DIVIDAS_SPC", context) as typeof mockSpcData);
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} badge={`${rows.length} registros`} />
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><FieldTableHeader fields={section.fields} selectedFieldId={selectedFieldId} onSelectField={onSelectField} /></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={section.fields.length} className="px-3 py-4 text-center text-[10px] text-muted-foreground">Dados exibidos após emissão da consulta</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {section.fields.map((f) => {
                  const k = f.value ?? "";
                  const v = row[k as keyof typeof row];
                  const isValor = k === "valor";
                  return (
                    <td key={f.id} className={[
                      "px-2.5 py-2",
                      isValor ? "text-[10px] text-right font-semibold text-destructive tabular-nums" : "text-[10px] text-foreground",
                      (k === "dtOcorr" || k === "dtInclusao" || k === "contrato") ? "font-mono" : "",
                    ].join(" ")}>
                      {isValor && typeof v === "number" ? fmtBRL(v) : String(v ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
 * BACEN
 * ==========================================================================*/

function BacenBlock({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const resumo = section.fields.find((f) => f.label === "Resumo");
  const rel = section.fields.find((f) => f.label === "Relacionamento");
  const inst = section.fields.find((f) => f.label === "Instituições");
  const ops = section.fields.find((f) => f.label === "Operações");
  void mode; void context;

  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} badge="Consolidado Financeiro" />
      <div className="space-y-3">
        {resumo && (
          <Selectable fieldId={resumo.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
            <FieldValue field={resumo} context={context} as="p" className="text-[10px] text-muted-foreground leading-relaxed" />
          </Selectable>
        )}

        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Categoria Consolidada</th>
                <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor</th>
                <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">% Total</th>
              </tr>
            </thead>
            <tbody>
              {mockBacenConsolidado.map((row, i) => (
                <tr key={i} className={[
                  "border-t border-border",
                  row.type === "success" ? "bg-success/5" :
                  row.type === "danger"  ? "bg-destructive/5" :
                  row.type === "warning" ? "bg-warning/5" : "",
                ].join(" ")}>
                  <td className={[
                    "px-2.5 py-2 text-[10px] font-semibold",
                    row.type === "success" ? "text-success" : row.type === "danger" ? "text-destructive" : "text-foreground",
                  ].join(" ")}>{row.cat}</td>
                  <td className={[
                    "px-2.5 py-2 text-[10px] text-right font-semibold tabular-nums",
                    row.type === "success" ? "text-success" : row.type === "danger" ? "text-destructive" : "text-foreground",
                  ].join(" ")}>{row.valor}</td>
                  <td className="px-2.5 py-2 text-[10px] text-right text-muted-foreground tabular-nums">{row.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 rounded-lg bg-muted/30 border border-border text-center">
          {[
            { f: rel,  hint: "Data de início" },
            { f: inst, hint: "Bancos/instituições" },
            { f: ops,  hint: "Total de operações" },
          ].map((it, i) => it.f && (
            <Selectable key={it.f.id} fieldId={it.f.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField} className={i > 0 ? "border-l border-border" : ""}>
              <div className="p-3">
                <InlineEdit field={it.f} prop="label" as="span" className="text-[9px] uppercase text-muted-foreground tracking-wider block mb-1" />
                <FieldValue field={it.f} context={context} as="span" className="text-[14px] font-semibold text-foreground" />
                <span className="text-[9px] text-muted-foreground block mt-0.5">{it.hint}</span>
              </div>
            </Selectable>
          ))}
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Detalhamento Operacional</h4>
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left  text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Modalidade / Operação</th>
                  <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor</th>
                  <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">%</th>
                </tr>
              </thead>
              <tbody>
                {mockBacenOperacoes.map((g, gi) => (
                  <React.Fragment key={gi}>
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={3} className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">{g.grupo}</td>
                    </tr>
                    {g.items.map((it, ii) => (
                      <tr key={`${gi}-${ii}`} className="border-t border-border">
                        <td className={`px-2.5 py-2 text-[10px] pl-6 ${it.vencido ? "text-destructive font-semibold" : "text-foreground"}`}>{it.desc}</td>
                        <td className={`px-2.5 py-2 text-[10px] text-right tabular-nums ${it.vencido ? "text-destructive" : "text-foreground"}`}>{it.valor}</td>
                        <td className="px-2.5 py-2 text-[10px] text-right text-muted-foreground tabular-nums">{it.pct}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * PROTESTOS / DEBT-TABLE / FOOTER / FREE
 * ==========================================================================*/

function ProtestosBlock({ section, context, selectedFieldId, onSelectField }: Props) {
  const msg = section.fields.find((f) => f.label === "Mensagem");
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} badge="0 registros" />
      <Selectable fieldId={msg?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
        <div className="rounded-xl border border-border p-4 text-center text-[11px] text-muted-foreground shadow-sm">
          <FieldValue field={msg} context={context} as="span" />
        </div>
      </Selectable>
    </div>
  );
}

function DebtTableGeneric({ section, mode, context, selectedFieldId, onSelectField }: Props) {
  const rows = mode === "skeleton" ? [] : activeQueryRows("DIVIDAS_SERASA", context);
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} badge={`${rows.length} registros`} />
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><FieldTableHeader fields={section.fields} selectedFieldId={selectedFieldId} onSelectField={onSelectField} rightAlignLast={false} /></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={section.fields.length} className="px-3 py-4 text-center text-[10px] text-muted-foreground">Sem dados.</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {section.fields.map((f) => (
                  <td key={f.id} className="px-2.5 py-2 text-[10px] text-foreground">{String(row[f.value ?? ""] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FooterBlock({ section, context, selectedFieldId, onSelectField }: Props) {
  const t = section.fields.find((f) => f.label === "Texto");
  return (
    <div className="border-t border-border pt-4 mt-2">
      <Selectable fieldId={t?.id} selectedFieldId={selectedFieldId} onSelectField={onSelectField}>
        <FieldValue field={t} context={context} as="p" className="text-[9px] text-muted-foreground text-center leading-relaxed" />
      </Selectable>
    </div>
  );
}

function FreeBlock({ section }: Props) {
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} />
      <ContainerRenderer
        fields={section.fields}
        path={[]}
        rootLayout={{ layout: section.layout, columns: section.columns, gap: section.gap, padding: section.padding }}
      />
    </div>
  );
}

function ContainerSection({ section }: Props) {
  return (
    <div>
      <SectionHeader icon={section.icon} title={section.name} />
      <ContainerRenderer
        fields={section.fields}
        path={[]}
        rootLayout={{
          layout: section.layout ?? "row",
          columns: section.columns,
          gap: section.gap ?? 8,
          padding: section.padding,
        }}
      />
    </div>
  );
}

import { useState } from "react";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { useIsolatedEditorStore } from "../store/isolated-editor.store";
import type { BindingFormat, TemplateElement } from "../schema/template";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "./ColorPickerPopover";
import Editor from "@monaco-editor/react";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { interpolate } from "../engine/interpolate";
import { toast } from "sonner";
import { AutocompleteInput, AutocompleteTextarea } from "./AutocompleteFields";
import { useTheme } from "next-themes";
import { X } from "lucide-react";


type Tab = "layout" | "style" | "html" | "binding" | "data";

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value ?? 0}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <ColorPickerPopover
        value={value}
        onChange={onChange}
        title={label}
      >
        <button
          type="button"
          className="w-8 h-6 border border-border rounded shadow-inner"
          style={{ background: value || "transparent" }}
          aria-label={`Escolher cor: ${label}`}
        />
      </ColorPickerPopover>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function ElementInspector({ element, isIsolated }: { element: TemplateElement; isIsolated?: boolean }) {
  const storeTab = useEditorStore((s) => s.activeRightTab);
  const storeSetTab = useEditorStore((s) => s.setActiveRightTab);
  const [localTab, setLocalTab] = useState<Tab>("layout");

  const tab = isIsolated ? localTab : storeTab;
  const setTab = isIsolated ? setLocalTab : storeSetTab;
  
  const storeUpdate = useEditorStore((s) => s.updateElement);
  const storeUpdateStyle = useEditorStore((s) => s.updateElementStyle);
  const storeUpdateData = useEditorStore((s) => s.updateElementData);

  const isolatedUpdate = useIsolatedEditorStore((s) => s.updateElement);
  const isolatedUpdateStyle = useIsolatedEditorStore((s) => s.updateElementStyle);
  const isolatedUpdateData = useIsolatedEditorStore((s) => s.updateElementData);

  const update = isIsolated ? isolatedUpdate : storeUpdate;
  const updateStyle = isIsolated ? isolatedUpdateStyle : storeUpdateStyle;
  const updateData = isIsolated ? isolatedUpdateData : storeUpdateData;

  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  return (
    <>
      <div className="flex border-b border-border text-xs bg-slate-100/70 dark:bg-slate-900/50">
        {(
          [
            { id: "layout", label: "Layout" },
            { id: "style", label: "Estilo" },
            { id: "html", label: "HTML" },
            { id: "binding", label: "Binding" },
            { id: "data", label: "Dados" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 h-8 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer transition-all duration-150 border-b-2 border-transparent",
              tab === t.id &&
                "bg-white dark:bg-slate-950 border-l border-r border-t -mb-px text-slate-900 dark:text-slate-100 font-bold rounded-t-md shadow-sm border-b-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {tab === "layout" && (
          <>
            <TextField
              label="Nome"
              value={element.name}
              onChange={(v) => update(element.id, { name: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={element.x} onChange={(v) => update(element.id, { x: v })} />
              <NumberField label="Y" value={element.y} onChange={(v) => update(element.id, { y: v })} />
              <NumberField label="W" value={element.width} onChange={(v) => update(element.id, { width: v })} />
              <NumberField label="H" value={element.height} onChange={(v) => update(element.id, { height: v })} />
              <NumberField label="Rot" value={element.rotation} onChange={(v) => update(element.id, { rotation: v })} step={1} />
              <NumberField label="Z" value={element.zIndex} onChange={(v) => update(element.id, { zIndex: v })} />
            </div>
            <label className="flex items-center gap-2 text-xs mt-2">
              <input
                type="checkbox"
                checked={element.locked ?? false}
                onChange={(e) => update(element.id, { locked: e.target.checked })}
              />
              Bloqueado
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={element.visible !== false}
                onChange={(e) => update(element.id, { visible: e.target.checked })}
              />
              Visível
            </label>
          </>
        )}

        {tab === "style" && (
          <>
            <ColorField
              label="Cor"
              value={element.style.color}
              onChange={(v) => updateStyle(element.id, { color: v })}
            />
            <ColorField
              label="Fundo"
              value={element.style.background}
              onChange={(v) => updateStyle(element.id, { background: v })}
            />
            <ColorField
              label="Borda"
              value={element.style.borderColor}
              onChange={(v) => updateStyle(element.id, { borderColor: v })}
            />
            <NumberField label="Borda" value={element.style.borderWidth} onChange={(v) => updateStyle(element.id, { borderWidth: v })} />
            <NumberField label="Raio" value={element.style.borderRadius} onChange={(v) => updateStyle(element.id, { borderRadius: v })} />
            <NumberField label="Padding" value={element.style.padding} onChange={(v) => updateStyle(element.id, { padding: v })} />
            <TextField label="Fonte" value={element.style.fontFamily} onChange={(v) => updateStyle(element.id, { fontFamily: v })} />
            <NumberField label="Tam." value={element.style.fontSize} onChange={(v) => updateStyle(element.id, { fontSize: v })} />
            <NumberField label="Peso" value={element.style.fontWeight} onChange={(v) => updateStyle(element.id, { fontWeight: v })} step={100} />
            <label className="flex items-center gap-2 text-xs">
              <span className="w-14 text-slate-500">Alin.</span>
              <select
                value={element.style.textAlign ?? "left"}
                onChange={(e) =>
                  updateStyle(element.id, {
                    textAlign: e.target.value as TemplateElement["style"]["textAlign"],
                  })
                }
                className="flex-1 px-2 py-1 border rounded bg-white"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
                <option value="justify">Justificado</option>
              </select>
            </label>
          </>
        )}

        {tab === "html" && (
          <div className="flex flex-col gap-2 h-[280px]">
            <div className="text-[11px] text-slate-550 dark:text-slate-450 leading-normal">
              Código HTML customizado (substitui a renderização visual padrão se preenchido):
            </div>
            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950">
              <Editor
                height="100%"
                language="html"
                theme={editorTheme}
                value={(element.data?.customHtml as string) ?? ""}
                onChange={(v) => updateData(element.id, { customHtml: v || "" })}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  fontSize: 11,
                  wordWrap: "on",
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Use interpolações como <code className="text-indigo-550 dark:text-indigo-400 font-mono">{"{{cliente.nome}}"}</code> para renderizar dados dinâmicos.
            </p>
          </div>
        )}

        {tab === "binding" && (
          <>
            <label className="flex items-center gap-2 text-xs">
              <span className="w-14 text-slate-500">Modo</span>
              <select
                value={element.binding?.mode ?? "static"}
                onChange={(e) =>
                  update(element.id, {
                    binding: {
                      ...(element.binding ?? { mode: "static" }),
                      mode: e.target.value as "static" | "expression",
                    },
                  })
                }
                className="flex-1 px-2 py-1 border rounded bg-white"
              >
                <option value="static">Estático</option>
                <option value="expression">Expressão</option>
              </select>
            </label>
            <TextField
              label="Fallback"
              value={element.binding?.fallback}
              onChange={(v) =>
                update(element.id, {
                  binding: {
                    ...(element.binding ?? { mode: "static" }),
                    fallback: v,
                  },
                })
              }
            />
            <label className="flex items-center gap-2 text-xs">
              <span className="w-14 text-slate-500">Format</span>
              <select
                value={element.binding?.format ?? "text"}
                onChange={(e) =>
                  update(element.id, {
                    binding: {
                      ...(element.binding ?? { mode: "static" }),
                      format: e.target.value as BindingFormat,
                    },
                  })
                }
                className="flex-1 px-2 py-1 border rounded bg-white"
              >
                <option value="text">Texto</option>
                <option value="currency">Moeda</option>
                <option value="date">Data</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="percent">Percentual</option>
              </select>
            </label>
            <p className="text-[10px] text-slate-500 leading-snug pt-2">
              Use <code>{"{{caminho.no.json}}"}</code> diretamente no conteúdo do
              elemento (texto, título, body). Esse painel define apenas o
              fallback e formato.
            </p>
          </>
        )}

        {tab === "data" && (
          <ElementDataEditor element={element} updateData={updateData} />
        )}
      </div>
    </>
  );
}

function ElementDataEditor({
  element,
  updateData,
}: {
  element: TemplateElement;
  updateData: (id: string, patch: Record<string, unknown>) => void;
}) {
  const data = element.data ?? {};
  const dataJson = useEvaluationContext() ?? {};

  switch (element.type) {
    case "text":
      return (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">Texto (suporta bindings)</span>
          <AutocompleteTextarea
            value={(data.text as string) ?? ""}
            onChange={(v) => updateData(element.id, { text: v })}
            rows={6}
            className="font-mono text-[11px]"
          />
          {/* Live Preview Panel */}
          <div className="mt-2 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
            <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Visualização em Tempo Real (Live Preview)
            </div>
            <div className="text-[11px] font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300 break-all leading-normal">
              {interpolate((data.text as string) ?? "", dataJson) || <span className="text-slate-400 italic">Vazio</span>}
            </div>
          </div>
        </div>
      );
    case "card":
      return (
        <div className="space-y-2">
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">Título</span>
            <AutocompleteInput
              value={(data.title as string) ?? ""}
              onChange={(v) => updateData(element.id, { title: v })}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">Body</span>
            <AutocompleteTextarea
              value={(data.body as string) ?? ""}
              onChange={(v) => updateData(element.id, { body: v })}
              rows={5}
              className="font-mono text-[11px]"
            />
          </div>
          {/* Live Preview Panel */}
          <div className="mt-2.5 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5 space-y-1.5 shadow-sm">
            <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
              Visualização em Tempo Real (Live Preview)
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 space-y-1">
              <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 break-all leading-normal">
                {interpolate((data.title as string) ?? "", dataJson) || <span className="text-slate-400 italic">Sem título</span>}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-450 whitespace-pre-wrap break-all leading-normal">
                {interpolate((data.body as string) ?? "", dataJson) || <span className="text-slate-400 italic">Sem conteúdo</span>}
              </div>
            </div>
          </div>
        </div>
      );
    case "image":
      return (
        <>
          <TextField
            label="URL"
            value={(data.src as string) ?? ""}
            onChange={(v) => updateData(element.id, { src: v })}
          />
          <label className="flex items-center gap-2 text-xs">
            <span className="w-14 text-slate-500">Fit</span>
            <select
              value={(data.fit as string) ?? "cover"}
              onChange={(e) => updateData(element.id, { fit: e.target.value })}
              className="flex-1 px-2 py-1 border rounded bg-white"
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
              <option value="fill">fill</option>
              <option value="none">none</option>
            </select>
          </label>
        </>
      );
    case "table": {
      const columns =
        (data.columns as Array<{ label: string; path: string; format?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <TextField
            label="Array"
            value={(data.arrayPath as string) ?? ""}
            onChange={(v) => updateData(element.id, { arrayPath: v })}
          />
          <div className="text-xs text-slate-500">Colunas</div>
          {columns.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={c.label}
                onChange={(e) => {
                  const next = [...columns];
                  next[i] = { ...c, label: e.target.value };
                  updateData(element.id, { columns: next });
                }}
                placeholder="Label"
                className="flex-1 px-2 py-1 border rounded text-[11px]"
              />
              <input
                value={c.path}
                onChange={(e) => {
                  const next = [...columns];
                  next[i] = { ...c, path: e.target.value };
                  updateData(element.id, { columns: next });
                }}
                placeholder="path"
                className="flex-1 px-2 py-1 border rounded text-[11px] font-mono"
              />
              <select
                value={c.format ?? "text"}
                onChange={(e) => {
                  const next = [...columns];
                  next[i] = { ...c, format: e.target.value };
                  updateData(element.id, { columns: next });
                }}
                className="px-1 py-1 border rounded text-[11px]"
              >
                <option value="text">txt</option>
                <option value="currency">R$</option>
                <option value="date">dt</option>
                <option value="cpf">cpf</option>
                <option value="cnpj">cnpj</option>
                <option value="percent">%</option>
              </select>
              <button
                onClick={() => {
                  const next = columns.filter((_, j) => j !== i);
                  updateData(element.id, { columns: next });
                }}
                className="px-1.5 py-1 text-slate-500 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              updateData(element.id, {
                columns: [...columns, { label: "Coluna", path: "campo" }],
              })
            }
            className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
          >
            + coluna
          </button>
        </div>
      );
    }
    default:
      return (
        <p className="text-xs text-slate-500">
          Este elemento não possui dados específicos.
        </p>
      );
  }
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sliders } from "lucide-react";

export function FrameInspector({ frameId }: { frameId?: string }) {
  const [tab, setTab] = useState<"properties" | "html_compiled" | "html_custom">("properties");
  const frames = useEditorStore((s) => s.template.frames);
  const activeId = useEditorStore((s) => s.activeFrameId);
  const idToUse = frameId ?? activeId;
  const frame = frames.find((f) => f.id === idToUse);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  if (!frame)
    return (
      <div className="p-4 text-xs text-slate-500 leading-snug">
        Selecione uma página para editar suas propriedades.
      </div>
    );

  const renderedHtml = frame ? renderTemplateToHtml(template, frame.id, data).html : "";

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-900 dark:text-slate-100">
      <div className="flex border-b border-border text-xs bg-slate-100/70 dark:bg-slate-900/50">
        <button
          onClick={() => setTab("properties")}
          className={cn(
            "flex-1 h-8 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer transition-all duration-150 border-b-2 border-transparent",
            tab === "properties" && "bg-white dark:bg-slate-950 border-l border-r border-t -mb-px text-slate-900 dark:text-slate-100 font-bold rounded-t-md shadow-sm border-b-transparent",
          )}
        >
          Propriedades
        </button>
        <button
          onClick={() => setTab("html_compiled")}
          className={cn(
            "flex-1 h-8 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer transition-all duration-150 border-b-2 border-transparent",
            tab === "html_compiled" && "bg-white dark:bg-slate-950 border-l border-r border-t -mb-px text-slate-900 dark:text-slate-100 font-bold rounded-t-md shadow-sm border-b-transparent",
          )}
        >
          Compilado
        </button>
        <button
          onClick={() => setTab("html_custom")}
          className={cn(
            "flex-1 h-8 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer transition-all duration-150 border-b-2 border-transparent",
            tab === "html_custom" && "bg-white dark:bg-slate-950 border-l border-r border-t -mb-px text-slate-900 dark:text-slate-100 font-bold rounded-t-md shadow-sm border-b-transparent",
          )}
        >
          Código HTML
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {tab === "properties" && (
          <>
            <div className="text-xs font-semibold text-slate-400 mb-1">Página</div>
            <TextField
              label="Nome"
              value={frame.name}
              onChange={(v) => updateFrame(frame.id, { name: v })}
            />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <NumberField label="X" value={frame.x} onChange={(v) => updateFrame(frame.id, { x: v })} />
              <NumberField label="Y" value={frame.y} onChange={(v) => updateFrame(frame.id, { y: v })} />
              <NumberField label="W" value={frame.width} onChange={(v) => updateFrame(frame.id, { width: v })} />
              <NumberField label="H" value={frame.height} onChange={(v) => updateFrame(frame.id, { height: v })} />
            </div>
            <div className="mt-2">
              <ColorField
                label="Fundo"
                value={frame.background}
                onChange={(v) => updateFrame(frame.id, { background: v })}
              />
            </div>
          </>
        )}

        {tab === "html_compiled" && (
          <div className="flex flex-col gap-2 h-[340px] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">HTML compilado da página:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(renderedHtml);
                  toast.success("HTML copiado com sucesso!");
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                Copiar
              </button>
            </div>
            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950">
              <Editor
                height="100%"
                language="html"
                theme={editorTheme}
                value={renderedHtml}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  fontSize: 11,
                  wordWrap: "on",
                  readOnly: true,
                }}
              />
            </div>
          </div>
        )}

        {tab === "html_custom" && (
          <div className="flex flex-col gap-2 h-[340px] text-xs">
            <div className="text-[11px] text-slate-550 dark:text-slate-450 leading-normal">
              Código HTML Customizado (substitui os elementos visuais padrão da página para modularização total):
            </div>
            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950">
              <Editor
                height="100%"
                language="html"
                theme={editorTheme}
                value={frame.customHtml ?? ""}
                onChange={(v) => updateFrame(frame.id, { customHtml: v || "" })}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  fontSize: 11,
                  wordWrap: "on",
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Use interpolações como <code className="text-indigo-400 font-mono">{"{{cliente.nome}}"}</code> para renderizar dados dinâmicos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ElementInspectorPopover({
  element,
  children,
  side = "top",
}: {
  element: TemplateElement;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align="center"
        className="w-80 p-0 bg-popover text-popover-foreground border border-border shadow-2xl rounded-lg overflow-hidden z-50"
      >
        <div className="p-1 bg-slate-100/50 dark:bg-slate-900/40 border-b border-border text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5 flex items-center justify-between">
          <span>Propriedades do Elemento</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-550 text-indigo-50 dark:bg-indigo-950/45 dark:text-indigo-300 font-mono">
            {element.type.toUpperCase()}
          </span>
        </div>
        <ElementInspector element={element} />
      </PopoverContent>
    </Popover>
  );
}

export function FrameInspectorPopover({
  frameId,
  children,
}: {
  frameId: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0 bg-popover text-popover-foreground border border-border shadow-2xl rounded-lg overflow-hidden z-50"
      >
        <div className="p-1 bg-slate-100/50 dark:bg-slate-900/40 border-b border-border text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5">
          Propriedades da Página (Frame)
        </div>
        <FrameInspector frameId={frameId} />
      </PopoverContent>
    </Popover>
  );
}

export function RightInspector({ isIsolated }: { isIsolated?: boolean }) {
  const storeSelectedIds = useEditorStore((s) => s.selectedIds);
  const storeElements = useEditorStore((s) => s.template.elements);
  const storeSetRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen);

  const isolatedSelectedIds = useIsolatedEditorStore((s) => s.selectedIds);
  const isolatedElements = useIsolatedEditorStore((s) => s.elementTree);

  const selectedIds = isIsolated ? isolatedSelectedIds : storeSelectedIds;
  const elements = isIsolated ? isolatedElements : storeElements;

  const selected = elements.find((e) => e.id === selectedIds[0]);
  const setRightPanelOpen = isIsolated ? () => {} : storeSetRightPanelOpen;

  return (
    <div
      className="flex flex-col h-full w-full min-w-0"
      style={{ background: "var(--editor-panel)" }}
    >
      {/* Cabeçalho de Propriedades com Botão Fechar - Apenas quando isolado (modal) */}
      {isIsolated && (
        <div className="h-9 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/10 shrink-0">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
            {selected ? "Propriedades" : "Página"}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {selected ? (
          <ElementInspector element={selected} isIsolated={isIsolated} />
        ) : isIsolated ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/5">
            Selecione um elemento para inspecionar e editar suas propriedades.
          </div>
        ) : (
          <FrameInspector />
        )}
      </div>
    </div>
  );
}
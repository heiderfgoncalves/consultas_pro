import { useState, useMemo } from "react";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { useIsolatedEditorStore } from "../store/isolated-editor.store";
import type { BindingFormat, TemplateElement, ReusableComponent } from "../schema/template";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { SafeEditor as Editor } from "./SafeEditor";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { renderSelectionHtml } from "./HtmlInspectorPanel";
import { interpolate } from "../engine/interpolate";
import { toast } from "sonner";
import { AutocompleteInput, AutocompleteTextarea } from "./AutocompleteFields";
import { useTheme } from "next-themes";
import { X } from "lucide-react";


type Tab = "layout" | "style" | "html" | "binding" | "data" | "parameters";

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

  const tab = (isIsolated ? localTab : storeTab) as Tab;
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

  const reusableComponents = useEditorStore((s) => s.reusableComponents);
  const matchedComponent = element.componentId
    ? reusableComponents.find((c) => c.id === element.componentId)
    : null;
  const hasParameters = !!(matchedComponent && matchedComponent.variables && matchedComponent.variables.length > 0);

  // Redireciona para layout se a aba for parâmetros mas o componente não os possuir
  useState(() => {
    if (tab === "parameters" && !hasParameters) {
      setTab("layout");
    }
  });

  return (
    <>
      {isIsolated && (
        <div className="flex border-b border-border text-xs bg-slate-100/70 dark:bg-slate-900/50">
          {(
            [
              { id: "layout", label: "Layout" },
              { id: "style", label: "Estilo" },
              { id: "html", label: "HTML" },
              { id: "binding", label: "Binding" },
              { id: "data", label: "Dados" },
              ...(hasParameters ? [{ id: "parameters" as Tab, label: "Parâmetros" }] : []),
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (isIsolated) {
                  setLocalTab(t.id);
                } else if (t.id !== "parameters") {
                  storeSetTab(t.id);
                }
              }}
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
      )}

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

            {element.type === "table" && (() => {
              const tableData = element.data ?? {};
              const columns = (tableData.columns as Array<{ label: string; path: string; format?: string; width?: string; emptyFallback?: string }>) ?? [];
              const headerBg = (tableData.headerBg as string) ?? "transparent";
              const headerColor = (tableData.headerColor as string) ?? "inherit";
              const headerSize = (tableData.headerSize as number) ?? 12;
              const rowBg = (tableData.rowBg as string) ?? "transparent";
              const rowColor = (tableData.rowColor as string) ?? "inherit";
              const rowSize = (tableData.rowSize as number) ?? 12;
              const autoHeight = (tableData.autoHeight as boolean) ?? false;

              return (
                <div className="border-t border-border mt-4 pt-3.5 space-y-4">
                  <div className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                    Propriedades Exclusivas da Tabela
                  </div>

                  <div className="space-y-2">
                    <TextField
                      label="Array"
                      value={(tableData.arrayPath as string) ?? ""}
                      onChange={(v) => updateData(element.id, { arrayPath: v })}
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={autoHeight}
                        onChange={(e) => updateData(element.id, { autoHeight: e.target.checked })}
                      />
                      Altura flexível (ajusta às linhas)
                    </label>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-2.5">
                    <div className="text-[11px] font-bold text-slate-500">Estilo do Cabeçalho</div>
                    <ColorField label="Fundo" value={headerBg} onChange={(v) => updateData(element.id, { headerBg: v })} />
                    <ColorField label="Cor" value={headerColor} onChange={(v) => updateData(element.id, { headerColor: v })} />
                    <NumberField label="Tam." value={headerSize} onChange={(v) => updateData(element.id, { headerSize: v })} />
                  </div>

                  <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-2.5">
                    <div className="text-[11px] font-bold text-slate-500">Estilo das Linhas</div>
                    <ColorField label="Fundo" value={rowBg} onChange={(v) => updateData(element.id, { rowBg: v })} />
                    <ColorField label="Cor" value={rowColor} onChange={(v) => updateData(element.id, { rowColor: v })} />
                    <NumberField label="Tam." value={rowSize} onChange={(v) => updateData(element.id, { rowSize: v })} />
                  </div>

                  <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-2.5">
                    <div className="text-[11px] font-bold text-slate-500 mb-2">Gerenciar Colunas</div>
                    {columns.map((c, i) => (
                      <div key={i} className="flex flex-col gap-1.5 mb-2.5 p-2 border border-slate-100 dark:border-slate-900 rounded bg-slate-50/50 dark:bg-slate-950/20">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={c.label}
                            onChange={(e) => {
                              const next = [...columns];
                              next[i] = { ...c, label: e.target.value };
                              updateData(element.id, { columns: next });
                            }}
                            placeholder="Nome (Label)"
                            className="flex-1 px-2 py-1 border border-border rounded text-[11px] bg-background text-foreground focus:outline-none"
                          />
                          <input
                            value={c.path}
                            onChange={(e) => {
                              const next = [...columns];
                              next[i] = { ...c, path: e.target.value };
                              updateData(element.id, { columns: next });
                            }}
                            placeholder="Caminho (path)"
                            className="flex-1 px-2 py-1 border border-border rounded text-[11px] font-mono bg-background text-foreground focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const next = columns.filter((_, j) => j !== i);
                              updateData(element.id, { columns: next });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded"
                            title="Remover Coluna"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={c.format ?? "text"}
                            onChange={(e) => {
                              const next = [...columns];
                              next[i] = { ...c, format: e.target.value };
                              updateData(element.id, { columns: next });
                            }}
                            className="flex-[1.5] px-1 py-1 border rounded text-[11px] bg-background text-foreground focus:outline-none"
                          >
                            <option value="text">Texto</option>
                            <option value="currency">Moeda (R$)</option>
                            <option value="date">Data (dd/mm/aaaa)</option>
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="percent">Percentual (%)</option>
                          </select>
                          <input
                            value={c.width ?? "auto"}
                            onChange={(e) => {
                              const next = [...columns];
                              next[i] = { ...c, width: e.target.value };
                              updateData(element.id, { columns: next });
                            }}
                            placeholder="Largura (ex: auto, 100px)"
                            className="flex-1 px-2 py-1 border rounded text-[11px] bg-background text-foreground focus:outline-none w-16"
                          />
                          <input
                            value={c.emptyFallback ?? ""}
                            onChange={(e) => {
                              const next = [...columns];
                              next[i] = { ...c, emptyFallback: e.target.value };
                              updateData(element.id, { columns: next });
                            }}
                            placeholder="Se vazio (ex: -)"
                            className="flex-[1.2] px-2 py-1 border border-border rounded text-[11px] bg-background text-foreground focus:outline-none w-20"
                            title="Texto padrão caso o campo venha sem dados"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateData(element.id, {
                          columns: [...columns, { label: "Nova Coluna", path: "campo", emptyFallback: "-" }],
                        })
                      }
                      className="w-full text-xs py-1.5 border border-dashed border-border rounded hover:bg-slate-50 dark:hover:bg-slate-900/40 flex items-center justify-center gap-1 mt-2 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                    >
                      + Adicionar Coluna
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-2.5">
                    <div className="text-[11px] font-bold text-slate-500 mb-2">Comportamento se Tabela Vazia</div>
                    <div className="text-[10px] text-slate-450 mb-1">HTML/Texto exibido se a expressão de dados retornar vazia:</div>
                    <div className="h-[120px] relative">
                      <Editor
                        key={`emptyStateHtml-layout-${element.id}`}
                        height="100%"
                        language="html"
                        theme={editorTheme}
                        value={(tableData.emptyStateHtml as string) ?? ""}
                        onChange={(v) => updateData(element.id, { emptyStateHtml: v || "" })}
                        hideHeader={true}
                        options={{
                          minimap: { enabled: false },
                          lineNumbers: "off",
                          fontSize: 11,
                          wordWrap: "on",
                          contextmenu: false,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
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
          <ElementHtmlInspector element={element} isIsolated={isIsolated} updateData={updateData} editorTheme={editorTheme} />
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

        {tab === "parameters" && hasParameters && matchedComponent && (
          <ComponentParametersEditor
            element={element}
            component={matchedComponent}
          />
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
        (data.columns as Array<{ label: string; path: string; format?: string; width?: string; emptyFallback?: string }>) ?? [];
      const headerBg = (data.headerBg as string) ?? "transparent";
      const headerColor = (data.headerColor as string) ?? "inherit";
      const headerSize = (data.headerSize as number) ?? 12;
      const rowBg = (data.rowBg as string) ?? "transparent";
      const rowColor = (data.rowColor as string) ?? "inherit";
      const rowSize = (data.rowSize as number) ?? 12;
      const autoHeight = (data.autoHeight as boolean) ?? false;

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <TextField
              label="Array"
              value={(data.arrayPath as string) ?? ""}
              onChange={(v) => updateData(element.id, { arrayPath: v })}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoHeight}
                onChange={(e) => updateData(element.id, { autoHeight: e.target.checked })}
              />
              Altura flexível (ajusta às linhas)
            </label>
          </div>

          <div className="space-y-2 border-t border-border pt-2">
            <div className="text-xs font-semibold text-slate-500">Estilo do Cabeçalho</div>
            <ColorField label="Fundo" value={headerBg} onChange={(v) => updateData(element.id, { headerBg: v })} />
            <ColorField label="Cor" value={headerColor} onChange={(v) => updateData(element.id, { headerColor: v })} />
            <NumberField label="Tam." value={headerSize} onChange={(v) => updateData(element.id, { headerSize: v })} />
          </div>

          <div className="space-y-2 border-t border-border pt-2">
            <div className="text-xs font-semibold text-slate-500">Estilo das Linhas</div>
            <ColorField label="Fundo" value={rowBg} onChange={(v) => updateData(element.id, { rowBg: v })} />
            <ColorField label="Cor" value={rowColor} onChange={(v) => updateData(element.id, { rowColor: v })} />
            <NumberField label="Tam." value={rowSize} onChange={(v) => updateData(element.id, { rowSize: v })} />
          </div>

          <div className="space-y-2 border-t border-border pt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">Colunas</div>
            {columns.map((c, i) => (
              <div key={i} className="flex flex-col gap-1 mb-2 p-2 border border-slate-100 rounded bg-slate-50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <input
                    value={c.label}
                    onChange={(e) => {
                      const next = [...columns];
                      next[i] = { ...c, label: e.target.value };
                      updateData(element.id, { columns: next });
                    }}
                    placeholder="Label"
                    className="flex-1 px-2 py-1 border rounded text-[11px] bg-background text-foreground"
                  />
                  <input
                    value={c.path}
                    onChange={(e) => {
                      const next = [...columns];
                      next[i] = { ...c, path: e.target.value };
                      updateData(element.id, { columns: next });
                    }}
                    placeholder="path"
                    className="flex-1 px-2 py-1 border rounded text-[11px] font-mono bg-background text-foreground"
                  />
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
                <div className="flex items-center gap-1">
                  <select
                    value={c.format ?? "text"}
                    onChange={(e) => {
                      const next = [...columns];
                      next[i] = { ...c, format: e.target.value };
                      updateData(element.id, { columns: next });
                    }}
                    className="flex-[1.5] px-1 py-1 border rounded text-[11px] bg-background text-foreground focus:outline-none"
                  >
                    <option value="text">Texto</option>
                    <option value="currency">Moeda (R$)</option>
                    <option value="date">Data (dd/mm/aaaa)</option>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="percent">Percentual (%)</option>
                  </select>
                  <input
                    value={c.width ?? "auto"}
                    onChange={(e) => {
                      const next = [...columns];
                      next[i] = { ...c, width: e.target.value };
                      updateData(element.id, { columns: next });
                    }}
                    placeholder="Largura"
                    className="flex-1 px-2 py-1 border rounded text-[11px] bg-background text-foreground focus:outline-none w-16"
                  />
                  <input
                    value={c.emptyFallback ?? ""}
                    onChange={(e) => {
                      const next = [...columns];
                      next[i] = { ...c, emptyFallback: e.target.value };
                      updateData(element.id, { columns: next });
                    }}
                    placeholder="Se vazio"
                    className="flex-[1.2] px-2 py-1 border rounded text-[11px] bg-background text-foreground focus:outline-none w-20"
                    title="Texto padrão caso o campo venha sem dados"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                updateData(element.id, {
                  columns: [...columns, { label: "Coluna", path: "campo", emptyFallback: "-" }],
                })
              }
              className="text-xs px-2 py-1 border rounded hover:bg-slate-50 dark:hover:bg-slate-900/40 mt-2 flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
            >
              + coluna
            </button>
          </div>

          <div className="space-y-2 border-t border-border pt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">Comportamento se Tabela Vazia</div>
            <div className="text-[10px] text-slate-450 mb-1">HTML/Texto exibido se a expressão de dados retornar vazia:</div>
            <div className="h-[120px] relative">
              <Editor
                key={`emptyStateHtml-data-${element.id}`}
                height="100%"
                language="html"
                theme={editorTheme}
                value={(data.emptyStateHtml as string) ?? ""}
                onChange={(v) => updateData(element.id, { emptyStateHtml: v || "" })}
                hideHeader={true}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  fontSize: 11,
                  wordWrap: "on",
                  contextmenu: false,
                }}
              />
            </div>
          </div>
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

function ComponentParametersEditor({
  element,
  component,
}: {
  element: TemplateElement;
  component: ReusableComponent;
}) {
  const updateGroupArgs = useEditorStore((s) => s.updateGroupArguments);
  const args = element.arguments ?? {};

  return (
    <div className="space-y-4 text-xs pt-1">
      <div className="p-3 rounded-lg bg-indigo-50/25 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40">
        <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
          Bloco Customizado Parametrizado
        </div>
        <div className="font-semibold text-slate-800 dark:text-slate-200">
          {component.name}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-normal">
          Forneça as expressões de dados que serão injetadas em cada variável deste componente para resolver seu conteúdo dinâmico.
        </p>
      </div>

      <div className="space-y-3">
        {component.variables.map((v: string) => (
          <div key={v} className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
              <span>Parâmetro: <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{v}</code></span>
            </label>
            <AutocompleteInput
              value={args[v] ?? ""}
              onChange={(val) => {
                if (element.groupId) {
                  updateGroupArgs(element.groupId, { [v]: val });
                }
              }}
              placeholder="Ex: cliente.nome ou 'Valor Fixo'"
              className="text-xs h-8 font-mono border-slate-200 dark:border-slate-800"
            />
          </div>
        ))}
      </div>

      <div className="text-[10px] leading-relaxed text-muted-foreground pt-2.5 border-t border-slate-100 dark:border-slate-850">
        💡 <span className="font-semibold">Dica de uso:</span> No design deste bloco personalizado, os elementos internos devem referenciar estas variáveis como <code className="text-indigo-500 dark:text-indigo-400 font-mono font-medium">{"{$params." + (component.variables[0] || "variavel") + "}"}</code> para renderizar dinamicamente os valores fornecidos aqui.
      </div>
    </div>
  );
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sliders } from "lucide-react";

export function FrameInspector({ frameId, hideTabs }: { frameId?: string; hideTabs?: boolean }) {
  const [localTab, setLocalTab] = useState<"properties" | "html_compiled" | "html_custom">("properties");
  const [htmlViewMode, setHtmlViewMode] = useState<"custom" | "compiled">("custom");
  const storeTab = useEditorStore((s) => s.activeRightTab);

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

  const tab = hideTabs
    ? (storeTab === "html"
        ? (htmlViewMode === "custom" ? "html_custom" : "html_compiled")
        : "properties")
    : localTab;

  const setTab = setLocalTab;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-900 dark:text-slate-100">
      {!hideTabs && (
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
      )}

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {hideTabs && (tab === "html_custom" || tab === "html_compiled") && (
          <div className="flex items-center justify-between bg-slate-100/60 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 mb-2 select-none">
            <span className="text-[10px] font-semibold text-slate-500">Visualização HTML</span>
            <div className="flex rounded bg-slate-200 dark:bg-slate-950 p-0.5 border border-slate-200/50 dark:border-slate-800/50">
              <button
                onClick={() => setHtmlViewMode("custom")}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 cursor-pointer",
                  htmlViewMode === "custom"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-350"
                )}
              >
                Customizado
              </button>
              <button
                onClick={() => setHtmlViewMode("compiled")}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 cursor-pointer",
                  htmlViewMode === "compiled"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-350"
                )}
              >
                Compilado
              </button>
            </div>
          </div>
        )}
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
            <div className="flex-1 min-h-[200px] border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
              <Editor
                key={`compiled-${frame.id}`}
                height="100%"
                language="html"
                theme={editorTheme}
                value={renderedHtml}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
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
            <div className="flex-1 min-h-[200px] border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
              <Editor
                key={`custom-${frame.id}`}
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
  const activeRightTab = useEditorStore((s) => s.activeRightTab);

  const isolatedSelectedIds = useIsolatedEditorStore((s) => s.selectedIds);
  const isolatedElements = useIsolatedEditorStore((s) => s.elementTree);

  const selectedIds = isIsolated ? isolatedSelectedIds : storeSelectedIds;
  const elements = isIsolated ? isolatedElements : storeElements;

  const selected = elements.find((e) => e.id === selectedIds[0]);
  const setRightPanelOpen = isIsolated ? () => {} : storeSetRightPanelOpen;

  const tabLabels: Record<string, string> = {
    layout: "Layout",
    style: "Estilo",
    html: "HTML Customizado",
    binding: "Conexões / Binding",
    data: "Dados / Conteúdo",
    parameters: "Parâmetros",
  };

  const activeTabLabel = tabLabels[activeRightTab] || "Propriedades";

  return (
    <div
      className="flex flex-col h-full w-full min-w-0"
      style={{ background: "var(--editor-panel)" }}
    >
      {/* Cabeçalho de Propriedades com Botão Fechar - Apenas quando isolado (modal) */}
      {isIsolated ? (
        <div className="h-9 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/10 shrink-0">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
            {selected ? "Propriedades" : "Página"}
          </span>
        </div>
      ) : (
        /* Cabeçalho simples para a terceira coluna do editor */
        <div className="h-9 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/10 shrink-0 select-none">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-400">
            {selected 
              ? `Propriedades do Elemento: ${activeTabLabel}` 
              : `Propriedades da Página: ${activeRightTab === "html" ? "Código HTML" : "Geral"}`
            }
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
          <FrameInspector hideTabs={true} />
        )}
      </div>
    </div>
  );
}

function ElementHtmlInspector({
  element,
  isIsolated,
  updateData,
  editorTheme,
}: {
  element: TemplateElement;
  isIsolated: boolean;
  updateData: (id: string, data: any) => void;
  editorTheme: string;
}) {
  const [mode, setMode] = useState<"custom" | "compiled">("custom");
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();

  const renderedHtml = useMemo(() => {
    try {
      return renderSelectionHtml(template, [element], data);
    } catch (err: any) {
      return `<!-- Erro ao compilar: ${err?.message || err} -->`;
    }
  }, [template, element, data]);

  return (
    <div className="flex flex-col gap-2 h-[340px]">
      <div className="flex items-center justify-between bg-slate-100/60 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 select-none">
        <span className="text-[10px] font-semibold text-slate-500">Visualização HTML</span>
        <div className="flex rounded bg-slate-200 dark:bg-slate-950 p-0.5 border border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={() => setMode("custom")}
            className={cn(
              "px-2 py-0.5 text-[9px] font-bold rounded transition-colors",
              mode === "custom" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Customizado
          </button>
          <button
            onClick={() => setMode("compiled")}
            className={cn(
              "px-2 py-0.5 text-[9px] font-bold rounded transition-colors",
              mode === "compiled" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Compilado
          </button>
        </div>
      </div>

      {mode === "custom" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="text-[10px] text-slate-550 dark:text-slate-450 leading-normal">
            Código HTML customizado (substitui a renderização visual padrão se preenchido):
          </div>
          <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
            <Editor
              key={isIsolated ? `isolated-custom-${element.id}` : `custom-${element.id}`}
              height="100%"
              language="html"
              theme={editorTheme}
              value={(element.data?.customHtml as string) ?? ""}
              onChange={(v) => updateData(element.id, { customHtml: v || "" })}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
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

      {mode === "compiled" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="text-[10px] text-slate-550 dark:text-slate-450 leading-normal">
            HTML gerado por este elemento (Preview read-only):
          </div>
          <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
            <Editor
              key={`compiled-${element.id}`}
              height="100%"
              language="html"
              theme={editorTheme}
              value={renderedHtml}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                fontSize: 11,
                wordWrap: "on",
                readOnly: true,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
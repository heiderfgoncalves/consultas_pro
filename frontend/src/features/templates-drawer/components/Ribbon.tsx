import { useState } from "react";
import { useEditorStore } from "../store/editor.store";
import type { ElementType, FramePreset } from "../schema/template";
import { PRESET_LIST } from "../utils/frames-presets";
import {
  Type,
  Image as ImageIcon,
  Minus,
  Square,
  Table as TableIcon,
  Layers,
  List as ListIcon,
  Star,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  Eye,
  Pencil,
  Grid3x3,
  Magnet,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Terminal,
  PanelsTopLeft,
  Plus,
  Undo2,
  Redo2,
  Printer,
  Code2,
  Bold,
  Italic,
  Underline,
  Calculator,
} from "lucide-react";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { cn } from "@/lib/utils";

type Tab = "inserir" | "layout" | "estilo" | "dados" | "ver";

function RibbonButton({
  icon: Icon,
  label,
  onClick,
  active,
  draggable,
  onDragStart,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-650 dark:text-slate-400 min-w-[54px] h-[52px] cursor-pointer transition-all duration-150 border border-transparent select-none",
        "hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-blue-500/15 dark:hover:text-blue-450",
        active && "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/10 shadow-xs",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-650 dark:hover:text-slate-400"
      )}
      title={label}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="leading-tight tracking-tight text-center truncate w-full">{label}</span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full border-r border-slate-200/60 dark:border-slate-800/60 px-3 py-1 shrink-0 justify-between">
      <div className="flex items-center gap-1 flex-1">{children}</div>
      <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 text-center tracking-widest uppercase pt-1">
        {title}
      </div>
    </div>
  );
}

function dragPayload(type: ElementType) {
  return (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-rd-element", type);
    e.dataTransfer.effectAllowed = "copy";
  };
}

export function Ribbon() {
  const [tab, setTab] = useState<Tab>("inserir");
  const s = useEditorStore();

  const tabs: { id: Tab; label: string }[] = [
    { id: "inserir", label: "Inserir" },
    { id: "layout", label: "Layout" },
    { id: "estilo", label: "Estilo" },
    { id: "dados", label: "Dados" },
    { id: "ver", label: "Ver" },
  ];

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800/80" style={{ background: "var(--editor-ribbon)" }}>
      <div className="flex items-center gap-1.5 px-3 h-8 border-b border-slate-200/60 dark:border-slate-800/50 text-xs bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-xs select-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 h-8 text-slate-550 dark:text-slate-450 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer transition-all duration-150 relative flex items-center justify-center text-[11px]",
              tab === t.id && [
                "text-blue-600 dark:text-blue-400 font-bold",
                "after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-t-full"
              ]
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={s.undo}
            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="size-3.5" />
          </button>
          <button
            onClick={s.redo}
            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-stretch h-[68px] overflow-x-auto">
        {tab === "inserir" && (
          <>
            <Group title="Frames">
              {PRESET_LIST.map((p) => (
                <RibbonButton
                  key={p.id}
                  icon={PanelsTopLeft}
                  label={p.label}
                  onClick={() => s.addFrame(p.id as FramePreset)}
                />
              ))}
            </Group>
            <Group title="Elementos">
              <RibbonButton
                icon={Type}
                label="Texto"
                draggable
                onDragStart={dragPayload("text")}
              />
              <RibbonButton
                icon={ImageIcon}
                label="Imagem"
                draggable
                onDragStart={dragPayload("image")}
              />
              <RibbonButton
                icon={Star}
                label="Ícone"
                draggable
                onDragStart={dragPayload("icon")}
              />
              <RibbonButton
                icon={ListIcon}
                label="Lista"
                draggable
                onDragStart={dragPayload("list")}
              />
              <RibbonButton
                icon={Minus}
                label="Divisor"
                draggable
                onDragStart={dragPayload("divider")}
              />
              <RibbonButton
                icon={Square}
                label="Card"
                draggable
                onDragStart={dragPayload("card")}
              />
              <RibbonButton
                icon={TableIcon}
                label="Tabela"
                draggable
                onDragStart={dragPayload("table")}
              />
              <RibbonButton
                icon={Layers}
                label="Container"
                draggable
                onDragStart={dragPayload("container")}
              />
            </Group>
          </>
        )}

        {tab === "layout" && (
          <>
            <Group title="Alinhar">
              <RibbonButton icon={AlignLeft} label="Esq" onClick={() => s.alignSelected("left")} />
              <RibbonButton icon={AlignCenter} label="Centro H" onClick={() => s.alignSelected("h-center")} />
              <RibbonButton icon={AlignRight} label="Dir" onClick={() => s.alignSelected("right")} />
              <RibbonButton icon={AlignStartVertical} label="Topo" onClick={() => s.alignSelected("top")} />
              <RibbonButton icon={AlignCenterVertical} label="Meio V" onClick={() => s.alignSelected("v-center")} />
              <RibbonButton icon={AlignEndVertical} label="Base" onClick={() => s.alignSelected("bottom")} />
            </Group>
            <Group title="Camadas">
              <RibbonButton
                icon={ArrowUpToLine}
                label="Trazer frente"
                onClick={() => s.bringForward(s.selectedIds)}
              />
              <RibbonButton
                icon={ArrowDownToLine}
                label="Enviar trás"
                onClick={() => s.sendBackward(s.selectedIds)}
              />
              <RibbonButton
                icon={Plus}
                label="Duplicar"
                onClick={() => s.duplicateElements(s.selectedIds)}
              />
            </Group>
            <Group title="Grupo">
              <RibbonButton
                icon={Layers}
                label="Agrupar"
                onClick={s.groupSelectedElements}
                disabled={s.selectedIds.length < 2}
              />
              <RibbonButton
                icon={Layers}
                label="Desagrupar"
                onClick={s.ungroupSelectedElements}
                disabled={!s.selectedIds.some(id => s.template.elements.find(e => e.id === id)?.groupId)}
              />
            </Group>
          </>
        )}

        {tab === "estilo" && (() => {
          if (s.selectedIds.length === 0) {
            const currentCanvas = s.template.canvas ?? { background: "#e2e8f0", grid: 8 };
            
            return (
              <>
                <Group title="Fundo do Relatório">
                  <ColorPickerPopover
                    value={currentCanvas.background}
                    onChange={(color) => s.updateCanvas({ background: color })}
                    title="Fundo do Relatório"
                    align="start"
                  >
                    <button
                      className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded hover:bg-slate-200/70 text-[10px] text-slate-700 min-w-[50px] h-full cursor-pointer transition-colors"
                      title="Cor de Fundo do Canvas"
                    >
                      <div 
                        className="size-5 rounded border border-slate-250 dark:border-slate-800 shadow-xs" 
                        style={{ background: currentCanvas.background }}
                      />
                      <span className="leading-none text-[9px] font-medium text-slate-500">Cor Fundo</span>
                    </button>
                  </ColorPickerPopover>
                  
                  {/* Cores rápidas */}
                  <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                    {[
                      { color: "#ffffff", label: "Branco" },
                      { color: "#f8fafc", label: "Platina" },
                      { color: "#f1f5f9", label: "Neve" },
                      { color: "#e2e8f0", label: "Office" },
                      { color: "#0f172a", label: "Slate" }
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={() => s.updateCanvas({ background: c.color })}
                        className={cn(
                          "size-4 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform",
                          currentCanvas.background === c.color && "ring-2 ring-indigo-500 ring-offset-1"
                        )}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </Group>
                
                <Group title="Grade do Relatório">
                  <div className="flex flex-col justify-center gap-1 px-1 min-w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-medium text-slate-500 w-11">Alinhamento:</span>
                      <select
                        value={String(currentCanvas.grid ?? 8)}
                        onChange={(e) => s.updateCanvas({ grid: Number(e.target.value) })}
                        className="h-[18px] text-[9px] px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                      >
                        <option value="4">4 px (Fino)</option>
                        <option value="8">8 px (Padrão)</option>
                        <option value="12">12 px (Médio)</option>
                        <option value="16">16 px (Largo)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={s.showGrid}
                          onChange={s.toggleGrid}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-650 dark:text-indigo-500 size-2.5 cursor-pointer"
                        />
                        <span className="text-[8px] font-medium text-slate-500">Exibir Grade</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={s.snap}
                          onChange={s.toggleSnap}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-650 dark:text-indigo-500 size-2.5 cursor-pointer"
                        />
                        <span className="text-[8px] font-medium text-slate-500">Atrair Grade</span>
                      </label>
                    </div>
                  </div>
                </Group>
                
                <div className="flex-1 flex items-center justify-end h-full px-6">
                  <div className="flex items-center gap-2 px-3 py-1 border border-indigo-100 dark:border-indigo-950/40 rounded-lg bg-indigo-50/15 dark:bg-indigo-950/5">
                    <Sparkles className="size-3 text-indigo-500" />
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      Estilo Global ativo. Selecione um elemento no canvas para ver propriedades específicas.
                    </span>
                  </div>
                </div>
              </>
            );
          }

          const selectedElement = s.template.elements.find((e) => e.id === s.selectedIds[0]);
          const currentStyle = selectedElement?.style ?? {};

          const handleStyleChange = (patch: React.CSSProperties) => {
            s.selectedIds.forEach((id) => s.updateElementStyle(id, patch));
          };

          const isBold = currentStyle.fontWeight === "bold" || currentStyle.fontWeight === "700";
          const isItalic = currentStyle.fontStyle === "italic";
          const isUnderline = currentStyle.textDecoration === "underline";

          return (
            <>
              <Group title="Fonte & Alinhamento">
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => handleStyleChange({ fontWeight: isBold ? "normal" : "bold" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      isBold && "bg-slate-200/95 text-slate-900 font-bold",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Negrito (Ctrl+B)"
                  >
                    <Bold className="size-4" />
                  </button>
                  <button
                    onClick={() => handleStyleChange({ fontStyle: isItalic ? "normal" : "italic" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      isItalic && "bg-slate-200/95 text-slate-900 font-bold",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Itálico (Ctrl+I)"
                  >
                    <Italic className="size-4" />
                  </button>
                  <button
                    onClick={() => handleStyleChange({ textDecoration: isUnderline ? "none" : "underline" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      isUnderline && "bg-slate-200/95 text-slate-900 font-bold",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Sublinhado (Ctrl+U)"
                  >
                    <Underline className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 pl-1">
                  <button
                    onClick={() => handleStyleChange({ textAlign: "left" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      currentStyle.textAlign === "left" && "bg-slate-200/95 text-slate-900",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Alinhar à Esquerda"
                  >
                    <AlignLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => handleStyleChange({ textAlign: "center" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      currentStyle.textAlign === "center" && "bg-slate-200/95 text-slate-900",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Centralizar"
                  >
                    <AlignCenter className="size-4" />
                  </button>
                  <button
                    onClick={() => handleStyleChange({ textAlign: "right" })}
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-200/70 text-slate-700 size-7 flex items-center justify-center cursor-pointer transition-colors",
                      currentStyle.textAlign === "right" && "bg-slate-200/95 text-slate-900",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Alinhar à Direita"
                  >
                    <AlignRight className="size-4" />
                  </button>
                </div>
              </Group>

              <Group title="Fundo & Cores">
                <ColorPickerPopover
                  value={currentStyle.color as string}
                  onChange={(color) => handleStyleChange({ color })}
                  title="Cor do Texto"
                  align="start"
                >
                  <button
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded hover:bg-slate-200/70 text-[10px] text-slate-700 min-w-[50px] h-full cursor-pointer transition-colors",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Cor da Fonte"
                  >
                    <div 
                      className="size-5 rounded border border-slate-250 dark:border-slate-800 flex items-center justify-center font-black text-xs font-serif bg-white shadow-xs" 
                      style={{ color: (currentStyle.color as string) ?? "#000000" }}
                    >
                      A
                    </div>
                    <span className="leading-none text-[9px] font-medium text-slate-500">Fonte</span>
                  </button>
                </ColorPickerPopover>

                <ColorPickerPopover
                  value={currentStyle.background as string}
                  onChange={(background) => handleStyleChange({ background })}
                  title="Cor de Fundo"
                  align="start"
                >
                  <button
                    disabled={s.selectedIds.length === 0}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded hover:bg-slate-200/70 text-[10px] text-slate-700 min-w-[50px] h-full cursor-pointer transition-colors",
                      s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    title="Cor de Fundo"
                  >
                    <div 
                      className="size-5 rounded border border-slate-250 dark:border-slate-800 shadow-xs" 
                      style={{ background: (currentStyle.background as string) ?? "transparent" }}
                    />
                    <span className="leading-none text-[9px] font-medium text-slate-500">Fundo</span>
                  </button>
                </ColorPickerPopover>
              </Group>

              <Group title="Bordas & Espaçamentos">
                <div className="flex flex-col justify-center gap-1 px-1 min-w-[100px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-medium text-slate-500 w-10">Borda:</span>
                    <select
                      disabled={s.selectedIds.length === 0}
                      value={String(currentStyle.borderWidth ?? "0px")}
                      onChange={(e) => handleStyleChange({ 
                        borderWidth: e.target.value, 
                        borderStyle: e.target.value !== "0px" ? "solid" : "none",
                        borderColor: currentStyle.borderColor ?? "#cbd5e1"
                      })}
                      className="h-[18px] text-[9px] px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded outline-none cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      <option value="0px">Sem Borda</option>
                      <option value="1px">1 px</option>
                      <option value="2px">2 px</option>
                      <option value="3px">3 px</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-medium text-slate-500 w-10">Canto:</span>
                    <select
                      disabled={s.selectedIds.length === 0}
                      value={String(currentStyle.borderRadius ?? "0px")}
                      onChange={(e) => handleStyleChange({ borderRadius: e.target.value })}
                      className="h-[18px] text-[9px] px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded outline-none cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      <option value="0px">Reto (0px)</option>
                      <option value="4px">Suave (4px)</option>
                      <option value="8px">Médio (8px)</option>
                      <option value="12px">Forte (12px)</option>
                      <option value="9999px">Redondo</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-1 px-1 border-l border-slate-200 dark:border-slate-850 pl-2 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-medium text-slate-500 w-11">Padding:</span>
                    <select
                      disabled={s.selectedIds.length === 0}
                      value={String(currentStyle.padding ?? "0px")}
                      onChange={(e) => handleStyleChange({ padding: e.target.value })}
                      className="h-[18px] text-[9px] px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded outline-none cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      <option value="0px">Sem padding</option>
                      <option value="4px">4 px</option>
                      <option value="8px">8 px</option>
                      <option value="12px">12 px</option>
                      <option value="16px">16 px</option>
                      <option value="20px">20 px</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-medium text-slate-500 w-11">Cor Borda:</span>
                    <ColorPickerPopover
                      value={currentStyle.borderColor as string}
                      onChange={(borderColor) => handleStyleChange({ borderColor })}
                      title="Cor da Borda"
                      align="start"
                    >
                      <button
                        disabled={s.selectedIds.length === 0}
                        className={cn(
                          "h-[18px] text-[9px] px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-350 transition-colors",
                          s.selectedIds.length === 0 && "opacity-40 cursor-not-allowed"
                        )}
                        title="Cor da Borda"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-slate-250 dark:border-slate-800 shrink-0" 
                          style={{ background: (currentStyle.borderColor as string) ?? "#cbd5e1" }}
                        />
                        <span className="truncate">Cor</span>
                      </button>
                    </ColorPickerPopover>
                  </div>
                </div>
              </Group>
            </>
          );
        })()}

        {tab === "dados" && (
          <>
            <Group title="Modo">
              <RibbonButton
                icon={Pencil}
                label="Esqueleto"
                active={s.mode === "skeleton"}
                onClick={() => s.setMode("skeleton")}
              />
              <RibbonButton
                icon={Eye}
                label="Preview"
                active={s.mode === "preview"}
                onClick={() => s.setMode("preview")}
              />
            </Group>
            <Group title="Medidas">
              <RibbonButton
                icon={Calculator}
                label="Medidas"
                active={s.leftPanelTab === "pipeline"}
                onClick={() => s.setLeftPanelTab("pipeline")}
              />
              <RibbonButton
                icon={Sparkles}
                label="Assistente"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("rd:open-wizard-measure"));
                }}
              />
              <RibbonButton
                icon={Plus}
                label="Nova Medida"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("rd:open-new-measure"));
                }}
              />
            </Group>
            <Group title="Console">
              <RibbonButton
                icon={Terminal}
                label="Abrir console"
                active={s.consoleOpen}
                onClick={s.toggleConsole}
              />
            </Group>
          </>
        )}

        {tab === "ver" && (
          <>
            <Group title="Zoom">
              <RibbonButton
                icon={ZoomIn}
                label="+"
                onClick={() =>
                  s.setViewport({ zoom: Math.min(4, s.viewport.zoom * 1.2) })
                }
              />
              <RibbonButton
                icon={ZoomOut}
                label="-"
                onClick={() =>
                  s.setViewport({ zoom: Math.max(0.1, s.viewport.zoom / 1.2) })
                }
              />
              <RibbonButton
                icon={Maximize2}
                label="100%"
                onClick={() => s.setViewport({ zoom: 1 })}
              />
            </Group>
            <Group title="Guias">
              <RibbonButton
                icon={Grid3x3}
                label="Grid"
                active={s.showGrid}
                onClick={s.toggleGrid}
              />
              <RibbonButton
                icon={Magnet}
                label="Snap"
                active={s.snap}
                onClick={s.toggleSnap}
              />
            </Group>
            <Group title="Painéis">
              <RibbonButton
                icon={Maximize2}
                label="Propriedades"
                active={s.rightPanelOpen ?? true}
                onClick={() => s.setRightPanelOpen(!(s.rightPanelOpen ?? true))}
              />
            </Group>
            <Group title="Saída">
              <RibbonButton
                icon={Eye}
                label="Visualizar"
                onClick={() => window.dispatchEvent(new CustomEvent("rd:open-preview"))}
              />
              <RibbonButton
                icon={Printer}
                label="Imprimir/PDF"
                onClick={() => window.dispatchEvent(new CustomEvent("rd:print"))}
              />
              <RibbonButton
                icon={Code2}
                label="HTML/XML"
                onClick={() => window.dispatchEvent(new CustomEvent("rd:open-html-inspector"))}
              />
            </Group>
          </>
        )}
      </div>
    </div>
  );
}
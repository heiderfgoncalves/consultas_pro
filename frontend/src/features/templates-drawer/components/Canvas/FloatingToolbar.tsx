import { useEffect, useState, useRef, type RefObject } from "react";
import { useEditorStore } from "../../store/editor.store";
import { useIsolatedEditorStore } from "../../store/isolated-editor.store";
import type { TemplateElement } from "../../schema/template";
import { ColorPickerPopover } from "../ColorPickerPopover";
import { IconPicker } from "../IconPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  MoreHorizontal,
  Type as TypeIcon,
  Palette,
  ImageIcon,
  Link as LinkIcon,
  Code2,
  Square,
  Minus,
  List as ListIcon,
  Hash,
  Maximize,
  Star,
  Droplets,
  Sliders,
  Group,
  Ungroup,
  GripVertical,
} from "lucide-react";
import { ElementInspectorPopover } from "../RightInspector";
import { cn } from "@/lib/utils";

type Props = {
  containerRef?: RefObject<HTMLDivElement | null>;
  isIsolated?: boolean;
  staticLayout?: boolean;
  viewport?: { x: number; y: number; zoom: number };
};

export function FloatingToolbar({ containerRef, isIsolated = false, staticLayout = false, viewport: viewportProp }: Props) {
  const selectedIds = isIsolated
    ? useIsolatedEditorStore((s) => s.selectedIds)
    : useEditorStore((s) => s.selectedIds);
  const elements = isIsolated
    ? useIsolatedEditorStore((s) => s.elementTree)
    : useEditorStore((s) => s.template.elements);
  const storeViewport = useEditorStore((s) => s.viewport);
  const viewport = viewportProp ?? (isIsolated ? { x: 0, y: 0, zoom: 1 } : storeViewport);
  const updateStyle = isIsolated
    ? useIsolatedEditorStore((s) => s.updateElementStyle)
    : useEditorStore((s) => s.updateElementStyle);
  const updateElement = isIsolated
    ? useIsolatedEditorStore((s) => s.updateElement)
    : useEditorStore((s) => s.updateElement);
  const removeElements = isIsolated
    ? useIsolatedEditorStore((s) => s.removeElements)
    : useEditorStore((s) => s.removeElements);
  const duplicate = isIsolated
    ? useIsolatedEditorStore((s) => s.duplicateElements)
    : useEditorStore((s) => s.duplicateElements);
  const bringForward = isIsolated
    ? () => {}
    : useEditorStore((s) => s.bringForward);
  const sendBackward = isIsolated
    ? () => {}
    : useEditorStore((s) => s.sendBackward);
  const pushHistory = isIsolated
    ? () => {}
    : useEditorStore((s) => s.pushHistory);
  const groupSelectedElements = isIsolated
    ? () => {}
    : useEditorStore((s) => s.groupSelectedElements);
  const ungroupSelectedElements = isIsolated
    ? () => {}
    : useEditorStore((s) => s.ungroupSelectedElements);

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isPinned, setIsPinned] = useState(false);
  const [pinnedPos, setPinnedPos] = useState<{ x: number; y: number; flipBelow: boolean } | null>(null);

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbarSize, setToolbarSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!toolbarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setToolbarSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(toolbarRef.current);
    return () => observer.disconnect();
  }, [selectedIds]);

  const isPinnedRef = useRef(isPinned);
  isPinnedRef.current = isPinned;
  const pinnedPosRef = useRef(pinnedPos);
  pinnedPosRef.current = pinnedPos;
  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;

  useEffect(() => {
    // Ao selecionar outro elemento, reseta o arrasto para a toolbar "Fixar" novamente,
    // a menos que ela esteja fixada (pinada).
    if (!isPinned) {
      setDragOffset(null);
    }
  }, [selectedIds, isPinned]);

  useEffect(() => {
    if (staticLayout || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setDragOffset({ x: dx, y: dy });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (isPinnedRef.current && pinnedPosRef.current && dragOffsetRef.current) {
        const finalX = pinnedPosRef.current.x + dragOffsetRef.current.x;
        const finalY = pinnedPosRef.current.y + dragOffsetRef.current.y;
        setPinnedPos({ x: finalX, y: finalY, flipBelow: pinnedPosRef.current.flipBelow });
        setDragOffset(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, staticLayout]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (dragOffset?.x ?? 0),
      y: e.clientY - (dragOffset?.y ?? 0),
    });
  };

  const handleDoubleClickGrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPinned((prev) => {
      const next = !prev;
      if (next) {
        setPinnedPos({ x: posX, y: posY, flipBelow });
      } else {
        setPinnedPos(null);
        setDragOffset(null);
      }
      return next;
    });
  };

  const [, force] = useState(0);
  useEffect(() => {
    if (staticLayout) return;
    // Reposition on scroll/resize ticks and canvas physical interactions
    const tick = () => force((n) => n + 1);
    window.addEventListener("resize", tick);
    window.addEventListener("rd:canvas-interaction", tick);
    return () => {
      window.removeEventListener("resize", tick);
      window.removeEventListener("rd:canvas-interaction", tick);
    };
  }, [staticLayout]);

  if (selectedIds.length === 0) return null;
  const selected = elements.filter((e) => selectedIds.includes(e.id));
  if (selected.length === 0) return null;

  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  let posX = 0, posY = 0;
  let flipBelow = false;

  if (!staticLayout) {
    if (isPinned && pinnedPos) {
      posX = pinnedPos.x + (dragOffset?.x ?? 0);
      posY = pinnedPos.y + (dragOffset?.y ?? 0);
      flipBelow = pinnedPos.flipBelow;
    } else {
      // Bounding box in world space using physical DOM elements style inside current container
      const domPositions = selected.map((e) => {
        const container = containerRef?.current;
        const elDom = container
          ? (container.querySelector(`[data-element-id="${e.id}"]`) as HTMLElement | null)
          : (document.querySelector(`[data-element-id="${e.id}"]`) as HTMLElement | null);
        if (elDom) {
          const left = elDom.style.left ? parseFloat(elDom.style.left) : e.x;
          const top = elDom.style.top ? parseFloat(elDom.style.top) : e.y;
          const width = elDom.style.width ? parseFloat(elDom.style.width) : e.width;
          const height = elDom.style.height ? parseFloat(elDom.style.height) : e.height;
          return { x: left, y: top, width, height };
        }
        return { x: e.x, y: e.y, width: e.width, height: e.height };
      });

      minX = Math.min(...domPositions.map((pos) => pos.x));
      minY = Math.min(...domPositions.map((pos) => pos.y));
      maxX = Math.max(...domPositions.map((pos) => pos.x + pos.width));
      maxY = Math.max(...domPositions.map((pos) => pos.y + pos.height));

      // Convert to screen space
      if (containerRef) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const screenX = viewport.x + ((minX + maxX) / 2) * viewport.zoom;
          const screenY = viewport.y + minY * viewport.zoom - 12;
          flipBelow = screenY < 56;

          posX = screenX + (dragOffset?.x ?? 0);
          posY = (flipBelow
            ? viewport.y + maxY * viewport.zoom + 12
            : screenY) + (dragOffset?.y ?? 0);
        }
      }
    }

    // Limitar posicionamento para não sair da tela (respeitando o recuo das bordas)
    if (containerRef && containerRef.current && toolbarSize.width > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      
      const margin = 12; // Recuo da borda da tela
      const halfWidth = toolbarSize.width / 2;
      
      // Limite horizontal
      const minPosX = halfWidth + margin;
      const maxPosX = containerWidth - halfWidth - margin;
      if (toolbarSize.width + margin * 2 > containerWidth) {
        posX = containerWidth / 2;
      } else {
        posX = Math.max(minPosX, Math.min(maxPosX, posX));
      }
      
      // Limite vertical
      const toolbarHeight = toolbarSize.height || 40;
      let minPosY = margin;
      let maxPosY = containerHeight - margin;
      
      if (flipBelow) {
        minPosY = margin;
        maxPosY = containerHeight - toolbarHeight - margin;
      } else {
        minPosY = toolbarHeight + margin;
        maxPosY = containerHeight - margin;
      }
      
      posY = Math.max(minPosY, Math.min(maxPosY, posY));
    }
  }

  const types = new Set(selected.map((e) => e.type));
  const single = selected.length === 1 ? selected[0] : null;
  const allOfType = types.size === 1 ? selected[0].type : null;

  const toolbarContent = (
    <div className={cn(
      "flex items-center gap-0.5 text-xs text-slate-700 dark:text-slate-200",
      staticLayout
        ? "flex-wrap p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 w-full"
        : "px-1.5 py-1 rounded-lg bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xl"
    )}>
      {/* Alça de Arrastar (Drag Handle) - Somente se não for layout estático */}
      {!staticLayout && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClickGrip}
          className={cn(
            "p-1 -ml-0.5 mr-0.5 rounded cursor-grab active:cursor-grabbing transition-all shrink-0 flex items-center justify-center select-none",
            isPinned
              ? "text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-500/15"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800"
          )}
          title={isPinned
            ? "Fixada na tela (Duplo clique para voltar a acompanhar os elementos)"
            : "Arrastar barra de ferramentas (Duplo clique para fixar nesta posição)"
          }
        >
          <GripVertical className="size-3.5" />
        </div>
      )}

      {/* Type-specific groups */}
      {allOfType === "text" && (
        <TextGroup
          el={single ?? selected[0]}
          updateStyle={updateStyle}
          multi={selected.length > 1}
        />
      )}
      {allOfType === "image" && single && (
        <ImageGroup el={single} updateElement={updateElement} pushHistory={pushHistory} />
      )}
      {(allOfType === "card" || allOfType === "container") && single && (
        <ShapeGroup el={single} updateStyle={updateStyle} side={flipBelow ? "bottom" : "top"} />
      )}
      {allOfType === "divider" && single && (
        <DividerGroup el={single} updateStyle={updateStyle} />
      )}
      {allOfType === "list" && single && (
        <ListGroup el={single} updateElement={updateElement} pushHistory={pushHistory} />
      )}
      {allOfType === "icon" && single && (
        <IconGroup el={single} updateElement={updateElement} pushHistory={pushHistory} side={flipBelow ? "bottom" : "top"} />
      )}
      {allOfType === "table" && (
        <span className="px-2 text-slate-550 dark:text-slate-450 flex items-center gap-1">
          <Code2 className="size-3.5" /> Tabela — edite no painel direito
        </span>
      )}

      <Divider />

      {/* Universal color pickers (text + background) */}
      <ColorPickerPopover
        value={selected[0].style.color}
        onChange={(c) => selected.forEach((e) => updateStyle(e.id, { color: c }))}
        title="Cor do texto / contorno"
        side={flipBelow ? "bottom" : "top"}
      >
        <button title="Cor do Texto" className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 relative group transition-all">
          <TypeIcon className="size-3.5 text-slate-700 dark:text-slate-200 group-hover:scale-105" />
          <span
            className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full"
            style={{
              background: selected[0].style.color ?? "currentColor",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.15) inset"
            }}
          />
        </button>
      </ColorPickerPopover>

      <ColorPickerPopover
        value={selected[0].style.background}
        onChange={(c) => selected.forEach((e) => updateStyle(e.id, { background: c }))}
        title="Cor de fundo"
        side={flipBelow ? "bottom" : "top"}
      >
        <button title="Fundo" className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 relative group transition-all">
          <Palette
            className="size-3.5 text-slate-550 dark:text-slate-400 group-hover:scale-105 transition-transform"
          />
          {selected[0].style.background && selected[0].style.background !== "transparent" ? (
            <span
              className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-sm"
              style={{
                background: selected[0].style.background,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.2) inset"
              }}
            />
          ) : selected[0].style.background === "transparent" ? (
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border border-dashed border-red-500 rounded-full" title="Transparente" />
          ) : null}
        </button>
      </ColorPickerPopover>
      <Divider />

      {/* Common tail */}
      {(() => {
        const isAnyLocked = selected.some((e) => e.locked);
        return (
          <IconBtn
            title={isAnyLocked ? "Desbloquear" : "Bloquear"}
            onClick={() =>
              selected.forEach((e) =>
                updateElement(e.id, { locked: !isAnyLocked }),
              )
            }
          >
            {isAnyLocked ? (
              <Lock className="size-3.5 text-red-500 fill-red-500/10 animate-pulse" />
            ) : (
              <Unlock className="size-3.5 text-slate-400" />
            )}
          </IconBtn>
        );
      })()}
      <IconBtn
        title={single?.visible === false ? "Mostrar" : "Ocultar"}
        onClick={() =>
          selected.forEach((e) =>
            updateElement(e.id, {
              visible: e.visible === false ? true : false,
            }),
          )
        }
      >
        {single?.visible === false ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
      </IconBtn>
      {!isIsolated && (
        <IconBtn title="Trazer para frente (])" onClick={() => bringForward(selectedIds)}>
          <Layers className="size-3.5" />
        </IconBtn>
      )}
      <IconBtn title="Duplicar (Ctrl+D)" onClick={() => duplicate(selectedIds)}>
        <Copy className="size-3.5" />
      </IconBtn>
      {!isIsolated && selectedIds.length > 1 && (
        <IconBtn title="Agrupar elementos" onClick={groupSelectedElements}>
          <Group className="size-3.5 text-indigo-600" />
        </IconBtn>
      )}
      {!isIsolated && selected.some((e) => e.groupId) && (
        <IconBtn title="Desagrupar elementos" onClick={ungroupSelectedElements}>
          <Ungroup className="size-3.5 text-amber-600" />
        </IconBtn>
      )}
      {!isIsolated && (
        <>
          <IconBtn
            title="Editar isoladamente"
            onClick={() => window.dispatchEvent(new CustomEvent("rd:open-isolated"))}
          >
            <Maximize className="size-3.5" />
          </IconBtn>
          <IconBtn
            title="Inspecionar HTML/XML"
            onClick={() => window.dispatchEvent(new CustomEvent("rd:open-html-inspector"))}
          >
            <Code2 className="size-3.5" />
          </IconBtn>
          <ElementInspectorPopover element={single ?? selected[0]} side={flipBelow ? "bottom" : "top"}>
            <button
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-700 transition-colors"
              title="Propriedades do Elemento"
            >
              <Sliders className="size-3.5" />
            </button>
          </ElementInspectorPopover>
        </>
      )}
      <IconBtn
        title="Excluir (Del)"
        onClick={() => removeElements(selectedIds)}
      >
        <Trash2 className="size-3.5 text-red-500" />
      </IconBtn>
    </div>
  );

  if (staticLayout) {
    return (
      <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-200">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            Formatação Rápida
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-500/10">
            {selected.length > 1
              ? `${selected.length} Itens`
              : `${typeLabel(selected[0].type)}${selected[0].name ? " · " + selected[0].name : ""}`}
          </span>
        </div>
        {toolbarContent}
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 pointer-events-auto select-none"
      style={{
        left: posX,
        top: posY,
        transform: `translate(-50%, ${flipBelow ? 0 : -100}%)`,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {toolbarContent}
      {/* Label */}
      <div className="mt-1 text-[10px] text-slate-500 text-center">
        {selected.length > 1
          ? `${selected.length} elementos`
          : `${typeLabel(selected[0].type)}${selected[0].name ? " · " + selected[0].name : ""}`}
      </div>
    </div>
  );
}

function typeLabel(t: TemplateElement["type"]) {
  return {
    text: "Texto",
    image: "Imagem",
    card: "Card",
    container: "Container",
    divider: "Divisor",
    table: "Tabela",
    list: "Lista",
    icon: "Ícone",
  }[t];
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={
        "h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 " +
        (active ? "bg-slate-100 text-slate-900" : "")
      }
    >
      {children}
    </button>
  );
  if (!title) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-[10px]">{title}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}

function TextGroup({
  el,
  updateStyle,
  multi,
}: {
  el: TemplateElement;
  updateStyle: (id: string, patch: Partial<TemplateElement["style"]>) => void;
  multi: boolean;
}) {
  const s = el.style;
  return (
    <>
      <span className="px-1.5 flex items-center gap-1 text-slate-500">
        <TypeIcon className="size-3.5" />
      </span>
      {!multi && (
        <input
          type="number"
          min={8}
          max={120}
          value={s.fontSize ?? 14}
          onChange={(e) =>
            updateStyle(el.id, { fontSize: Number(e.target.value) })
          }
          className="w-12 h-6 px-1 border rounded text-center"
        />
      )}
      <IconBtn
        title="Negrito"
        active={(s.fontWeight ?? 400) >= 600}
        onClick={() =>
          updateStyle(el.id, {
            fontWeight: (s.fontWeight ?? 400) >= 600 ? 400 : 700,
          })
        }
      >
        <Bold className="size-3.5" />
      </IconBtn>
      <IconBtn title="Itálico (visual)">
        <Italic className="size-3.5 opacity-50" />
      </IconBtn>
      <IconBtn title="Sublinhado (visual)">
        <Underline className="size-3.5 opacity-50" />
      </IconBtn>
      <Divider />
      <IconBtn
        title="Esquerda"
        active={s.textAlign === "left"}
        onClick={() => updateStyle(el.id, { textAlign: "left" })}
      >
        <AlignLeft className="size-3.5" />
      </IconBtn>
      <IconBtn
        title="Centro"
        active={s.textAlign === "center"}
        onClick={() => updateStyle(el.id, { textAlign: "center" })}
      >
        <AlignCenter className="size-3.5" />
      </IconBtn>
      <IconBtn
        title="Direita"
        active={s.textAlign === "right"}
        onClick={() => updateStyle(el.id, { textAlign: "right" })}
      >
        <AlignRight className="size-3.5" />
      </IconBtn>
    </>
  );
}

function ImageGroup({
  el,
  updateElement,
  pushHistory,
}: {
  el: TemplateElement;
  updateElement: (id: string, patch: Partial<TemplateElement>) => void;
  pushHistory: () => void;
}) {
  function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        pushHistory();
        updateElement(el.id, {
          data: { ...(el.data ?? {}), src: String(reader.result) },
        });
      };
      reader.readAsDataURL(f);
    };
    input.click();
  }
  return (
    <>
      <button
        onClick={pick}
        className="h-7 px-2 flex items-center gap-1 rounded hover:bg-slate-100"
      >
        <ImageIcon className="size-3.5" /> Trocar imagem
      </button>
    </>
  );
}

function ShapeGroup({
  el,
  updateStyle,
  side = "top",
}: {
  el: TemplateElement;
  updateStyle: (id: string, patch: Partial<TemplateElement["style"]>) => void;
  side?: "top" | "bottom";
}) {
  const s = el.style;
  return (
    <>
      <ColorPickerPopover
        value={s.borderColor}
        onChange={(c) => updateStyle(el.id, { borderColor: c, borderWidth: s.borderWidth || 1 })}
        title="Cor da borda"
        side={side}
      >
        <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100" title="Borda">
        <span className="inline-block w-3 h-3 border-2 rounded" style={{ borderColor: s.borderColor ?? "#cbd5e1" }} />
        </button>
      </ColorPickerPopover>
      <input
        type="number"
        min={0}
        max={48}
        value={s.borderRadius ?? 0}
        onChange={(e) =>
          updateStyle(el.id, { borderRadius: Number(e.target.value) })
        }
        title="Raio"
        className="w-12 h-6 px-1 border rounded text-center"
      />
    </>
  );
}

function DividerGroup({
  el,
  updateStyle,
}: {
  el: TemplateElement;
  updateStyle: (id: string, patch: Partial<TemplateElement["style"]>) => void;
}) {
  const s = el.style;
  return (
    <>
      <Minus className="size-3.5 text-slate-400 mx-1" />
    </>
  );
}

function ListGroup({
  el,
  updateElement,
  pushHistory,
}: {
  el: TemplateElement;
  updateElement: (id: string, patch: Partial<TemplateElement>) => void;
  pushHistory: () => void;
}) {
  const data = (el.data ?? {}) as { items?: string[]; style?: string };
  const style = data.style ?? "bullet";
  const setStyle = (v: string) => {
    pushHistory();
    updateElement(el.id, { data: { ...(el.data ?? {}), style: v } });
  };
  const setItems = (items: string[]) =>
    updateElement(el.id, { data: { ...(el.data ?? {}), items } });
  return (
    <>
      <ListIcon className="size-3.5 text-slate-500 mx-1" />
      {(["bullet", "number", "dash", "check"] as const).map((s) => (
        <IconBtn key={s} title={`Estilo: ${s}`} active={style === s} onClick={() => setStyle(s)}>
          <span className="text-[10px] font-mono">
            {s === "bullet" ? "•" : s === "number" ? "1." : s === "dash" ? "—" : "☑"}
          </span>
        </IconBtn>
      ))}
      <Divider />
      <IconBtn
        title="Adicionar item"
        onClick={() => {
          pushHistory();
          setItems([...(data.items ?? []), "Novo item"]);
        }}
      >
        <span className="text-[12px] leading-none">+</span>
      </IconBtn>
      <IconBtn
        title="Remover último item"
        onClick={() => {
          pushHistory();
          setItems((data.items ?? []).slice(0, -1));
        }}
      >
        <span className="text-[12px] leading-none">−</span>
      </IconBtn>
    </>
  );
}

function IconGroup({
  el,
  updateElement,
  pushHistory,
  side = "top",
}: {
  el: TemplateElement;
  updateElement: (id: string, patch: Partial<TemplateElement>) => void;
  pushHistory: () => void;
  side?: "top" | "bottom";
}) {
  const data = (el.data ?? {}) as { name?: string; strokeWidth?: number };
  return (
    <>
      <IconPicker
        value={data.name}
        onPick={(name) => {
          pushHistory();
          updateElement(el.id, { data: { ...(el.data ?? {}), name } });
        }}
        side={side}
      >
        <button className="h-7 px-2 flex items-center gap-1 rounded hover:bg-slate-100" title="Trocar ícone">
          <Star className="size-3.5" /> {data.name ?? "Ícone"}
        </button>
      </IconPicker>
      <Divider />
      <span className="text-[10px] text-slate-500">Stroke</span>
      <input
        type="number"
        min={0.5}
        max={4}
        step={0.5}
        value={data.strokeWidth ?? 2}
        onChange={(e) =>
          updateElement(el.id, {
            data: { ...(el.data ?? {}), strokeWidth: Number(e.target.value) },
          })
        }
        className="w-12 h-6 px-1 border rounded text-center"
      />
    </>
  );
}
import { useEditorStore } from "../../store/editor.store";
import { useIsolatedEditorStore } from "../../store/isolated-editor.store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Lock, Unlock, Eye, EyeOff, Star, Maximize, Trash2, Pencil, Code2 } from "lucide-react";

type Props = {
  containerRect: DOMRect | null;
  isIsolated?: boolean;
  viewport?: { x: number; y: number; zoom: number };
};

export function HoverActions({ containerRect, isIsolated = false, viewport: viewportProp }: Props) {
  const storeViewport = useEditorStore((s) => s.viewport);
  const viewport = viewportProp ?? storeViewport;

  const hoveredId = isIsolated
    ? useIsolatedEditorStore((s) => s.hoveredId)
    : useEditorStore((s) => s.hoveredId);
  const selectedIds = isIsolated
    ? useIsolatedEditorStore((s) => s.selectedIds)
    : useEditorStore((s) => s.selectedIds);
  const elements = isIsolated
    ? useIsolatedEditorStore((s) => s.elementTree)
    : useEditorStore((s) => s.template.elements);

  const duplicate = isIsolated
    ? useIsolatedEditorStore((s) => s.duplicateElements)
    : useEditorStore((s) => s.duplicateElements);
  const remove = isIsolated
    ? useIsolatedEditorStore((s) => s.removeElements)
    : useEditorStore((s) => s.removeElements);
  const updateElement = isIsolated
    ? useIsolatedEditorStore((s) => s.updateElement)
    : useEditorStore((s) => s.updateElement);
  const setSelected = isIsolated
    ? useIsolatedEditorStore((s) => s.setSelectedIds)
    : useEditorStore((s) => s.setSelected);
  const setHovered = isIsolated
    ? useIsolatedEditorStore((s) => s.setHovered)
    : useEditorStore((s) => s.setHovered);

  if (!hoveredId || !containerRect) return null;
  if (selectedIds.includes(hoveredId)) return null; // FloatingToolbar handles selected
  const el = elements.find((e) => e.id === hoveredId);
  if (!el) return null;

  const leftX_screen = viewport.x + el.x * viewport.zoom;
  const rightX_screen = viewport.x + (el.x + el.width) * viewport.zoom;
  const topY_screen = viewport.y + el.y * viewport.zoom;
  const bottomY_screen = viewport.y + (el.y + el.height) * viewport.zoom;
  const centerX_screen = viewport.x + (el.x + el.width / 2) * viewport.zoom;

  return (
    <>
      {/* 1. Tipo e Proporções (Canto superior direito) */}
      <div
        className="absolute z-40 pointer-events-auto select-none"
        style={{
          left: rightX_screen,
          top: topY_screen - 6,
          transform: "translate(-100%, -100%)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setHovered(hoveredId)}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="text-[10px] font-medium text-slate-300 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded shadow backdrop-blur">
          {typeLabel(el.type)} · {Math.round(el.width)}×{Math.round(el.height)}
        </div>
      </div>

      {/* 2. ID sutil (Canto inferior esquerdo, meio apagado, acende com hover) */}
      <div
        className="absolute z-40 pointer-events-auto select-none opacity-40 hover:opacity-100 transition-opacity duration-150"
        style={{
          left: leftX_screen,
          top: bottomY_screen + 6,
          transform: "translate(0, 0)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setHovered(hoveredId)}
        onMouseLeave={() => setHovered(null)}
      >
        <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 bg-slate-900/90 border border-indigo-500/30 px-1.5 py-0.5 rounded shadow-md backdrop-blur">
          #{el.id}
        </span>
      </div>

      {/* 3. Hotbar de ações (Centralizado em baixo, flutuando) */}
      <div
        className="absolute z-40 pointer-events-auto"
        style={{
          left: centerX_screen,
          top: bottomY_screen + 6,
          transform: "translate(-50%, 0)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setHovered(hoveredId)}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-slate-900/95 text-white shadow-lg text-xs backdrop-blur border border-slate-800">
          <HBtn
            label="Selecionar"
            onClick={() => setSelected([el.id])}
          >
            <Pencil className="size-3 text-indigo-400" />
          </HBtn>
          <HBtn label="Duplicar" onClick={() => duplicate([el.id])}>
            <Copy className="size-3" />
          </HBtn>
          <HBtn
            label={el.locked ? "Desbloquear" : "Bloquear"}
            onClick={() => updateElement(el.id, { locked: !el.locked })}
          >
            {el.locked ? (
              <Lock className="size-3 text-red-400 animate-pulse" />
            ) : (
              <Unlock className="size-3 text-emerald-400" />
            )}
          </HBtn>
          <HBtn
            label={el.visible === false ? "Mostrar" : "Ocultar"}
            onClick={() =>
              updateElement(el.id, { visible: el.visible === false ? true : false })
            }
          >
            {el.visible === false ? <EyeOff className="size-3 text-amber-400" /> : <Eye className="size-3" />}
          </HBtn>
          {!isIsolated && (
            <>
              <HBtn
                label="Salvar como componente"
                onClick={() => {
                  setSelected([el.id]);
                  setTimeout(
                    () => window.dispatchEvent(new CustomEvent("rd:open-save-component")),
                    0,
                  );
                }}
              >
                <Star className="size-3" />
              </HBtn>
              <HBtn
                label="Editar isoladamente"
                onClick={() => {
                  setSelected([el.id]);
                  setTimeout(
                    () => window.dispatchEvent(new CustomEvent("rd:open-isolated")),
                    0,
                  );
                }}
              >
                <Maximize className="size-3" />
              </HBtn>
              <HBtn
                label="Editar código"
                onClick={() => {
                  setSelected([el.id]);
                  setTimeout(
                    () => window.dispatchEvent(new CustomEvent("rd:open-html-inspector")),
                    0,
                  );
                }}
              >
                <Code2 className="size-3" />
              </HBtn>
            </>
          )}
          <HBtn label="Excluir" onClick={() => remove([el.id])} danger>
            <Trash2 className="size-3" />
          </HBtn>
        </div>
      </div>
    </>
  );
}

function HBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={
            "h-6 w-6 inline-flex items-center justify-center rounded hover:bg-white/15 " +
            (danger ? "text-red-300 hover:text-red-200" : "")
          }
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px]">{label}</TooltipContent>
    </Tooltip>
  );
}

function typeLabel(t: string) {
  return (
    {
      text: "Texto",
      image: "Imagem",
      card: "Card",
      container: "Container",
      divider: "Divisor",
      table: "Tabela",
      list: "Lista",
      icon: "Ícone",
    } as Record<string, string>
  )[t] ?? t;
}
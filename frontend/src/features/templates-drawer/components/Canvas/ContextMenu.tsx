import { useEffect, useRef } from "react";
import { useEditorStore } from "../../store/editor.store";
import { useIsolatedEditorStore } from "../../store/isolated-editor.store";
import { confirmDialog } from "../dialogs/ConfirmDialog";
import { toast } from "sonner";
import type { ElementType } from "../../schema/template";
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Lock,
  EyeOff,
  Save,
  Code2,
  Plus,
  FileText,
  Image as ImageIcon,
  Square,
  List as ListIcon,
  Star,
  Minus,
  Table as TableIcon,
  Layers,
  Maximize,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

type Kind = "element" | "frame" | "canvas";
type Props = {
  x: number;
  y: number;
  kind?: Kind;
  targetId?: string;
  isIsolated?: boolean;
  onClose: () => void;
};

export function ContextMenu({ x, y, kind = "element", targetId, isIsolated = false, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Seleção de Stores Condicional de acordo com isIsolated
  const mainSelectedIds = useEditorStore((s) => s.selectedIds);
  const mainElements = useEditorStore((s) => s.template.elements);
  
  const isolatedSelectedIds = useIsolatedEditorStore((s) => s.selectedIds);
  const isolatedElements = useIsolatedEditorStore((s) => s.elementTree);

  const selectedIds = isIsolated ? isolatedSelectedIds : mainSelectedIds;
  const elements = isIsolated ? isolatedElements : mainElements;

  const frames = useEditorStore((s) => s.template.frames);
  const components = useEditorStore((s) => s.reusableComponents);

  const mainCopySelection = useEditorStore((s) => s.copySelection);
  const isolatedCopySelection = useIsolatedEditorStore((s) => s.copySelection);
  const copySelection = isIsolated ? isolatedCopySelection : mainCopySelection;

  const mainPasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const isolatedPasteClipboard = useIsolatedEditorStore((s) => s.pasteClipboard);
  const pasteClipboard = isIsolated ? isolatedPasteClipboard : mainPasteClipboard;

  const mainDuplicate = useEditorStore((s) => s.duplicateElements);
  const isolatedDuplicate = useIsolatedEditorStore((s) => s.duplicateElements);
  const duplicate = isIsolated ? isolatedDuplicate : mainDuplicate;

  const mainRemove = useEditorStore((s) => s.removeElements);
  const isolatedRemove = useIsolatedEditorStore((s) => s.removeElements);
  const remove = isIsolated ? isolatedRemove : mainRemove;

  const mainUpdateElement = useEditorStore((s) => s.updateElement);
  const isolatedUpdateElement = useIsolatedEditorStore((s) => s.updateElement);
  const updateElement = isIsolated ? isolatedUpdateElement : mainUpdateElement;

  const mainAddElement = useEditorStore((s) => s.addElement);
  const isolatedAddElement = useIsolatedEditorStore((s) => s.addElement);
  const addElement = isIsolated 
    ? (type: ElementType, pos: { x: number; y: number }, _frameId?: string) => isolatedAddElement(type, pos) 
    : mainAddElement;

  const mainInsertComponent = useEditorStore((s) => s.insertComponent);
  const insertComponent = isIsolated ? (() => "") : mainInsertComponent;

  // No-ops para ações não suportadas no modo isolado
  const bringForward = isIsolated ? (() => {}) : useEditorStore((s) => s.bringForward);
  const sendBackward = isIsolated ? (() => {}) : useEditorStore((s) => s.sendBackward);
  const alignSelected = isIsolated ? (() => {}) : useEditorStore((s) => s.alignSelected);
  const groupSelectedElements = isIsolated ? (() => {}) : useEditorStore((s) => s.groupSelectedElements);
  const ungroupSelectedElements = isIsolated ? (() => {}) : useEditorStore((s) => s.ungroupSelectedElements);
  
  const removeFrame = useEditorStore((s) => s.removeFrame);
  const duplicateFrame = useEditorStore((s) => s.duplicateFrame);
  const addFrame = useEditorStore((s) => s.addFrame);
  const updateFrame = useEditorStore((s) => s.updateFrame);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", down);
    return () => window.removeEventListener("mousedown", down);
  }, [onClose]);

  const single =
    selectedIds.length === 1
      ? elements.find((e) => e.id === selectedIds[0])
      : null;
  const frame = targetId ? frames.find((f) => f.id === targetId) : null;

  type Item =
    | {
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        shortcut?: string;
        onClick: () => void;
        danger?: boolean;
      }
    | "separator";

  const elementItems: Item[] = [
    { label: "Copiar", icon: Copy, shortcut: "Ctrl+C", onClick: () => { copySelection(); onClose(); } },
    { label: "Colar", icon: ClipboardPaste, shortcut: "Ctrl+V", onClick: () => { pasteClipboard(); onClose(); } },
    { label: "Duplicar", icon: CopyPlus, shortcut: "Ctrl+D", onClick: () => { duplicate(selectedIds); onClose(); } },
    "separator",
    ...(!isIsolated
      ? ([
          { label: "Trazer para frente", icon: ArrowUpToLine, shortcut: "]", onClick: () => { bringForward(selectedIds); onClose(); } },
          { label: "Enviar para trás", icon: ArrowDownToLine, shortcut: "[", onClick: () => { sendBackward(selectedIds); onClose(); } },
          "separator",
        ] as Item[])
      : []),
    ...(!isIsolated && selectedIds.length >= 2
      ? ([
          { label: "Alinhar à esquerda", icon: AlignLeft, onClick: () => { alignSelected("left"); onClose(); } },
          { label: "Centralizar horizontal", icon: AlignCenter, onClick: () => { alignSelected("h-center"); onClose(); } },
          { label: "Alinhar à direita", icon: AlignRight, onClick: () => { alignSelected("right"); onClose(); } },
          { label: "Alinhar ao topo", icon: ArrowUp, onClick: () => { alignSelected("top"); onClose(); } },
          { label: "Alinhar à base", icon: ArrowDown, onClick: () => { alignSelected("bottom"); onClose(); } },
          "separator",
        ] as Item[])
      : []),
    ...(!isIsolated && selectedIds.length >= 2
      ? ([
          { label: "Agrupar elementos", icon: Layers, onClick: () => { groupSelectedElements(); onClose(); } },
          "separator",
        ] as Item[])
      : []),
    ...(!isIsolated && selectedIds.some(id => elements.find(e => e.id === id)?.groupId)
      ? ([
          { label: "Desagrupar elementos", icon: Layers, onClick: () => { ungroupSelectedElements(); onClose(); } },
          "separator",
        ] as Item[])
      : []),
    { label: single?.locked ? "Desbloquear" : "Bloquear", icon: Lock, onClick: () => {
        selectedIds.forEach((id) => {
          const el = elements.find((x) => x.id === id);
          if (el) updateElement(id, { locked: !el.locked });
        });
        onClose();
      } },
    { label: "Ocultar / mostrar", icon: EyeOff, onClick: () => {
        selectedIds.forEach((id) => {
          const el = elements.find((x) => x.id === id);
          if (el) updateElement(id, { visible: el.visible === false ? true : false });
        });
        onClose();
      } },
    ...(!isIsolated
      ? ([
          { label: "Editar isoladamente", icon: Maximize, onClick: () => {
              window.dispatchEvent(new CustomEvent("rd:open-isolated"));
              onClose();
            } },
          { label: "Salvar como componente", icon: Save, onClick: () => {
              window.dispatchEvent(new CustomEvent("rd:open-save-component"));
              onClose();
            } },
        ] as Item[])
      : []),
    { label: "Inspecionar (HTML/XML/JSON)", icon: Code2, shortcut: "Ctrl+Shift+X", onClick: () => {
        window.dispatchEvent(new CustomEvent("rd:open-html-inspector"));
        onClose();
      } },
    "separator",
    { label: "Excluir", icon: Trash2, shortcut: "Del", danger: true, onClick: () => { remove(selectedIds); onClose(); } },
  ];

  const frameItems: Item[] = frame
    ? [
        {
          label: "Colar aqui",
          icon: ClipboardPaste,
          shortcut: "Ctrl+V",
          onClick: () => { pasteClipboard(); onClose(); },
        },
        "separator",
        { label: "Inserir texto", icon: FileText, onClick: () => { addElement("text", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir imagem", icon: ImageIcon, onClick: () => { addElement("image", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir ícone", icon: Star, onClick: () => { addElement("icon", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir lista", icon: ListIcon, onClick: () => { addElement("list", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir card", icon: Square, onClick: () => { addElement("card", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir divisor", icon: Minus, onClick: () => { addElement("divider", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        { label: "Inserir tabela", icon: TableIcon, onClick: () => { addElement("table", { x: frame.x + 24, y: frame.y + 24 }, frame.id); onClose(); } },
        "separator",
        ...(components.length > 0
          ? ([
              ...components.slice(0, 6).map((c) => ({
                label: `Inserir: ${c.name}`,
                icon: Layers,
                onClick: () => { insertComponent(c.id, { x: frame.x + 24, y: frame.y + 24 }); onClose(); },
              })),
              "separator",
            ] as Item[])
          : []),
        { label: "Renomear página", icon: FileText, onClick: () => {
            const name = prompt("Novo nome da página:", frame.name);
            if (name) updateFrame(frame.id, { name });
            onClose();
          } },
        { label: "Duplicar página", icon: CopyPlus, onClick: () => { duplicateFrame(frame.id); onClose(); } },
        { label: "Excluir página", icon: Trash2, danger: true, onClick: () => {
            confirmDialog({
              title: `Excluir página "${frame.name}"?`,
              description: "Os elementos vinculados também serão removidos.",
              destructive: true,
              confirmLabel: "Excluir",
              onConfirm: () => {
                removeFrame(frame.id);
                toast.success(`Página "${frame.name}" excluída.`);
              },
            });
            onClose();
          } },
      ]
    : [];

  const canvasItems: Item[] = isIsolated
    ? [
        { label: "Colar aqui", icon: ClipboardPaste, shortcut: "Ctrl+V", onClick: () => { pasteClipboard(); onClose(); } },
      ]
    : [
        { label: "Nova página A4 retrato", icon: Plus, onClick: () => { addFrame("a4-p"); onClose(); } },
        { label: "Nova página A4 paisagem", icon: Plus, onClick: () => { addFrame("a4-l"); onClose(); } },
        "separator",
        { label: "Colar aqui", icon: ClipboardPaste, shortcut: "Ctrl+V", onClick: () => { pasteClipboard(); onClose(); } },
      ];

  const items =
    kind === "frame" ? frameItems : kind === "canvas" ? canvasItems : elementItems;

  return (
    <div
      ref={ref}
      className="fixed z-[60] w-64 rounded-md border bg-white shadow-xl py-1 text-sm"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
        {kind === "frame" ? `Página · ${frame?.name ?? ""}` : kind === "canvas" ? "Canvas" : "Elemento"}
      </div>
      {items.map((it, i) =>
        it === "separator" ? (
          <div key={i} className="my-1 h-px bg-slate-200" />
        ) : (
          <button
            key={i}
            onClick={it.onClick}
            className={
              "w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left " +
              (it.danger ? "text-red-600" : "text-slate-700")
            }
          >
            <it.icon className="size-3.5" />
            <span className="flex-1">{it.label}</span>
            {it.shortcut && (
              <span className="text-[10px] text-slate-400">{it.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
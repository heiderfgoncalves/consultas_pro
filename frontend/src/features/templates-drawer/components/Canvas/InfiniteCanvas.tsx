import { useEffect, useRef, useState } from "react";
import Moveable from "react-moveable";
import { useEditorStore } from "../../store/editor.store";
import type { CanvasViewport } from "../../store/editor.store";
import { useIsolatedEditorStore } from "../../store/isolated-editor.store";
import { FrameView } from "./FrameView";
import { ElementView } from "./ElementView";
import { FloatingToolbar } from "./FloatingToolbar";
import { ContextMenu } from "./ContextMenu";
import { HoverActions } from "./HoverActions";
import type { ElementType } from "../../schema/template";
import { Maximize2, Sliders } from "lucide-react";

// Função utilitária para medir a altura ideal do texto usando um clone oculto para evitar flickers no elemento visível do canvas.
function measureTextHeightInClone(target: HTMLElement, width: number): number {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.width = `${width}px`;
  clone.style.height = "auto";
  clone.style.transform = "none";
  clone.style.transition = "none";
  
  document.body.appendChild(clone);
  const scrollHeight = clone.scrollHeight;
  document.body.removeChild(clone);
  
  return Math.max(12, scrollHeight);
}

export function InfiniteCanvas({ isIsolated }: { isIsolated?: boolean }) {
  // Store Principal
  const mainTemplate = useEditorStore((s) => s.template);
  const mainViewport = useEditorStore((s) => s.viewport);
  const mainSetViewport = useEditorStore((s) => s.setViewport);
  const mainSelectedIds = useEditorStore((s) => s.selectedIds);
  const mainSetSelected = useEditorStore((s) => s.setSelected);
  const mainToggleSelected = useEditorStore((s) => s.toggleSelected);
  const mainClearSelection = useEditorStore((s) => s.clearSelection);
  const mainUpdateElement = useEditorStore((s) => s.updateElement);
  const mainPushHistory = useEditorStore((s) => s.pushHistory);
  const mainAddElement = useEditorStore((s) => s.addElement);
  const mainInsertComponent = useEditorStore((s) => s.insertComponent);
  const mainShowGrid = useEditorStore((s) => s.showGrid);
  const mainSnap = useEditorStore((s) => s.snap);
  const mainRightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const mainSetRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen);

  // Store Isolada
  const isolatedStore = useIsolatedEditorStore();

  // Viewport local para o modo isolado
  const [localViewport, setLocalViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });

  // Resolução dinâmica com base no modo isolado
  const elements = isIsolated ? isolatedStore.elementTree : mainTemplate.elements;
  const frames = isIsolated ? [] : mainTemplate.frames;
  const selectedIds = isIsolated ? isolatedStore.selectedIds : mainSelectedIds;
  const viewport = isIsolated ? localViewport : mainViewport;
  const setViewport = isIsolated ? setLocalViewport : mainSetViewport;

  const setSelected = isIsolated ? isolatedStore.setSelectedIds : mainSetSelected;
  const toggleSelected = isIsolated ? isolatedStore.toggleSelectedId : mainToggleSelected;
  const clearSelection = isIsolated ? (() => isolatedStore.setSelectedIds([])) : mainClearSelection;
  const updateElement = isIsolated ? isolatedStore.updateElement : mainUpdateElement;
  const pushHistory = isIsolated ? (() => {}) : mainPushHistory;
  const addElement = isIsolated ? isolatedStore.addElement : mainAddElement;
  const insertComponent = isIsolated ? (() => "") : mainInsertComponent;

  const removeElements = isIsolated ? isolatedStore.removeElements : useEditorStore.getState().removeElements;
  const duplicateElements = isIsolated ? isolatedStore.duplicateElements : useEditorStore.getState().duplicateElements;

  const showGrid = isIsolated ? true : mainShowGrid;
  const grid = isIsolated ? 8 : (mainTemplate?.canvas?.grid ?? 8);
  const snap = isIsolated ? true : mainSnap;
  const rightPanelOpen = isIsolated ? true : mainRightPanelOpen;
  const setRightPanelOpen = isIsolated ? (() => {}) : mainSetRightPanelOpen;

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [moveableTargets, setMoveableTargets] = useState<
    (HTMLElement | SVGElement)[]
  >([]);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    kind: "element" | "frame" | "canvas";
    targetId?: string;
  } | null>(null);

  // Escuta mudanças de estado de edição para ocultar o Moveable do elemento em foco
  useEffect(() => {
    const handleEditStateChange = (ev: CustomEvent<{ elementId: string | null }>) => {
      setEditingElementId(ev.detail.elementId);
    };
    window.addEventListener("rd:edit-state-change" as any, handleEditStateChange);
    return () => window.removeEventListener("rd:edit-state-change" as any, handleEditStateChange);
  }, []);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  // Per-target resize/drag baseline (captured on start, applied to DOM during drag).
  const dragBaseRef = useRef<
    Map<
      string,
      {
        x: number;
        y: number;
        w: number;
        h: number;
        fontSize?: number;
        type: string;
      }
    >
  >(new Map());
  const dragPendingRef = useRef<
    Map<
      string,
      { x: number; y: number; w: number; h: number; fontSize?: number }
    >
  >(new Map());

  const [isInteracting, setIsInteracting] = useState(false);
  const moveableRef = useRef<any>(null);

  // Track keyboard for pan and shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(true);
      if (e.key === "Shift") setShiftHeld(true);
      const isTyping =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0 &&
        !isTyping
      ) {
        e.preventDefault();
        removeElements(selectedIds);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !isTyping) {
        e.preventDefault();
        if (!isIsolated) {
          if (e.shiftKey) useEditorStore.getState().redo();
          else useEditorStore.getState().undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !isTyping) {
        e.preventDefault();
        duplicateElements(selectedIds);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !isTyping) {
        if (!isIsolated) {
          useEditorStore.getState().copySelection();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && !isTyping) {
        if (!isIsolated) {
          e.preventDefault();
          useEditorStore.getState().pasteClipboard();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !isTyping) {
        e.preventDefault();
        if (isIsolated) {
          setSelected(elements.map((el) => el.id));
        } else {
          useEditorStore.getState().selectAllInActiveFrame();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        setViewport({ zoom: 1 });
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_")
      ) {
        e.preventDefault();
        const z = viewport.zoom;
        const dir = e.key === "-" || e.key === "_" ? 1 / 1.2 : 1.2;
        setViewport({ zoom: Math.min(4, Math.max(0.1, z * dir)) });
      }
      if (e.key === "Escape") {
        clearSelection();
        setCtxMenu(null);
      }
      if (!isTyping && e.key === "]") {
        if (!isIsolated) {
          useEditorStore.getState().bringForward(selectedIds);
        }
      }
      if (!isTyping && e.key === "[") {
        if (!isIsolated) {
          useEditorStore.getState().sendBackward(selectedIds);
        }
      }
      if (!isTyping && e.key.toLowerCase() === "p") {
        if (!isIsolated) {
          const m = useEditorStore.getState().mode;
          useEditorStore.getState().setMode(m === "skeleton" ? "preview" : "skeleton");
        }
      }
      if (!isTyping && e.key.toLowerCase() === "g") {
        if (!isIsolated) {
          useEditorStore.getState().toggleGrid();
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [selectedIds, setViewport, isIsolated, elements, setSelected, clearSelection, removeElements, duplicateElements, viewport.zoom]);

  // Non-passive wheel listener so Ctrl+wheel doesn't trigger the browser's page zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const v = viewportRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const delta = -e.deltaY * 0.0015;
        const newZoom = Math.min(4, Math.max(0.1, v.zoom * (1 + delta)));
        const ratio = newZoom / v.zoom;
        setViewport({
          zoom: newZoom,
          x: cx - (cx - v.x) * ratio,
          y: cy - (cy - v.y) * ratio,
        });
      } else if (e.shiftKey) {
        e.preventDefault();
        setViewport({ x: v.x - (e.deltaY || e.deltaX), y: v.y });
      } else {
        e.preventDefault();
        setViewport({ x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [setViewport]);

  // Recompute Moveable targets when selection changes or editing state changes
  useEffect(() => {
    const targets = selectedIds
      .filter((id) => id !== editingElementId)
      .map(
        (id) =>
          worldRef.current?.querySelector(
            `[data-element-id="${id}"]`,
          ) as HTMLElement | null,
      )
      .filter((x): x is HTMLElement => !!x);
    setMoveableTargets(targets);
  }, [selectedIds, elements, editingElementId]);

  // Escuta o evento rd:focus-element do Auditor para centralizar o elemento focado no Canvas
  useEffect(() => {
    const handleFocusElement = (e: any) => {
      const elId = e.detail?.elementId;
      if (!elId || !containerRef.current) return;
      const el = elements.find((x) => x.id === elId);
      if (!el) return;

      const rect = containerRef.current.getBoundingClientRect();
      const zoom = viewport.zoom;

      // Coordenadas centrais do elemento no espaço do mundo
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;

      // Calcular novo X e Y do viewport para colocar o elemento no centro da tela
      const nextX = rect.width / 2 - elCenterX * zoom;
      const nextY = rect.height / 2 - elCenterY * zoom;

      setViewport({
        zoom,
        x: nextX,
        y: nextY
      });
    };

    window.addEventListener("rd:focus-element" as any, handleFocusElement);
    return () => window.removeEventListener("rd:focus-element" as any, handleFocusElement);
  }, [elements, viewport.zoom, setViewport]);

  // Target changes are applied to react-moveable instantly when selected

  function fit() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (isIsolated) {
      if (elements.length === 0) return;
      const minX = Math.min(...elements.map((f) => f.x));
      const minY = Math.min(...elements.map((f) => f.y));
      const maxX = Math.max(...elements.map((f) => f.x + f.width));
      const maxY = Math.max(...elements.map((f) => f.y + f.height));
      const w = maxX - minX;
      const h = maxY - minY;
      const zoom = Math.min(
        (rect.width - 40) / w,
        (rect.height - 40) / h,
        1.5,
      );
      setViewport({
        zoom,
        x: -minX * zoom + (rect.width - w * zoom) / 2,
        y: -minY * zoom + (rect.height - h * zoom) / 2,
      });
      return;
    }
    if (mainTemplate.frames.length === 0) return;
    const minX = Math.min(...mainTemplate.frames.map((f) => f.x));
    const minY = Math.min(...mainTemplate.frames.map((f) => f.y));
    const maxX = Math.max(...mainTemplate.frames.map((f) => f.x + f.width));
    const maxY = Math.max(...mainTemplate.frames.map((f) => f.y + f.height));
    const w = maxX - minX;
    const h = maxY - minY;
    const zoom = Math.min(
      (rect.width - 120) / w,
      (rect.height - 120) / h,
      1.5,
    );
    setViewport({
      zoom,
      x: -minX * zoom + (rect.width - w * zoom) / 2,
      y: -minY * zoom + (rect.height - h * zoom) / 2,
    });
  }

  function onMouseDown(e: React.MouseEvent) {
    const isPanGesture = spaceHeld || e.button === 1;
    if (e.button === 2) return; // context menu handled separately
    if (isPanGesture) {
      e.preventDefault();
      setPanning(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startVX = viewport.x;
      const startVY = viewport.y;
      const onMove = (ev: MouseEvent) => {
        setViewport({
          x: startVX + (ev.clientX - startX),
          y: startVY + (ev.clientY - startY),
        });
      };
      const onUp = () => {
        setPanning(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }

    const target = e.target as HTMLElement;
    const isEditingTarget = !!target.closest("[contenteditable]") || target.isContentEditable;
    if (isEditingTarget) return;

    const isMoveableClick = !!target.closest('[class*="moveable-"]');
    const elDom = target.closest("[data-element-id]");

    // Drag inteligente no primeiro clique se clicado com botão esquerdo sobre um elemento
    if (elDom && !isMoveableClick && e.button === 0) {
      const id = elDom.getAttribute("data-element-id")!;
      const isAlreadySelected = selectedIds.includes(id);

      if (e.shiftKey) {
        toggleSelected(id, true);
      } else {
        if (!isAlreadySelected) {
          setSelected([id]);
        }
      }

      const startX = e.clientX;
      const startY = e.clientY;
      let dragStarted = false;

      const onMouseMove = (moveEv: MouseEvent) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        if (!dragStarted && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          dragStarted = true;
          if (moveableRef.current) {
            moveableRef.current.dragStart(moveEv);
          }
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return;
    }

    // click on empty canvas (anywhere not inside an element or moveable controls) = clear selection
    if (!elDom && !isMoveableClick) {
      const shiftHeldAtStart = e.shiftKey;
      if (!shiftHeldAtStart) {
        clearSelection();
      }
      setCtxMenu(null);

      // Inicia Drag Selection se for botão esquerdo
      if (e.button === 0) {
        const startX = e.clientX;
        const startY = e.clientY;
        const initialSelectedIds = shiftHeldAtStart ? [...selectedIds] : [];

        setSelectionBox({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
        });

        const onMove = (ev: MouseEvent) => {
          setSelectionBox((prev) => {
            if (!prev) return null;
            const next = { ...prev, currentX: ev.clientX, currentY: ev.clientY };

            const dx = Math.abs(next.startX - next.currentX);
            const dy = Math.abs(next.startY - next.currentY);

            // Só executa se arrastou mais de 4 pixels (evita cliques acidentais)
            if (dx > 4 || dy > 4) {
              const xMin = Math.min(next.startX, next.currentX);
              const xMax = Math.max(next.startX, next.currentX);
              const yMin = Math.min(next.startY, next.currentY);
              const yMax = Math.max(next.startY, next.currentY);

              const worldMin = screenToWorld(xMin, yMin);
              const worldMax = screenToWorld(xMax, yMax);

              // Encontra todos os elementos no canvas que colidem com essa caixa de mundo
              const collidingIds = elements
                .filter((el) => {
                  return (
                    el.x < worldMax.x &&
                    el.x + el.width > worldMin.x &&
                    el.y < worldMax.y &&
                    el.y + el.height > worldMin.y
                  );
                })
                .map((el) => el.id);

              let finalSelection = collidingIds;
              if (shiftHeldAtStart) {
                finalSelection = Array.from(new Set([...initialSelectedIds, ...collidingIds]));
              }
              setSelected(finalSelection);
            }
            return next;
          });
        };

        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          setSelectionBox(null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }
    }
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      const el = elements.find((x) => x.id === id);
      if (el && el.type === "text") {
        window.dispatchEvent(new CustomEvent("rd:edit-element", { detail: { elementId: id } }));
      }
    }
  }

  function onContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const el = target.closest("[data-element-id]") as HTMLElement | null;
    if (el) {
      e.preventDefault();
      const id = el.getAttribute("data-element-id")!;
      if (!selectedIds.includes(id)) setSelected([id]);
      setCtxMenu({ x: e.clientX, y: e.clientY, kind: "element", targetId: id });
      return;
    }
    // Frame vs empty canvas hit detection
    e.preventDefault();
    if (isIsolated) {
      setCtxMenu({ x: e.clientX, y: e.clientY, kind: "canvas" });
      return;
    }
    const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
    const frame = mainTemplate.frames.find(
      (f) => wx >= f.x && wy >= f.y && wx <= f.x + f.width && wy <= f.y + f.height,
    );
    if (frame) {
      setCtxMenu({ x: e.clientX, y: e.clientY, kind: "frame", targetId: frame.id });
    } else {
      setCtxMenu({ x: e.clientX, y: e.clientY, kind: "canvas" });
    }
  }

  function screenToWorld(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const vp = viewport;
    return {
      x: (clientX - rect.left - vp.x) / vp.zoom,
      y: (clientY - rect.top - vp.y) / vp.zoom,
    };
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-rd-element") as
      | ElementType
      | "";
    const compId = e.dataTransfer.getData("application/x-rd-component");
    const blockId = e.dataTransfer.getData("application/x-rd-legacy-block");
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    if (type) {
      if (isIsolated) {
        addElement(type, { x, y });
      } else {
        const frame = mainTemplate.frames.find(
          (f) => x >= f.x && y >= f.y && x <= f.x + f.width && y <= f.y + f.height,
        );
        addElement(type, { x, y }, frame?.id);
      }
    } else if (compId && !isIsolated) {
      insertComponent(compId, { x, y });
    } else if (blockId && !isIsolated) {
      const frame = mainTemplate.frames.find(
        (f) => x >= f.x && y >= f.y && x <= f.x + f.width && y <= f.y + f.height,
      );
      useEditorStore.getState().addLegacyBlock(blockId, { x, y }, frame?.id);
    }
  }

  function snapCoord(v: number) {
    return snap ? Math.round(v / grid) * grid : v;
  }

  function captureBaselines() {
    dragBaseRef.current.clear();
    dragPendingRef.current.clear();
    for (const id of selectedIds) {
      const el = elements.find((x) => x.id === id);
      if (!el) continue;
      dragBaseRef.current.set(id, {
        x: el.x,
        y: el.y,
        w: el.width,
        h: el.height,
        fontSize: el.style.fontSize,
        type: el.type,
      });
    }
  }

  function applyDomFor(id: string, target: HTMLElement | SVGElement) {
    const p = dragPendingRef.current.get(id);
    if (!p) return;
    const t = target as HTMLElement;
    t.style.left = `${p.x}px`;
    t.style.top = `${p.y}px`;
    t.style.width = `${p.w}px`;
    t.style.height = `${p.h}px`;
    if (p.fontSize !== undefined) t.style.fontSize = `${p.fontSize}px`;
  }

  function commitPending() {
    for (const [id, p] of dragPendingRef.current.entries()) {
      const el = elements.find((x) => x.id === id);
      if (!el) continue;

      let finalH = p.h;
      if (el.type === "text") {
        const domEl = worldRef.current?.querySelector(`[data-element-id="${id}"]`) as HTMLElement | null;
        if (domEl) {
          finalH = measureTextHeightInClone(domEl, p.w);
        }
      }

      updateElement(id, { x: p.x, y: p.y, width: p.w, height: finalH });
      if (p.fontSize !== undefined && p.fontSize !== el.style.fontSize) {
        if (isIsolated) {
          isolatedStore.updateElementStyle(id, { fontSize: p.fontSize });
        } else {
          useEditorStore.getState().updateElementStyle(id, { fontSize: p.fontSize });
        }
      }
    }
    dragBaseRef.current.clear();
    dragPendingRef.current.clear();
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: "var(--editor-canvas-bg)",
        cursor: isInteracting 
          ? "move" 
          : panning 
            ? "grabbing" 
            : spaceHeld 
              ? "grab" 
              : shiftHeld 
                ? "move" 
                : "default",
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Background grid */}
      {showGrid && (
        <div
          className="absolute inset-0 editor-grid-bg pointer-events-none"
          style={{
            backgroundSize: `${grid * viewport.zoom}px ${grid * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            opacity: 0.6,
          }}
        />
      )}

      <div
        ref={worldRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {frames.map((frame) => (
          <FrameView key={frame.id} frame={frame} />
        ))}
        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => (
            <ElementView
              key={el.id}
              element={el}
              selected={selectedIds.includes(el.id)}
              isIsolated={isIsolated}
              onSelect={(id, additive) => {
                if (additive) toggleSelected(id, true);
                else setSelected([id]);
              }}
            />
          ))}

        {(() => {
          const isAnyLocked = selectedIds.some((id) => {
            const el = elements.find((x) => x.id === id);
            return el?.locked;
          });

          return moveableTargets.length > 0 && (
            <Moveable
              ref={moveableRef}
              target={moveableTargets}
              draggable={!isAnyLocked}
              resizable={!isAnyLocked}
              rotatable={!isAnyLocked}
              dragArea={true}
              checkInput={true}
              keepRatio={shiftHeld}
              origin={false}
              throttleDrag={0}
              throttleResize={0}
              zoom={1 / viewport.zoom}
              onDragStart={() => {
                setIsInteracting(true);
                pushHistory();
                captureBaselines();
              }}
              onDrag={(e) => {
                const id = e.target.getAttribute("data-element-id");
                if (!id) return;
                const base = dragBaseRef.current.get(id);
                if (!base) return;
                const nx = snapCoord(base.x + e.translate[0]);
                const ny = snapCoord(base.y + e.translate[1]);
                dragPendingRef.current.set(id, {
                  x: nx,
                  y: ny,
                  w: base.w,
                  h: base.h,
                  fontSize: base.fontSize,
                });
                applyDomFor(id, e.target);
                window.dispatchEvent(new CustomEvent("rd:canvas-interaction"));
              }}
              onDragEnd={() => {
                setIsInteracting(false);
                commitPending();
              }}
              onResizeStart={() => {
                setIsInteracting(true);
                pushHistory();
                captureBaselines();
              }}
              onResize={(e) => {
                const id = e.target.getAttribute("data-element-id");
                if (!id) return;
                const base = dragBaseRef.current.get(id);
                if (!base) return;
                const nx = snapCoord(base.x + e.drag.beforeTranslate[0]);
                const ny = snapCoord(base.y + e.drag.beforeTranslate[1]);
                const nw = Math.max(8, Math.round(e.width));
                let nh = Math.max(4, Math.round(e.height));
                let fontSize = base.fontSize;
                if (base.type === "text" && base.fontSize && base.h > 0 && base.w > 0) {
                  const isHorizontalOnly = e.direction && e.direction[1] === 0;
                  if (!isHorizontalOnly) {
                    const scale = (nh / base.h + nw / base.w) / 2;
                    fontSize = Math.max(6, Math.round(base.fontSize * scale));
                  } else {
                    // Evita chamadas pesadas ao clone durante o resize contínuo do mouse. Mantemos a altura base e medimos só no commitPending.
                    nh = base.h;
                  }
                }
                dragPendingRef.current.set(id, {
                  x: nx,
                  y: ny,
                  w: nw,
                  h: nh,
                  fontSize,
                });
                applyDomFor(id, e.target);
                window.dispatchEvent(new CustomEvent("rd:canvas-interaction"));
              }}
              onResizeEnd={() => {
                setIsInteracting(false);
                commitPending();
              }}
              onRotateStart={() => {
                setIsInteracting(true);
                pushHistory();
              }}
              onRotate={(e) => {
                const id = e.target.getAttribute("data-element-id");
                if (!id) return;
                updateElement(id, { rotation: e.rotation });
                window.dispatchEvent(new CustomEvent("rd:canvas-interaction"));
              }}
              onRotateEnd={() => {
                setIsInteracting(false);
              }}
              // Manipuladores de eventos de grupo para dar suporte a múltiplos elementos selecionados
              onDragGroupStart={() => {
                setIsInteracting(true);
                pushHistory();
                captureBaselines();
              }}
              onDragGroup={(e) => {
                e.events.forEach((ev) => {
                  const id = ev.target.getAttribute("data-element-id");
                  if (!id) return;
                  const base = dragBaseRef.current.get(id);
                  if (!base) return;
                  const nx = snapCoord(base.x + ev.translate[0]);
                  const ny = snapCoord(base.y + ev.translate[1]);
                  dragPendingRef.current.set(id, {
                    x: nx,
                    y: ny,
                    w: base.w,
                    h: base.h,
                    fontSize: base.fontSize,
                  });
                  applyDomFor(id, ev.target);
                });
                window.dispatchEvent(new CustomEvent("rd:canvas-interaction"));
              }}
              onDragGroupEnd={() => {
                setIsInteracting(false);
                commitPending();
              }}
              onResizeGroupStart={() => {
                setIsInteracting(true);
                pushHistory();
                captureBaselines();
              }}
              onResizeGroup={(e) => {
                e.events.forEach((ev) => {
                  const id = ev.target.getAttribute("data-element-id");
                  if (!id) return;
                  const base = dragBaseRef.current.get(id);
                  if (!base) return;
                  const nx = snapCoord(base.x + ev.drag.beforeTranslate[0]);
                  const ny = snapCoord(base.y + ev.drag.beforeTranslate[1]);
                  const nw = Math.max(8, Math.round(ev.width));
                  let nh = Math.max(4, Math.round(ev.height));
                  let fontSize = base.fontSize;
                  if (base.type === "text" && base.fontSize && base.h > 0 && base.w > 0) {
                    const isHorizontalOnly = ev.direction && ev.direction[1] === 0;
                    if (!isHorizontalOnly) {
                      const scale = (nh / base.h + nw / base.w) / 2;
                      fontSize = Math.max(6, Math.round(base.fontSize * scale));
                    } else {
                      // Evita chamadas pesadas ao clone durante o resize contínuo do mouse. Mantemos a altura base e medimos só no commitPending.
                      nh = base.h;
                    }
                  }
                  dragPendingRef.current.set(id, {
                    x: nx,
                    y: ny,
                    w: nw,
                    h: nh,
                    fontSize,
                  });
                  applyDomFor(id, ev.target);
                });
                window.dispatchEvent(new CustomEvent("rd:canvas-interaction"));
              }}
              onResizeGroupEnd={() => {
                setIsInteracting(false);
                commitPending();
              }}
            />
          );
        })()}
      </div>

      {/* Floating contextual toolbar above current selection */}
      <>
        <FloatingToolbar containerRef={containerRef} isIsolated={isIsolated} viewport={viewport} />
        <HoverActions
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
          isIsolated={isIsolated}
          viewport={viewport}
        />
      </>

      {selectionBox && (
        <div
          className="absolute border border-blue-500 bg-blue-500/15 rounded-sm pointer-events-none z-50"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX) - (containerRef.current?.getBoundingClientRect().left ?? 0),
            top: Math.min(selectionBox.startY, selectionBox.currentY) - (containerRef.current?.getBoundingClientRect().top ?? 0),
            width: Math.abs(selectionBox.startX - selectionBox.currentX),
            height: Math.abs(selectionBox.startY - selectionBox.currentY),
          }}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          kind={ctxMenu.kind}
          targetId={ctxMenu.targetId}
          onClose={() => setCtxMenu(null)}
        />
      )}



      {/* Estilos para arrastar elementos usando as bordas do moveable */}
      <style>{`
        .moveable-control-box .moveable-line {
          cursor: move !important;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
import { useEditorStore } from "../store/editor.store";

export function StatusBar() {
  const zoom = useEditorStore((s) => s.viewport.zoom);
  const setViewport = useEditorStore((s) => s.setViewport);
  const showGrid = useEditorStore((s) => s.showGrid);
  const snap = useEditorStore((s) => s.snap);
  const mode = useEditorStore((s) => s.mode);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const setMode = useEditorStore((s) => s.setMode);
  const consoleOpen = useEditorStore((s) => s.consoleOpen);
  const toggleConsole = useEditorStore((s) => s.toggleConsole);

  return (
    <div className="flex items-center gap-3 px-3 h-7 border-t border-b text-[11px] text-slate-600 bg-slate-50">
      <span>
        Modo:{" "}
        <button
          onClick={() => setMode(mode === "skeleton" ? "preview" : "skeleton")}
          className="font-medium text-slate-800 hover:text-[var(--editor-ribbon-accent)]"
        >
          {mode === "skeleton" ? "Esqueleto" : "Preview"}
        </button>
      </span>
      <span className="text-slate-300">|</span>
      <button onClick={toggleGrid} className="hover:text-slate-900">
        Grid: {showGrid ? "on" : "off"}
      </button>
      <button onClick={toggleSnap} className="hover:text-slate-900">
        Snap: {snap ? "on" : "off"}
      </button>
      <button onClick={toggleConsole} className="hover:text-slate-900">
        Console: {consoleOpen ? "aberto" : "fechado"}
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() =>
            setViewport({ zoom: Math.max(0.1, zoom / 1.2) })
          }
          className="px-1 hover:bg-slate-200 rounded"
        >
          −
        </button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setViewport({ zoom: Math.min(4, zoom * 1.2) })}
          className="px-1 hover:bg-slate-200 rounded"
        >
          +
        </button>
      </div>
    </div>
  );
}
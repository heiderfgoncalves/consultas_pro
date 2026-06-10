import type { Frame } from "../../schema/template";
import { useEditorStore } from "../../store/editor.store";

export function FrameView({ frame }: { frame: Frame }) {
  const active = useEditorStore((s) => s.activeFrameId === frame.id);
  const setActive = useEditorStore((s) => s.setActiveFrame);
  
  // Cabeçalho & Rodapé globais
  const headerFooterEnabled = useEditorStore((s) => s.headerFooterEnabled);
  const headerHeight = useEditorStore((s) => s.headerHeight);
  const footerHeight = useEditorStore((s) => s.footerHeight);

  return (
    <div
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        background: frame.background ?? "var(--editor-frame-bg)",
        boxShadow: "0 6px 24px rgba(15,23,42,0.18)",
        border: active ? "2px solid var(--editor-selected)" : "1px solid #cbd5e1",
        zIndex: 0,
      }}
      onMouseDown={(e) => {
        // clicking inside frame background activates it but doesn't deselect everything immediately
        if (e.target === e.currentTarget) setActive(frame.id);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -22,
          left: 0,
          fontSize: 11,
          color: "#475569",
          fontFamily: "Inter, sans-serif",
          userSelect: "none",
        }}
      >
        {frame.name} · {frame.width}×{frame.height}
      </div>

      {/* Guias Discretas de Cabeçalho & Rodapé Globais */}
      {headerFooterEnabled && (
        <>
          {/* Guia de Cabeçalho */}
          <div
            style={{
              position: "absolute",
              top: headerHeight,
              left: 0,
              right: 0,
              height: 1,
              borderTop: "1px dashed rgba(99, 102, 241, 0.45)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
            }}
          >
            <span style={{ fontSize: "8px", fontWeight: 600, color: "rgba(99, 102, 241, 0.65)", textTransform: "uppercase", background: "rgba(248, 250, 252, 0.8)", padding: "0 4px", borderRadius: "2px", transform: "translateY(-50%)" }}>
              Área de Cabeçalho ({headerHeight}px)
            </span>
          </div>

          {/* Guia de Rodapé */}
          <div
            style={{
              position: "absolute",
              top: frame.height - footerHeight,
              left: 0,
              right: 0,
              height: 1,
              borderTop: "1px dashed rgba(99, 102, 241, 0.45)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
            }}
          >
            <span style={{ fontSize: "8px", fontWeight: 600, color: "rgba(99, 102, 241, 0.65)", textTransform: "uppercase", background: "rgba(248, 250, 252, 0.8)", padding: "0 4px", borderRadius: "2px", transform: "translateY(-50%)" }}>
              Área de Rodapé ({footerHeight}px)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
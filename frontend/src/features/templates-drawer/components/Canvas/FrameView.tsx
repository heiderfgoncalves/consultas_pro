import { useMemo } from "react";
import type { Frame } from "../../schema/template";
import { useEditorStore, useEvaluationContext } from "../../store/editor.store";
import { renderTemplateToHtml } from "../../engine/renderTemplateToHtml";

export function FrameView({ frame }: { frame: Frame }) {
  const active = useEditorStore((s) => s.activeFrameId === frame.id);
  const setActive = useEditorStore((s) => s.setActiveFrame);
  
  const template = useEditorStore((s) => s.template);
  const mode = useEditorStore((s) => s.mode);
  const data = useEvaluationContext();

  // Cabeçalho & Rodapé globais
  const headerFooterEnabled = useEditorStore((s) => s.headerFooterEnabled);
  const headerHeight = useEditorStore((s) => s.headerHeight);
  const footerHeight = useEditorStore((s) => s.footerHeight);

  const rendered = useMemo(() => {
    if (!frame.customHtml) return "";
    try {
      const { html } = renderTemplateToHtml(template, frame.id, data, mode);
      return html;
    } catch (e) {
      console.error("Erro ao renderizar HTML no canvas:", e);
      return frame.customHtml;
    }
  }, [frame.customHtml, template, frame.id, data, mode]);

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
        overflow: "hidden", // garante que o iframe não escape dos limites do frame A4
      }}
      onMouseDown={(e) => {
        // clicking inside frame background activates it but doesn't deselect everything immediately
        if (e.target === e.currentTarget) setActive(frame.id);
      }}
    >
      {frame.customHtml ? (
        <iframe
          title={`frame-preview-${frame.id}`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            pointerEvents: "none",
            background: "transparent",
          }}
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"/><style>body { margin: 0; padding: 0; background: transparent; overflow: hidden; font-family: 'Geist', 'Inter', sans-serif; }</style><script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script></head><body>${rendered}<script>if (typeof lucide !== "undefined") { lucide.createIcons(); }</script></body></html>`}
        />
      ) : null}
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
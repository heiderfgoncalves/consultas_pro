import { newId } from "./ids";
import type { ElementType, TemplateElement } from "../schema/template";

export function createElement(
  type: ElementType,
  x: number,
  y: number,
  zIndex: number,
  frameId?: string,
): TemplateElement {
  const base: TemplateElement = {
    id: newId(type),
    type,
    x,
    y,
    width: 200,
    height: 60,
    zIndex,
    visible: true,
    frameId,
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      color: "#0f172a",
      lineHeight: 1.4,
      textAlign: "left",
      padding: 8,
    },
    binding: { mode: "static" },
    data: {},
  };

  switch (type) {
    case "text":
      return {
        ...base,
        name: "Texto",
        width: 240,
        height: 40,
        data: { text: "Texto livre — use {{caminho.no.json}} para bindar" },
      };
    case "image":
      return {
        ...base,
        name: "Imagem",
        width: 160,
        height: 120,
        style: { ...base.style, background: "#e2e8f0", borderRadius: 6 },
        data: { src: "", fit: "cover" },
      };
    case "divider":
      return {
        ...base,
        name: "Divisor",
        width: 320,
        height: 2,
        style: { ...base.style, background: "#cbd5e1" },
      };
    case "card":
      return {
        ...base,
        name: "Card",
        width: 280,
        height: 120,
        style: {
          ...base.style,
          background: "#ffffff",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
        },
        data: {
          title: "Título do card",
          body: "Conteúdo do card — {{cliente.nome}}",
        },
      };
    case "table":
      return {
        ...base,
        name: "Tabela",
        width: 480,
        height: 160,
        style: {
          ...base.style,
          background: "#ffffff",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 6,
          padding: 0,
          fontSize: 12,
        },
        data: {
          arrayPath: "dividas",
          columns: [
            { label: "Credor", path: "credor", emptyFallback: "-" },
            { label: "Valor", path: "valor", format: "currency", emptyFallback: "-" },
            { label: "Data", path: "data", emptyFallback: "-" },
          ],
          emptyStateHtml: `<div style="text-align: center; color: #94a3b8; padding: 12px; font-style: italic;">Nenhuma informação para exibir</div>`,
        },
      };
    case "container":
      return {
        ...base,
        name: "Container",
        width: 360,
        height: 200,
        style: {
          ...base.style,
          background: "#f8fafc",
          borderColor: "#cbd5e1",
          borderWidth: 1,
          borderRadius: 8,
        },
      };
    case "list":
      return {
        ...base,
        name: "Lista",
        width: 280,
        height: 120,
        data: {
          items: ["Primeiro item", "Segundo item", "Terceiro item"],
          style: "bullet",
        },
      };
    case "icon":
      return {
        ...base,
        name: "Ícone",
        width: 48,
        height: 48,
        style: {
          ...base.style,
          color: "#0f172a",
          padding: 0,
        },
        data: { name: "Star", strokeWidth: 2 },
      };
  }
}
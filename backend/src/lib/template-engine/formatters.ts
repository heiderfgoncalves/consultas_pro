import type { BindingFormat } from "./template";

export function formatValue(value: unknown, format?: BindingFormat): string {
  if (value == null) return "";
  switch (format) {
    case "currency": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    case "percent": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      return `${(n * 100).toFixed(2)}%`;
    }
    case "date": {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString("pt-BR");
    }
    case "cpf": {
      const s = String(value).replace(/\D/g, "").padStart(11, "0");
      return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
    }
    case "cnpj": {
      const s = String(value).replace(/\D/g, "").padStart(14, "0");
      return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    }
    case "text":
    default:
      return String(value);
  }
}
import { apiRequest } from "./http";
import type { TemplateDocument } from "../model/template-document";

export interface ApiTemplate {
  id: string;
  name: string;
  description: string | null;
  visibility: "PRIVATE" | "COMPANY" | "GLOBAL";
  isFavorite: boolean;
  layout?: unknown;
  logo?: string | null;
  items?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export async function listTemplates() {
  return apiRequest<ApiTemplate[]>("/templates", { method: "GET" });
}

export async function getTemplate(id: string) {
  return apiRequest<ApiTemplate>(`/templates/${id}`, { method: "GET" });
}

export async function saveTemplateLayout(id: string, body: {
  name?: string;
  layout?: TemplateDocument | unknown;
  logo?: string | null;
}) {
  return apiRequest<ApiTemplate>(`/templates/${id}/layout`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function createTemplate(body: { name: string; description?: string; visibility?: ApiTemplate["visibility"] }) {
  return apiRequest<ApiTemplate>("/templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteTemplate(id: string) {
  return apiRequest<{ id: string }>(`/templates/${id}`, { method: "DELETE" });
}

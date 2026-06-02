import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTemplates,
  getTemplate,
  saveTemplateLayout,
  createTemplate,
  deleteTemplate,
  type ApiTemplate,
} from "./templates";
import type { TemplateDocument } from "../model/template-document";

const KEY = ["templates-plus", "templates"] as const;

export function useTemplates() {
  return useQuery({
    queryKey: KEY,
    queryFn: listTemplates,
    retry: false,
    staleTime: 30_000,
  });
}

export function useTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getTemplate(id as string),
    enabled: !!id,
    retry: false,
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, document, name, logo }: {
      id: string; document: TemplateDocument; name?: string; logo?: string | null;
    }) => saveTemplateLayout(id, { layout: document, name, logo }),
    onSuccess: (data: ApiTemplate) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.setQueryData([...KEY, data.id], data);
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

import { create } from "zustand";
import type { ElementStyle, ElementType, TemplateElement } from "../schema/template";
import { newId } from "../utils/ids";
import { createElement } from "../utils/defaults";

export type IsolatedEditorTargetType = "component" | "canonicalField";
export type IsolatedEditorFormat = "html" | "json" | "xml";

type IsolatedEditorState = {
  isOpen: boolean;
  targetType: IsolatedEditorTargetType | null;
  targetId: string | null;
  elementTree: TemplateElement[];
  selectedIds: string[];
  hoveredId: string | null;
  code: string;
  format: IsolatedEditorFormat;
  onSave: ((tree: TemplateElement[], code: string, format: IsolatedEditorFormat) => void | Promise<void>) | null;

  openEditor: (options: {
    targetType: IsolatedEditorTargetType;
    targetId: string;
    elementTree: TemplateElement[];
    code?: string;
    format?: IsolatedEditorFormat;
    onSave: (tree: TemplateElement[], code: string, format: IsolatedEditorFormat) => void | Promise<void>;
  }) => void;
  closeEditor: () => void;

  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string, additive?: boolean) => void;
  setHovered: (id: string | null) => void;

  // Mutadores de Elementos
  addElement: (type: ElementType, pos: { x: number; y: number }) => string;
  updateElement: (id: string, patch: Partial<TemplateElement>) => void;
  updateElementStyle: (id: string, patch: Partial<ElementStyle>) => void;
  updateElementData: (id: string, patch: Record<string, unknown>) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;

  setCode: (code: string) => void;
  setFormat: (format: IsolatedEditorFormat) => void;
  save: () => Promise<void>;
};

let hoverClearTimeout: any = null;

export const useIsolatedEditorStore = create<IsolatedEditorState>((set, get) => ({
  isOpen: false,
  targetType: null,
  targetId: null,
  elementTree: [],
  selectedIds: [],
  hoveredId: null,
  code: "",
  format: "html",
  onSave: null,

  openEditor: (options) => {
    set({
      isOpen: true,
      targetType: options.targetType,
      targetId: options.targetId,
      elementTree: options.elementTree,
      selectedIds: [],
      code: options.code ?? "",
      format: options.format ?? "html",
      onSave: options.onSave,
    });
  },

  closeEditor: () => {
    set({
      isOpen: false,
      targetType: null,
      targetId: null,
      elementTree: [],
      selectedIds: [],
      code: "",
      onSave: null,
    });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelectedId: (id, additive = false) => {
    set((state) => {
      if (!additive) return { selectedIds: [id] };
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
      return { selectedIds: selected };
    });
  },
  setHovered: (id) => {
    if (hoverClearTimeout) {
      clearTimeout(hoverClearTimeout);
      hoverClearTimeout = null;
    }
    if (id === null) {
      hoverClearTimeout = setTimeout(() => {
        set({ hoveredId: null });
        hoverClearTimeout = null;
      }, 800);
    } else {
      set({ hoveredId: id });
    }
  },

  addElement: (type, pos) => {
    const el = createElement(
      type,
      pos.x,
      pos.y,
      get().elementTree.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1,
      undefined // sem frame
    );
    set((state) => ({
      elementTree: [...state.elementTree, el],
      selectedIds: [el.id],
    }));
    return el.id;
  },

  updateElement: (id, patch) => {
    set((state) => ({
      elementTree: state.elementTree.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }));
  },

  updateElementStyle: (id, patch) => {
    set((state) => ({
      elementTree: state.elementTree.map((e) =>
        e.id === id ? { ...e, style: { ...e.style, ...patch } } : e
      ),
    }));
  },

  updateElementData: (id, patch) => {
    set((state) => ({
      elementTree: state.elementTree.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e
      ),
    }));
  },

  removeElements: (ids) => {
    set((state) => ({
      elementTree: state.elementTree.filter((e) => !ids.includes(e.id)),
      selectedIds: [],
    }));
  },

  duplicateElements: (ids) => {
    set((state) => {
      const toDup = state.elementTree.filter((e) => ids.includes(e.id));
      let maxZ = state.elementTree.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const copies = toDup.map((e) => ({
        ...structuredClone(e),
        id: newId(e.type),
        x: e.x + 16,
        y: e.y + 16,
        zIndex: ++maxZ,
      }));
      return {
        elementTree: [...state.elementTree, ...copies],
        selectedIds: copies.map((c) => c.id),
      };
    });
  },

  setCode: (code) => set({ code }),
  setFormat: (format) => set({ format }),

  save: async () => {
    const { elementTree, code, format, onSave } = get();
    if (onSave) {
      await onSave(elementTree, code, format);
    }
    set({ isOpen: false });
  },
}));

import { create } from "zustand";
import type { TemplateDoc, SectionNode, FieldNode, QueryType, Experience } from "./types";
import { defaultTemplates, queryTypes as defaultQueryTypes, fixedBlocks, customBlocks } from "./mocks";
import { nanoid } from "@/lib/id";
import { parseTemplate, serializeTemplate } from "./xml";

const STORAGE_KEY = "templates-plus:v5";

interface Persisted {
  templates: TemplateDoc[];
  activeTemplateId: string;
  activeQueryId: string;
  experience: Experience;
}

function load(): Persisted {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.templates?.length) return defaults();
    return parsed;
  } catch { return defaults(); }
}
function defaults(): Persisted {
  return {
    templates: defaultTemplates,
    activeTemplateId: defaultTemplates[0].id,
    activeQueryId: defaultQueryTypes[0].id,
    experience: "admin",
  };
}

/** Path into fields tree: [topIndex, childIndex, …] */
export type NodePath = number[];

interface Store extends Persisted {
  /** transient ui */
  selectedSectionId: string | null;
  selectedFieldId: string | null;
  canvasMode: "skeleton" | "preview";
  consoleOpen: boolean;
  dirty: boolean;
  editingSection: SectionNode | null;
  queryTypes: QueryType[];
  /** undo/redo */
  history: TemplateDoc[][];
  future: TemplateDoc[][];

  /* actions */
  setActiveTemplate: (id: string) => void;
  setActiveQuery: (id: string) => void;
  setExperience: (e: Experience) => void;
  setCanvasMode: (m: "skeleton" | "preview") => void;
  toggleConsole: () => void;

  renameTemplate: (name: string) => void;
  setLogo: (data: string | undefined) => void;
  setQueryTypes: (queries: QueryType[]) => void;
  setTemplates: (templates: TemplateDoc[]) => void;

  addSectionFromBlock: (blockId: string, index?: number) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (from: number, to: number) => void;
  duplicateSection: (sectionId: string) => void;

  addQueryBlock: (queryId: string) => void;
  removeQueryBlock: (queryId: string) => void;

  selectSection: (id: string | null) => void;
  selectField: (id: string | null) => void;

  /* flat (back-compat) */
  updateField: (sectionId: string, fieldId: string, patch: Partial<FieldNode>) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  duplicateField: (sectionId: string, fieldId: string) => void;
  reorderFields: (sectionId: string, from: number, to: number) => void;
  addFieldToSection: (sectionId: string, field: Omit<FieldNode, "id">) => void;

  /* tree (path-based) */
  insertNodeAt: (sectionId: string, parentPath: NodePath, index: number, node: Omit<FieldNode, "id">) => void;
  removeNodeAt: (sectionId: string, path: NodePath) => void;
  updateNodeAt: (sectionId: string, path: NodePath, patch: Partial<FieldNode>) => void;
  duplicateNodeAt: (sectionId: string, path: NodePath) => void;
  moveNodeAt: (sectionId: string, from: NodePath, toParent: NodePath, toIndex: number) => void;
  resizeFlex: (sectionId: string, parentPath: NodePath, leftIdx: number, leftFlex: number, rightFlex: number) => void;

  renameSection: (sectionId: string, name: string) => void;
  setSectionIcon: (sectionId: string, icon: string) => void;
  replaceSectionFields: (sectionId: string, fields: FieldNode[]) => void;
  setSectionsFromXml: (sectionId: string, xml: string) => void;
  replaceSection: (sectionId: string, next: SectionNode) => void;

  openEditor: (sectionId: string) => void;
  closeEditor: () => void;
  commitEditor: (next: SectionNode) => void;

  undo: () => void;
  redo: () => void;
  save: () => void;
}

function persist(s: Partial<Persisted>) {
  if (typeof window === "undefined") return;
  const cur = load();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...s }));
}

/* ---------- tree helpers ---------- */

function getNode(fields: FieldNode[], path: NodePath): FieldNode | undefined {
  if (path.length === 0) return undefined;
  let cur: FieldNode | undefined = fields[path[0]];
  for (let i = 1; i < path.length && cur; i++) {
    cur = cur.children?.[path[i]];
  }
  return cur;
}

function mapTree(
  fields: FieldNode[],
  parentPath: NodePath,
  fn: (children: FieldNode[]) => FieldNode[],
): FieldNode[] {
  if (parentPath.length === 0) return fn(fields);
  const [head, ...rest] = parentPath;
  return fields.map((f, i) => {
    if (i !== head) return f;
    const nextChildren = mapTree(f.children ?? [], rest, fn);
    return { ...f, children: nextChildren };
  });
}

function withId<T extends Omit<FieldNode, "id">>(n: T): FieldNode {
  return {
    ...(n as object),
    id: nanoid(),
    children: (n.children ?? []).map((c) => withId(c)),
  } as FieldNode;
}

/* ---------- store ---------- */

const HISTORY_MAX = 30;

export const useEditorStore = create<Store>((set, get) => {
  /** push current snapshot before a mutation that should be undoable */
  const snapshot = (s: Store) => {
    const snap = structuredClone(s.templates);
    const history = [...s.history, snap].slice(-HISTORY_MAX);
    return { history, future: [] as TemplateDoc[][] };
  };

  return {
    ...load(),
    selectedSectionId: null,
    selectedFieldId: null,
    canvasMode: "preview",
    consoleOpen: false,
    dirty: false,
    editingSection: null,
    history: [],
    future: [],
    queryTypes: defaultQueryTypes,

    setActiveTemplate: (id) => { set({ activeTemplateId: id, selectedSectionId: null, selectedFieldId: null }); persist({ activeTemplateId: id }); },
    setActiveQuery: (id) => { set({ activeQueryId: id }); persist({ activeQueryId: id }); },
    setExperience: (e) => {
      set({ experience: e, canvasMode: e === "user" ? "preview" : get().canvasMode, consoleOpen: e === "user" ? false : get().consoleOpen });
      persist({ experience: e });
    },
    setCanvasMode: (m) => set({ canvasMode: m }),
    toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),

    renameTemplate: (name) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({ ...t, name })) })),
    setLogo: (data) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({ ...t, logo: data })) })),
    setQueryTypes: (queries) => set({ queryTypes: queries }),
    setTemplates: (templates) => {
      set((s) => {
        const activeT = templates.find(t => t.id === s.activeTemplateId) ? s.activeTemplateId : templates[0]?.id ?? s.activeTemplateId;
        return { templates, activeTemplateId: activeT };
      });
    },

    addSectionFromBlock: (blockId, index) => set((s) => {
      const all = [...fixedBlocks, ...customBlocks];
      const blk = all.find((b) => b.id === blockId);
      if (!blk) return s;
      return { ...snapshot(s), ...mutateActive(s, (t) => {
        const section = blk.make();
        const sections = [...t.sections];
        const at = index ?? sections.length;
        sections.splice(at, 0, section);
        return { ...t, sections };
      }) };
    }),

    removeSection: (sectionId) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t, sections: t.sections.filter((sec) => sec.id !== sectionId),
    })) })),

    reorderSections: (from, to) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => {
      const sections = [...t.sections];
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
      return { ...t, sections };
    }) })),

    duplicateSection: (sectionId) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => {
      const idx = t.sections.findIndex((sec) => sec.id === sectionId);
      if (idx < 0) return t;
      const orig = t.sections[idx];
      const cloneFields = (fs: FieldNode[]): FieldNode[] =>
        fs.map((f) => ({ ...f, id: nanoid(), children: f.children ? cloneFields(f.children) : undefined }));
      const dup: SectionNode = { ...orig, id: nanoid(), fields: cloneFields(orig.fields) };
      const sections = [...t.sections];
      sections.splice(idx + 1, 0, dup);
      return { ...t, sections };
    }) })),

    addQueryBlock: (queryId) => set((s) => mutateActive(s, (t) => (
      t.selectedQueryBlocks.includes(queryId) ? t : { ...t, selectedQueryBlocks: [...t.selectedQueryBlocks, queryId] }
    ))),
    removeQueryBlock: (queryId) => set((s) => mutateActive(s, (t) => ({
      ...t, selectedQueryBlocks: t.selectedQueryBlocks.filter((q) => q !== queryId),
    }))),

    selectSection: (id) => set({ selectedSectionId: id, selectedFieldId: null }),
    selectField: (id) => set({ selectedFieldId: id }),

    /* ---------- flat back-compat (also affects nested via id walk) ---------- */

    updateField: (sectionId, fieldId, patch) => set((s) => mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, fields: walkPatch(sec.fields, fieldId, patch) }),
    }))),

    removeField: (sectionId, fieldId) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, fields: walkRemove(sec.fields, fieldId) }),
    })) })),

    duplicateField: (sectionId, fieldId) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, fields: walkDuplicate(sec.fields, fieldId) }),
    })) })),

    reorderFields: (sectionId, from, to) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const fields = [...sec.fields];
        const [moved] = fields.splice(from, 1);
        fields.splice(to, 0, moved);
        return { ...sec, fields };
      }),
    })) })),

    addFieldToSection: (sectionId, field) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) =>
        sec.id !== sectionId ? sec : { ...sec, fields: [...sec.fields, withId(field)] }
      ),
    })) })),

    /* ---------- path-based tree ops ---------- */

    insertNodeAt: (sectionId, parentPath, index, node) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const created = withId(node);
        const fields = mapTree(sec.fields, parentPath, (children) => {
          const next = [...children];
          const at = Math.max(0, Math.min(index, next.length));
          next.splice(at, 0, created);
          return next;
        });
        return { ...sec, fields };
      }),
    })) })),

    removeNodeAt: (sectionId, path) => set((s) => {
      if (path.length === 0) return s;
      const parent = path.slice(0, -1);
      const at = path[path.length - 1];
      return { ...snapshot(s), ...mutateActive(s, (t) => ({
        ...t,
        sections: t.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const fields = mapTree(sec.fields, parent, (children) => children.filter((_, i) => i !== at));
          return { ...sec, fields };
        }),
      })) };
    }),

    updateNodeAt: (sectionId, path, patch) => set((s) => {
      if (path.length === 0) return s;
      const parent = path.slice(0, -1);
      const at = path[path.length - 1];
      return mutateActive(s, (t) => ({
        ...t,
        sections: t.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const fields = mapTree(sec.fields, parent, (children) =>
            children.map((c, i) => i !== at ? c : { ...c, ...patch })
          );
          return { ...sec, fields };
        }),
      }));
    }),

    duplicateNodeAt: (sectionId, path) => set((s) => {
      if (path.length === 0) return s;
      const parent = path.slice(0, -1);
      const at = path[path.length - 1];
      return { ...snapshot(s), ...mutateActive(s, (t) => ({
        ...t,
        sections: t.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const node = getNode(sec.fields, path);
          if (!node) return sec;
          const dup = withId(JSON.parse(JSON.stringify({ ...node, id: undefined })));
          const fields = mapTree(sec.fields, parent, (children) => {
            const next = [...children];
            next.splice(at + 1, 0, dup);
            return next;
          });
          return { ...sec, fields };
        }),
      })) };
    }),

    moveNodeAt: (sectionId, from, toParent, toIndex) => set((s) => {
      if (from.length === 0) return s;
      return { ...snapshot(s), ...mutateActive(s, (t) => ({
        ...t,
        sections: t.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const node = getNode(sec.fields, from);
          if (!node) return sec;
          // 1) remove from source
          const fromParent = from.slice(0, -1);
          const fromIdx = from[from.length - 1];
          let fields = mapTree(sec.fields, fromParent, (children) => children.filter((_, i) => i !== fromIdx));
          // adjust target if same parent and toIndex was after removed
          let adjustedTo = toIndex;
          if (
            fromParent.length === toParent.length &&
            fromParent.every((v, i) => v === toParent[i]) &&
            fromIdx < toIndex
          ) {
            adjustedTo = toIndex - 1;
          }
          // prevent dropping into itself
          if (toParent.length > from.length && from.every((v, i) => v === toParent[i])) return sec;
          fields = mapTree(fields, toParent, (children) => {
            const next = [...children];
            const at = Math.max(0, Math.min(adjustedTo, next.length));
            next.splice(at, 0, node);
            return next;
          });
          return { ...sec, fields };
        }),
      })) };
    }),

    resizeFlex: (sectionId, parentPath, leftIdx, leftFlex, rightFlex) => set((s) => mutateActive(s, (t) => ({
      ...t,
      sections: t.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const fields = mapTree(sec.fields, parentPath, (children) =>
          children.map((c, i) => {
            if (i === leftIdx)     return { ...c, flex: Math.max(0.1, leftFlex) };
            if (i === leftIdx + 1) return { ...c, flex: Math.max(0.1, rightFlex) };
            return c;
          })
        );
        return { ...sec, fields };
      }),
    }))),

    renameSection: (sectionId, name) => set((s) => mutateActive(s, (t) => ({
      ...t, sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, name }),
    }))),

    setSectionIcon: (sectionId, icon) => set((s) => mutateActive(s, (t) => ({
      ...t, sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, icon }),
    }))),

    replaceSectionFields: (sectionId, fields) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t, sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...sec, fields }),
    })) })),

    setSectionsFromXml: (sectionId, xml) => set((s) => {
      try {
        const parsed = parseTemplate(xml);
        if (!parsed[0]) return s;
        return { ...snapshot(s), ...mutateActive(s, (t) => ({
          ...t,
          sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...parsed[0], id: sec.id }),
        })) };
      } catch { return s; }
    }),

    replaceSection: (sectionId, next) => set((s) => ({ ...snapshot(s), ...mutateActive(s, (t) => ({
      ...t, sections: t.sections.map((sec) => sec.id !== sectionId ? sec : { ...next, id: sec.id }),
    })) })),

    openEditor: (sectionId) => {
      const t = activeOf(get());
      const sec = t?.sections.find((s) => s.id === sectionId) ?? null;
      set({ editingSection: sec ? structuredClone(sec) : null });
    },
    closeEditor: () => set({ editingSection: null }),
    commitEditor: (next) => {
      const { editingSection } = get();
      if (!editingSection) return;
      get().replaceSection(editingSection.id, next);
      set({ editingSection: null });
    },

    undo: () => set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      const history = s.history.slice(0, -1);
      const future = [structuredClone(s.templates), ...s.future].slice(0, HISTORY_MAX);
      return { history, future, templates: prev, dirty: true };
    }),
    redo: () => set((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      const history = [...s.history, structuredClone(s.templates)].slice(-HISTORY_MAX);
      return { history, future: rest, templates: next, dirty: true };
    }),

    save: () => {
      const s = get();
      persist({ templates: s.templates, activeTemplateId: s.activeTemplateId, activeQueryId: s.activeQueryId, experience: s.experience });
      set({ dirty: false });
    },
  };
});

/* ---------- nested walkers (back-compat by id) ---------- */

function walkPatch(fields: FieldNode[], id: string, patch: Partial<FieldNode>): FieldNode[] {
  return fields.map((f) => {
    if (f.id === id) return { ...f, ...patch };
    if (f.children) return { ...f, children: walkPatch(f.children, id, patch) };
    return f;
  });
}
function walkRemove(fields: FieldNode[], id: string): FieldNode[] {
  return fields
    .filter((f) => f.id !== id)
    .map((f) => (f.children ? { ...f, children: walkRemove(f.children, id) } : f));
}
function walkDuplicate(fields: FieldNode[], id: string): FieldNode[] {
  const out: FieldNode[] = [];
  for (const f of fields) {
    if (f.id === id) {
      out.push(f);
      out.push(withId(JSON.parse(JSON.stringify({ ...f, id: undefined }))));
    } else {
      out.push(f.children ? { ...f, children: walkDuplicate(f.children, id) } : f);
    }
  }
  return out;
}

function activeOf(s: Pick<Store, "templates" | "activeTemplateId">) {
  return s.templates.find((t) => t.id === s.activeTemplateId);
}

function mutateActive(s: Store, fn: (t: TemplateDoc) => TemplateDoc): Partial<Store> {
  const templates = s.templates.map((t) => t.id === s.activeTemplateId ? fn(t) : t);
  return { templates, dirty: true };
}

/* ---------- Selectors / helpers ---------- */

export const useActiveTemplate = () => useEditorStore((s) => s.templates.find((t) => t.id === s.activeTemplateId)!);
export const useActiveQuery = (): QueryType => useEditorStore((s) => s.queryTypes.find((q) => q.id === s.activeQueryId) ?? s.queryTypes[0]);

export function buildContext(query: QueryType, template: TemplateDoc): Record<string, unknown> {
  return {
    ...query.sample,
    template: {
      protocol: "PRT-" + template.id.toUpperCase(),
      date: new Date().toLocaleDateString("pt-BR"),
      company: "Sua Empresa LTDA",
      logo: template.logo ?? "",
    },
  };
}

export function exportActiveAsXml(s: Pick<Store, "templates" | "activeTemplateId">): string {
  const t = activeOf(s);
  return t ? serializeTemplate(t.sections) : "";
}

/** find a path to a fieldId within a fields tree */
export function findPath(fields: FieldNode[], fieldId: string, base: NodePath = []): NodePath | null {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const here = [...base, i];
    if (f.id === fieldId) return here;
    if (f.children) {
      const found = findPath(f.children, fieldId, here);
      if (found) return found;
    }
  }
  return null;
}

export { getNode as getNodeAt };

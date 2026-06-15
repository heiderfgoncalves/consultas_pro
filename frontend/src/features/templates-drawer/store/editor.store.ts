import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";
import { injectMeasures } from "../engine/interpolate";
import type {
  ElementType,
  Frame,
  FramePreset,
  ReportTemplate,
  ReusableComponent,
  TemplateElement,
  CalculatedMeasure,
} from "../schema/template";
import { newId } from "../utils/ids";
import { createElement } from "../utils/defaults";
import { FRAME_PRESETS } from "../utils/frames-presets";
import { SAMPLE_DATA } from "../utils/sample-data";
import { createSampleTemplate } from "../templates/sample-report";
import { LEGACY_BLOCKS } from "../utils/legacy-blocks";

export type LeftPanelTab = "elements" | "blocks" | "pages" | "pipeline";

export type CanvasViewport = { x: number; y: number; zoom: number };
export type CanvasMode = "skeleton" | "preview";

export type ConsoleView =
  | "data"
  | "templateJson"
  | "templateXml"
  | "html"
  | "expression"
  | "logs"
  | "elementProps"
  | "auditor"
  | "model";
export type ConsolePanelMode = "code" | "grid";
export type ConsoleLayout = {
  height: number;
  splitRatio: number;
  leftView: ConsoleView;
  rightView: ConsoleView;
  leftMode: ConsolePanelMode;
  rightMode: ConsolePanelMode;
};

type HistoryEntry = { template: ReportTemplate };

function emptyTemplate(): ReportTemplate {
  const frameId = newId("frame");
  const preset = FRAME_PRESETS["a4-p"];
  return {
    id: newId("tpl"),
    name: "Novo template",
    version: 1,
    canvas: { background: "#e2e8f0", grid: 8 },
    frames: [
      {
        id: frameId,
        name: "Página 1",
        preset: "a4-p",
        x: 0,
        y: 0,
        width: preset.width,
        height: preset.height,
      },
    ],
    elements: [],
  };
}

type EditorState = {
  template: ReportTemplate;
  selectedIds: string[];
  viewport: CanvasViewport;
  showGrid: boolean;
  snap: boolean;
  mode: CanvasMode;
  dataJson: unknown;
  dataJsonText: string;
  testExpression: string;
  reusableComponents: ReusableComponent[];
  activeFrameId: string | null;
  consoleOpen: boolean;
  consoleLayout: ConsoleLayout;
  recentColors: string[];
  hoveredId: string | null;
  dirty: boolean;
  lastSavedAt: number | null;
  history: HistoryEntry[];
  future: HistoryEntry[];
  activeTemplateId: string | null;
  activeProductId: string | null;
  rightPanelOpen: boolean;
  activeRightTab: "layout" | "style" | "html" | "binding" | "data";
  availableVariables: string[];
  leftPanelTab: LeftPanelTab;
  selectedConsultaIds: string[];
  selectedScenarios: Record<string, string>;
  draftSampleResponses: Record<string, string>;

  // Header & Footer
  headerFooterEnabled: boolean;
  headerHeight: number;
  footerHeight: number;
  replicateOnNewPages: boolean;

  setHeaderFooterEnabled: (enabled: boolean) => void;
  setHeaderHeight: (height: number) => void;
  setFooterHeight: (height: number) => void;
  setReplicateOnNewPages: (replicate: boolean) => void;
  replicateHeaderFooterToFrame: (sourceFrameId: string, targetFrameId: string) => void;
  replicateHeaderFooterToAllFrames: () => void;

  setActiveTemplateId: (id: string | null) => void;
  setActiveProductId: (id: string | null) => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveRightTab: (tab: "layout" | "style" | "html" | "binding" | "data") => void;
  setAvailableVariables: (vars: string[]) => void;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  setSelectedConsultaIds: (ids: string[]) => void;
  setSelectedScenarios: (scenarios: Record<string, string>) => void;
  setDraftSampleResponse: (id: string, response: string) => void;

  // selection
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  htmlInspectorOpen: boolean;
  setHtmlInspectorOpen: (open: boolean) => void;

  // template mutations
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadTemplate: (t: ReportTemplate) => void;
  replaceTemplate: (t: ReportTemplate) => void;
  newTemplate: () => void;
  loadSampleTemplate: () => void;
  renameTemplate: (name: string) => void;
  addMeasure: (measure: Omit<CalculatedMeasure, "id">) => void;
  updateMeasure: (id: string, patch: Partial<CalculatedMeasure>) => void;
  removeMeasure: (id: string) => void;

  // frames
  addFrame: (preset: FramePreset, width?: number, height?: number) => void;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  removeFrame: (id: string, removeElements?: boolean) => void;
  duplicateFrame: (id: string) => void;
  reorderFrame: (id: string, dir: -1 | 1) => void;
  setActiveFrame: (id: string | null) => void;

  // elements
  addElement: (
    type: ElementType,
    pos: { x: number; y: number },
    frameId?: string,
  ) => string;
  updateElement: (id: string, patch: Partial<TemplateElement>) => void;
  updateElementStyle: (
    id: string,
    patch: Partial<TemplateElement["style"]>,
  ) => void;
  updateElementData: (id: string, patch: Record<string, unknown>) => void;
  removeElements: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;

  // alignment
  alignSelected: (
    edge: "left" | "right" | "top" | "bottom" | "h-center" | "v-center",
  ) => void;

  // clipboard
  copyBuffer: TemplateElement[] | null;
  copySelection: () => void;
  pasteClipboard: () => void;
  selectAllInActiveFrame: () => void;

  // viewport
  setViewport: (v: Partial<CanvasViewport>) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setMode: (m: CanvasMode) => void;
  toggleConsole: () => void;
  setConsoleLayout: (patch: Partial<ConsoleLayout>) => void;
  pushRecentColor: (color: string, replaceColor?: string) => void;
  setHovered: (id: string | null) => void;
  markSaved: () => void;

  // data
  setDataJsonText: (text: string) => void;
  setTestExpression: (e: string) => void;

  // components
  saveSelectionAsComponent: (name: string) => void;
  saveSelectionAsComponentWithMeta: (
    name: string,
    category?: string,
    variables?: string[],
  ) => void;
  insertComponent: (
    componentId: string,
    pos: { x: number; y: number },
  ) => void;
  updateGroupArguments: (
    groupId: string,
    args: Record<string, string>,
  ) => void;
  removeComponent: (id: string) => void;
  importComponents: (items: ReusableComponent[]) => void;
  addLegacyBlock: (
    blockId: string,
    pos: { x: number; y: number },
    frameId?: string,
  ) => void;
  updateCanvas: (patch: Partial<ReportTemplate["canvas"]>) => void;
  updateMetadata: (patch: Record<string, unknown>) => void;
};

const HISTORY_LIMIT = 50;

const noopStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

function nextZ(template: ReportTemplate): number {
  return template.elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1;
}

function snapCoord(value: number, grid: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

let hoverClearTimeout: NodeJS.Timeout | null = null;

function expandSelectionWithGroups(ids: string[], elements: TemplateElement[]): string[] {
  const result = new Set<string>(ids);
  const groupIds = new Set<string>();
  
  for (const id of ids) {
    const el = elements.find(e => e.id === id);
    if (el?.groupId) {
      groupIds.add(el.groupId);
    }
  }
  
  if (groupIds.size > 0) {
    for (const el of elements) {
      if (el.groupId && groupIds.has(el.groupId)) {
        result.add(el.id);
      }
    }
  }
  
  return Array.from(result);
}

export function extractPathsFromDataJson(obj: any, currentPath = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return currentPath ? [currentPath] : [];
  }
  
  if (Array.isArray(obj)) {
    const paths = [currentPath];
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const firstObjPaths = extractPathsFromDataJson(obj[0], currentPath ? `${currentPath}[0]` : "");
      paths.push(...firstObjPaths);
    }
    return paths;
  }

  const paths: string[] = [];
  if (currentPath) {
    paths.push(currentPath);
  }

  for (const key of Object.keys(obj)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    paths.push(...extractPathsFromDataJson(obj[key], nextPath));
  }

  return paths;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      template: emptyTemplate(),
      selectedIds: [],
      viewport: { x: 60, y: 60, zoom: 0.6 },
      showGrid: true,
      snap: true,
      mode: "skeleton",
      dataJson: SAMPLE_DATA,
      dataJsonText: JSON.stringify(SAMPLE_DATA, null, 2),
      testExpression: "cliente.nome",
      reusableComponents: [],
      activeFrameId: null,
      consoleOpen: true,
      consoleLayout: {
        height: 280,
        splitRatio: 0.5,
        leftView: "data",
        rightView: "html",
        leftMode: "code",
        rightMode: "code",
      },
      recentColors: ["#0f172a", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ffffff", "#e2e8f0"],
      hoveredId: null,
      dirty: false,
      lastSavedAt: null,
      history: [],
      future: [],
      activeTemplateId: null,
      activeProductId: null,
      rightPanelOpen: true,
      activeRightTab: "layout",
      availableVariables: extractPathsFromDataJson(SAMPLE_DATA).sort(),
      leftPanelTab: "elements",
      selectedConsultaIds: [],
      selectedScenarios: {},
      draftSampleResponses: {},

      headerFooterEnabled: false,
      headerHeight: 100,
      footerHeight: 80,
      replicateOnNewPages: true,

      setHeaderFooterEnabled: (enabled) => set({ headerFooterEnabled: enabled }),
      setHeaderHeight: (height) => set({ headerHeight: height }),
      setFooterHeight: (height) => set({ footerHeight: height }),
      setReplicateOnNewPages: (replicate) => set({ replicateOnNewPages: replicate }),
      replicateHeaderFooterToFrame: (sourceFrameId, targetFrameId) => {
        const { template, headerHeight, footerHeight } = get();
        const sourceFrame = template.frames.find((f) => f.id === sourceFrameId);
        const targetFrame = template.frames.find((f) => f.id === targetFrameId);
        if (!sourceFrame || !targetFrame) return;

        // Filtrar elementos do frame de origem que pertencem ao header ou footer
        const sourceElements = template.elements.filter((e) => e.frameId === sourceFrameId);
        const headerEls = sourceElements.filter(
          (e) => e.y - sourceFrame.y <= headerHeight
        );
        const footerEls = sourceElements.filter(
          (e) => (sourceFrame.y + sourceFrame.height) - (e.y + e.height) <= footerHeight
        );

        if (headerEls.length === 0 && footerEls.length === 0) return;

        // Remover elementos existentes no frame de destino que estão na área de header/footer
        const filteredElements = template.elements.filter((e) => {
          if (e.frameId !== targetFrameId) return true;
          const isHeaderArea = e.y - targetFrame.y <= headerHeight;
          const isFooterArea = (targetFrame.y + targetFrame.height) - (e.y + e.height) <= footerHeight;
          return !isHeaderArea && !isFooterArea;
        });

        let z = nextZ({ ...template, elements: filteredElements });

        // Clonar e transladar elementos de header
        const clonedHeaders = headerEls.map((e) => {
          const clone = structuredClone(e);
          return {
            ...clone,
            id: newId(e.type),
            frameId: targetFrameId,
            x: e.x - sourceFrame.x + targetFrame.x,
            y: e.y - sourceFrame.y + targetFrame.y,
            zIndex: z++,
          };
        });

        // Clonar e transladar elementos de footer (com ajuste de altura se houver)
        const clonedFooters = footerEls.map((e) => {
          const clone = structuredClone(e);
          const distFromBottom = (sourceFrame.y + sourceFrame.height) - e.y;
          return {
            ...clone,
            id: newId(e.type),
            frameId: targetFrameId,
            x: e.x - sourceFrame.x + targetFrame.x,
            y: targetFrame.y + targetFrame.height - distFromBottom,
            zIndex: z++,
          };
        });

        set((s) => ({
          template: {
            ...s.template,
            elements: [...filteredElements, ...clonedHeaders, ...clonedFooters],
          },
        }));
      },
      replicateHeaderFooterToAllFrames: () => {
        const { template } = get();
        if (template.frames.length < 2) return;
        get().pushHistory();
        const firstFrameId = template.frames[0].id;
        for (let i = 1; i < template.frames.length; i++) {
          get().replicateHeaderFooterToFrame(firstFrameId, template.frames[i].id);
        }
      },

      setActiveTemplateId: (id) => set({ activeTemplateId: id }),
      setActiveProductId: (id) => set({ activeProductId: id }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      setAvailableVariables: (vars) => set({ availableVariables: vars }),
      setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
      setSelectedConsultaIds: (ids) => set({ selectedConsultaIds: ids }),
      setSelectedScenarios: (scenarios) => set({ selectedScenarios: scenarios }),
      setDraftSampleResponse: (id, response) => set((state) => ({ 
        draftSampleResponses: { ...state.draftSampleResponses, [id]: response } 
      })),

      setSelected: (ids) => {
        const { template } = get();
        const expanded = expandSelectionWithGroups(ids, template.elements);
        set({ selectedIds: expanded });
      },
      toggleSelected: (id, additive) =>
        set((s) => {
          if (!additive) {
            const expanded = expandSelectionWithGroups([id], s.template.elements);
            return { selectedIds: expanded };
          }
          const isSelected = s.selectedIds.includes(id);
          const relatedIds = expandSelectionWithGroups([id], s.template.elements);
          
          let nextSelected: string[];
          if (isSelected) {
            nextSelected = s.selectedIds.filter((x) => !relatedIds.includes(x));
          } else {
            nextSelected = Array.from(new Set([...s.selectedIds, ...relatedIds]));
          }
          return { selectedIds: nextSelected };
        }),
      clearSelection: () => set({ selectedIds: [] }),
      
      htmlInspectorOpen: false,
      setHtmlInspectorOpen: (open) => set({ htmlInspectorOpen: open }),
      
      groupSelectedElements: () => {
        const { selectedIds, template } = get();
        if (selectedIds.length < 2) return;
        get().pushHistory();
        const gId = newId("group");
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) =>
              selectedIds.includes(e.id) ? { ...e, groupId: gId } : e
            ),
          },
        }));
      },
      ungroupSelectedElements: () => {
        const { selectedIds, template } = get();
        if (selectedIds.length === 0) return;
        get().pushHistory();
        
        const groupIds = new Set<string>();
        for (const id of selectedIds) {
          const el = template.elements.find((e) => e.id === id);
          if (el?.groupId) {
            groupIds.add(el.groupId);
          }
        }
        
        if (groupIds.size === 0) return;
        
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) =>
              e.groupId && groupIds.has(e.groupId) ? { ...e, groupId: undefined } : e
            ),
          },
        }));
      },

      pushHistory: () =>
        set((s) => ({
          history: [
            ...s.history.slice(-HISTORY_LIMIT + 1),
            { template: structuredClone(s.template) },
          ],
          future: [],
          dirty: true,
        })),
      undo: () =>
        set((s) => {
          const prev = s.history[s.history.length - 1];
          if (!prev) return s;
          return {
            template: prev.template,
            history: s.history.slice(0, -1),
            future: [{ template: structuredClone(s.template) }, ...s.future],
            selectedIds: [],
          };
        }),
      redo: () =>
        set((s) => {
          const next = s.future[0];
          if (!next) return s;
          return {
            template: next.template,
            history: [...s.history, { template: structuredClone(s.template) }],
            future: s.future.slice(1),
            selectedIds: [],
          };
        }),
      loadTemplate: (t) =>
        set({
          template: t,
          selectedIds: [],
          history: [],
          future: [],
          dirty: false,
          lastSavedAt: Date.now(),
          activeFrameId: t.frames[0]?.id ?? null,
        }),
      replaceTemplate: (t) => {
        get().pushHistory();
        set({ template: t, selectedIds: [] });
      },
      newTemplate: () =>
        set({
          template: emptyTemplate(),
          selectedIds: [],
          history: [],
          future: [],
          activeFrameId: null,
          dirty: false,
          lastSavedAt: null,
          selectedConsultaIds: [],
        }),
      loadSampleTemplate: () => {
        const t = createSampleTemplate();
        set({
          template: t,
          selectedIds: [],
          history: [],
          future: [],
          activeFrameId: t.frames[0]?.id ?? null,
        });
      },
      renameTemplate: (name) =>
        set((s) => ({ template: { ...s.template, name } })),
      addMeasure: (m) => {
        get().pushHistory();
        set((s) => {
          const measures = s.template.measures || [];
          const newM = { ...m, id: newId("meas") };
          return {
            template: {
              ...s.template,
              measures: [...measures, newM],
            },
          };
        });
      },
      updateMeasure: (id, patch) => {
        get().pushHistory();
        set((s) => {
          const measures = s.template.measures || [];
          return {
            template: {
              ...s.template,
              measures: measures.map((m) => (m.id === id ? { ...m, ...patch } : m)),
            },
          };
        });
      },
      removeMeasure: (id) => {
        get().pushHistory();
        set((s) => {
          const measures = s.template.measures || [];
          return {
            template: {
              ...s.template,
              measures: measures.filter((m) => m.id !== id),
            },
          };
        });
      },

      addFrame: (preset, width, height) => {
        get().pushHistory();
        set((s) => {
          const dims =
            preset === "custom"
              ? { width: width ?? 600, height: height ?? 400 }
              : FRAME_PRESETS[preset];
          const farRight =
            s.template.frames.reduce(
              (m, f) => Math.max(m, f.x + f.width),
              0,
            ) + 80;
          const frame: Frame = {
            id: newId("frame"),
            name: `Página ${s.template.frames.length + 1}`,
            preset,
            x: farRight,
            y: 0,
            width: dims.width,
            height: dims.height,
          };
          return {
            template: {
              ...s.template,
              frames: [...s.template.frames, frame],
            },
            activeFrameId: frame.id,
          };
        });

        // REPLICAR HEADER & FOOTER AUTOMATICAMENTE SE ATIVO
        const state = get();
        if (state.headerFooterEnabled && state.replicateOnNewPages && state.template.frames.length > 1) {
          const firstFrameId = state.template.frames[0].id;
          const targetFrameId = state.template.frames[state.template.frames.length - 1].id;
          state.replicateHeaderFooterToFrame(firstFrameId, targetFrameId);
        }
      },
      updateFrame: (id, patch) => {
        get().pushHistory();
        set((s) => ({
          template: {
            ...s.template,
            frames: s.template.frames.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          },
        }));
      },
      removeFrame: (id) => {
        get().pushHistory();
        set((s) => ({
          template: {
            ...s.template,
            frames: s.template.frames.filter((f) => f.id !== id),
            elements: s.template.elements.filter((e) => e.frameId !== id),
          },
          activeFrameId: s.activeFrameId === id ? null : s.activeFrameId,
        }));
      },
      duplicateFrame: (id) => {
        get().pushHistory();
        set((s) => {
          const f = s.template.frames.find((x) => x.id === id);
          if (!f) return s;
          const farRight =
            s.template.frames.reduce((m, x) => Math.max(m, x.x + x.width), 0) + 80;
          const copy: Frame = { ...f, id: newId("frame"), name: `${f.name} (cópia)`, x: farRight };
          const idx = s.template.frames.findIndex((x) => x.id === id);
          const frames = [...s.template.frames];
          frames.splice(idx + 1, 0, copy);
          const newEls = s.template.elements
            .filter((e) => e.frameId === id)
            .map((e) => ({
              ...structuredClone(e),
              id: newId(e.type),
              frameId: copy.id,
              x: e.x - f.x + copy.x,
              y: e.y - f.y + copy.y,
            }));
          return {
            template: { ...s.template, frames, elements: [...s.template.elements, ...newEls] },
            activeFrameId: copy.id,
          };
        });
      },
      reorderFrame: (id, dir) => {
        set((s) => {
          const idx = s.template.frames.findIndex((f) => f.id === id);
          if (idx < 0) return s;
          const j = idx + dir;
          if (j < 0 || j >= s.template.frames.length) return s;
          const frames = [...s.template.frames];
          [frames[idx], frames[j]] = [frames[j], frames[idx]];
          return { template: { ...s.template, frames } };
        });
      },
      setActiveFrame: (id) => set({ activeFrameId: id }),

      addElement: (type, pos, frameId) => {
        get().pushHistory();
        const { snap, template } = get();
        const grid = template.canvas.grid;
        const el = createElement(
          type,
          snapCoord(pos.x, grid, snap),
          snapCoord(pos.y, grid, snap),
          nextZ(template),
          frameId,
        );
        set((s) => ({
          template: {
            ...s.template,
            elements: [...s.template.elements, el],
          },
          selectedIds: [el.id],
        }));
        return el.id;
      },
      updateElement: (id, patch) =>
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          },
        })),
      updateElementStyle: (id, patch) =>
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) =>
              e.id === id ? { ...e, style: { ...e.style, ...patch } } : e,
            ),
          },
        })),
      updateElementData: (id, patch) =>
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) =>
              e.id === id ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e,
            ),
          },
        })),
      removeElements: (ids) => {
        get().pushHistory();
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.filter((e) => !ids.includes(e.id)),
          },
          selectedIds: [],
        }));
      },
      bringForward: (ids) => {
        set((s) => {
          const top = nextZ(s.template);
          return {
            template: {
              ...s.template,
              elements: s.template.elements.map((e, i) =>
                ids.includes(e.id) ? { ...e, zIndex: top + i } : e,
              ),
            },
          };
        });
      },
      sendBackward: (ids) => {
        set((s) => {
          const min =
            s.template.elements.reduce(
              (m, e) => Math.min(m, e.zIndex),
              0,
            ) - 1;
          return {
            template: {
              ...s.template,
              elements: s.template.elements.map((e, i) =>
                ids.includes(e.id) ? { ...e, zIndex: min - i } : e,
              ),
            },
          };
        });
      },
      duplicateElements: (ids) => {
        get().pushHistory();
        set((s) => {
          const toDup = s.template.elements.filter((e) => ids.includes(e.id));
          let z = nextZ(s.template);
          const copies = toDup.map((e) => ({
            ...structuredClone(e),
            id: newId(e.type),
            x: e.x + 16,
            y: e.y + 16,
            zIndex: z++,
          }));
          return {
            template: {
              ...s.template,
              elements: [...s.template.elements, ...copies],
            },
            selectedIds: copies.map((c) => c.id),
          };
        });
      },

      alignSelected: (edge) => {
        const { selectedIds, template } = get();
        if (selectedIds.length < 2) return;
        get().pushHistory();
        const sel = template.elements.filter((e) => selectedIds.includes(e.id));
        const minX = Math.min(...sel.map((e) => e.x));
        const maxX = Math.max(...sel.map((e) => e.x + e.width));
        const minY = Math.min(...sel.map((e) => e.y));
        const maxY = Math.max(...sel.map((e) => e.y + e.height));
        set((s) => ({
          template: {
            ...s.template,
            elements: s.template.elements.map((e) => {
              if (!selectedIds.includes(e.id)) return e;
              switch (edge) {
                case "left":
                  return { ...e, x: minX };
                case "right":
                  return { ...e, x: maxX - e.width };
                case "top":
                  return { ...e, y: minY };
                case "bottom":
                  return { ...e, y: maxY - e.height };
                case "h-center":
                  return { ...e, x: (minX + maxX) / 2 - e.width / 2 };
                case "v-center":
                  return { ...e, y: (minY + maxY) / 2 - e.height / 2 };
              }
            }),
          },
        }));
      },

      copyBuffer: null,
      copySelection: () => {
        const { selectedIds, template } = get();
        const items = template.elements.filter((e) =>
          selectedIds.includes(e.id),
        );
        if (items.length === 0) return;
        const clones = items.map((e) => structuredClone(e));
        set({ copyBuffer: clones });
        (window as any).__editorCopyBuffer = clones;
      },
      pasteClipboard: () => {
        const copyBuffer = (window as any).__editorCopyBuffer || get().copyBuffer;
        if (!copyBuffer || copyBuffer.length === 0) return;
        get().pushHistory();
        set((s) => {
          let z = nextZ(s.template);
          
          // Se o elemento copiado veio de um ambiente isolado (não possui frameId ou veio de fora),
          // nós o colamos dentro da página ativa (activeFrameId) se houver uma!
          const activeFrame = s.template.frames.find((f) => f.id === s.activeFrameId) ?? s.template.frames[0];
          
          let minX = Infinity;
          let minY = Infinity;
          copyBuffer.forEach((e: any) => {
            if (e.x < minX) minX = e.x;
            if (e.y < minY) minY = e.y;
          });
          
          const isFromIsolatedOrNoFrame = copyBuffer.some((e: any) => !e.frameId || !s.template.frames.some(f => f.id === e.frameId));
          
          const copies = copyBuffer.map((e: any) => {
            const clone = structuredClone(e);
            let nx = e.x + 24;
            let ny = e.y + 24;
            let frameId = e.frameId;
            
            if (isFromIsolatedOrNoFrame && activeFrame) {
              nx = activeFrame.x + (e.x - (minX === Infinity ? 0 : minX)) + 24;
              ny = activeFrame.y + (e.y - (minY === Infinity ? 0 : minY)) + 24;
              frameId = activeFrame.id;
            }
            
            return {
              ...clone,
              id: newId(e.type),
              x: nx,
              y: ny,
              zIndex: z++,
              frameId,
            };
          });
          return {
            template: {
              ...s.template,
              elements: [...s.template.elements, ...copies],
            },
            selectedIds: copies.map((c) => c.id),
          };
        });
      },
      selectAllInActiveFrame: () => {
        const { template, activeFrameId } = get();
        const frame =
          template.frames.find((f) => f.id === activeFrameId) ??
          template.frames[0];
        if (!frame) return;
        const ids = template.elements
          .filter(
            (el) =>
              el.frameId === frame.id ||
              (el.x >= frame.x &&
                el.y >= frame.y &&
                el.x + el.width <= frame.x + frame.width + 1 &&
                el.y + el.height <= frame.y + frame.height + 1),
          )
          .map((el) => el.id);
        set({ selectedIds: ids });
      },

      setViewport: (v) =>
        set((s) => ({ viewport: { ...s.viewport, ...v } })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnap: () => set((s) => ({ snap: !s.snap })),
      setMode: (m) => set({ mode: m }),
      toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
      setConsoleLayout: (patch) =>
        set((s) => ({ consoleLayout: { ...s.consoleLayout, ...patch } })),
      pushRecentColor: (color, replaceColor) =>
        set((s) => {
          if (!color) return s;
          const cleanColor = color.trim().toLowerCase();
          const cleanReplace = replaceColor?.trim().toLowerCase();
          let filtered = s.recentColors;
          if (cleanReplace) {
            filtered = filtered.filter((c) => c.toLowerCase() !== cleanReplace);
          }
          const recent = [cleanColor, ...filtered.filter((c) => c.toLowerCase() !== cleanColor)].slice(0, 16);
          return { recentColors: recent };
        }),
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
      markSaved: () => set({ dirty: false, lastSavedAt: Date.now() }),

      setDataJsonText: (text) => {
        try {
          const parsed = JSON.parse(text);
          const extracted = extractPathsFromDataJson(parsed).sort();
          set({ 
            dataJsonText: text, 
            dataJson: parsed,
            availableVariables: extracted
          });
        } catch {
          set({ dataJsonText: text });
        }
      },
      setTestExpression: (e) => set({ testExpression: e }),

      saveSelectionAsComponent: (name) => {
        const { selectedIds, template } = get();
        const tree = template.elements.filter((e) =>
          selectedIds.includes(e.id),
        );
        if (tree.length === 0) return;
        const minX = Math.min(...tree.map((e) => e.x));
        const minY = Math.min(...tree.map((e) => e.y));
        const normalized = tree.map((e) => ({
          ...structuredClone(e),
          x: e.x - minX,
          y: e.y - minY,
          frameId: undefined,
        }));
        const comp: ReusableComponent = {
          id: newId("comp"),
          name: name || "Componente sem nome",
          category: "custom",
          elementTree: normalized,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          reusableComponents: [...s.reusableComponents, comp],
        }));
      },
      saveSelectionAsComponentWithMeta: (name, category, variables) => {
        const { selectedIds, template } = get();
        const tree = template.elements.filter((e) =>
          selectedIds.includes(e.id),
        );
        if (tree.length === 0) return;
        const minX = Math.min(...tree.map((e) => e.x));
        const minY = Math.min(...tree.map((e) => e.y));
        const normalized = tree.map((e) => ({
          ...structuredClone(e),
          x: e.x - minX,
          y: e.y - minY,
          frameId: undefined,
        }));
        const comp: ReusableComponent = {
          id: newId("comp"),
          name: name || "Componente sem nome",
          category: (category as ReusableComponent["category"]) || "custom",
          elementTree: normalized,
          variables: variables || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          reusableComponents: [...s.reusableComponents, comp],
        }));
      },
      insertComponent: (componentId, pos) => {
        const { reusableComponents } = get();
        const comp = reusableComponents.find((c) => c.id === componentId);
        if (!comp) return;
        get().pushHistory();
        set((s) => {
          let z = nextZ(s.template);
          const gId = newId("group_comp");
          const copies = comp.elementTree.map((e) => ({
            ...structuredClone(e),
            id: newId(e.type),
            x: e.x + pos.x,
            y: e.y + pos.y,
            zIndex: z++,
            groupId: gId,
            componentId: comp.id,
            arguments: {},
          }));
          return {
            template: {
              ...s.template,
              elements: [...s.template.elements, ...copies],
            },
            selectedIds: copies.map((c) => c.id),
          };
        });
      },
      updateGroupArguments: (groupId, args) => {
        get().pushHistory();
        set((s) => {
          const elements = s.template.elements.map((el) => {
            if (el.groupId === groupId) {
              return {
                ...el,
                arguments: {
                  ...(el.arguments ?? {}),
                  ...args,
                },
              };
            }
            return el;
          });
          return {
            template: {
              ...s.template,
              elements,
            },
          };
        });
      },
      removeComponent: (id) =>
        set((s) => ({
          reusableComponents: s.reusableComponents.filter((c) => c.id !== id),
        })),
      importComponents: (items) =>
        set((s) => ({
          reusableComponents: [...s.reusableComponents, ...items],
        })),
      addLegacyBlock: (blockId, pos, frameId) => {
        const block = LEGACY_BLOCKS.find((b) => b.id === blockId);
        if (!block) return;
        get().pushHistory();
        const { snap, template } = get();
        const grid = template.canvas.grid;
        
        const gId = newId("group");
        let z = nextZ(template);
        const newEls = block.elements.map((elTemplate) => {
          const el = {
            ...structuredClone(elTemplate),
            id: newId(elTemplate.type),
            frameId,
            zIndex: z++,
            x: snapCoord(pos.x + elTemplate.x, grid, snap),
            y: snapCoord(pos.y + elTemplate.y, grid, snap),
            groupId: gId,
          };
          return el;
        }) as TemplateElement[];
        
        set((s) => ({
          template: {
            ...s.template,
            elements: [...s.template.elements, ...newEls],
          },
          selectedIds: newEls.map((e) => e.id),
        }));
      },
      updateCanvas: (patch) => {
        get().pushHistory();
        set((s) => ({
          template: {
            ...s.template,
            canvas: {
              ...s.template.canvas,
              ...patch,
            },
          },
        }));
      },
      updateMetadata: (patch) => {
        get().pushHistory();
        set((s) => ({
          template: {
            ...s.template,
            metadata: {
              ...(s.template.metadata || {}),
              ...patch,
            },
          },
        }));
      },
    }),
    {
      name: "report-drawer:session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (s) => ({
        template: s.template,
        viewport: s.viewport,
        showGrid: s.showGrid,
        snap: s.snap,
        mode: s.mode,
        dataJsonText: s.dataJsonText,
        dataJson: s.dataJson,
        testExpression: s.testExpression,
        reusableComponents: s.reusableComponents,
        consoleOpen: s.consoleOpen,
        consoleLayout: s.consoleLayout,
        recentColors: s.recentColors,
        activeTemplateId: s.activeTemplateId,
        activeProductId: s.activeProductId,
        htmlInspectorOpen: s.htmlInspectorOpen,
        rightPanelOpen: s.rightPanelOpen,
        activeRightTab: s.activeRightTab,
        leftPanelTab: s.leftPanelTab,
        selectedConsultaIds: s.selectedConsultaIds,
        selectedScenarios: s.selectedScenarios,
        headerFooterEnabled: s.headerFooterEnabled,
        headerHeight: s.headerHeight,
        footerHeight: s.footerHeight,
        replicateOnNewPages: s.replicateOnNewPages,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state && state.dataJson) {
          const extracted = extractPathsFromDataJson(state.dataJson).sort();
          state.setAvailableVariables(extracted);
        }
      },
    },
  ),
);

export function useEvaluationContext(): unknown {
  const dataJson = useEditorStore((s) => s.dataJson);
  const template = useEditorStore((s) => s.template);
  return useMemo(() => {
    return injectMeasures(dataJson, template.measures || []);
  }, [dataJson, template.measures]);
}
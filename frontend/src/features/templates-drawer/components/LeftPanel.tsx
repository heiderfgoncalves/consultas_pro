import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../store/editor.store";
import { useIsolatedEditorStore } from "../store/isolated-editor.store";
import type { ElementType, FramePreset } from "../schema/template";
import { cn } from "@/lib/utils";
import {
  Type, Image as ImageIcon, Minus, Square, Table as TableIcon, Layers,
  Trash2, Download, Upload, List, Star, Plus, Copy, ArrowUp, ArrowDown,
  ChevronDown, Heading, User, Coins, Gauge, ShieldAlert, AlertTriangle, Building2, Gavel, AlignJustify, LayoutTemplate,
  Database, RefreshCcw, FileText, Play, Save, Sliders, Loader2, Check, Search, ChevronRight, HelpCircle,
  Calendar, Key, Hash, CheckSquare, Braces, FolderOpen, ListCollapse, Calculator, Edit3, Sparkles, X, Code2
} from "lucide-react";
import { LEGACY_BLOCKS } from "../utils/legacy-blocks";
import { FrameInspectorPopover } from "./RightInspector";

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "block-header": Heading,
  "block-customer-data": User,
  "block-financial-summary": Coins,
  "block-credit-score": Gauge,
  "block-serasa": ShieldAlert,
  "block-spc": AlertTriangle,
  "block-bacen": Building2,
  "block-protestos": Gavel,
  "block-footer": AlignJustify,
};

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { PRESET_LIST } from "../utils/frames-presets";
import { confirmDialog } from "./dialogs/ConfirmDialog";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/authStore";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getTemplatesApi,
  patchTemplateLayoutApi,
  getTemplateMvpConfigApi,
  putTemplateMvpConfigApi,
  getTemplateMvpPoolApi,
  previewTemplateMvpApi,
  getProviders,
  mapApiProduct,
  getCanonicalFields,
  mapCanonicalToFieldTypes,
  patchCanonicalFieldApi,
} from "@/api/admin-integrations";
import type {
  MvpTemplateKey,
  MvpDocumentType,
  TemplateMvpConfig,
  TemplateMvpPoolItem,
  ProviderConsultation,
} from "@/types/integrations";
import { resolveExpression } from "../engine/resolveExpression";
import { buildTypeLinkedConsultationMappedPreview } from "@/lib/consultationMappedPreview";
import { buildTypeKeyedDataForDrawer } from "@/lib/buildTypeKeyedDataForDrawer";
import { buildByTypeWithGlobalDedupRemoved } from "@/lib/providerResponseMapping";

type Tab = "elements" | "blocks" | "pages" | "pipeline";

const ELEMENTS: { type: ElementType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "text", label: "Texto", Icon: Type },
  { type: "image", label: "Imagem", Icon: ImageIcon },
  { type: "icon", label: "Ícone", Icon: Star },
  { type: "list", label: "Lista", Icon: List },
  { type: "divider", label: "Divisor", Icon: Minus },
  { type: "card", label: "Card", Icon: Square },
  { type: "table", label: "Tabela", Icon: TableIcon },
  { type: "container", label: "Container", Icon: Layers },
];

function getFlatPathsForCatalog(obj: any, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") return [];

  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        paths.push(path);
        if (value.length > 0 && typeof value[0] === "object") {
          const subPaths = getFlatPathsForCatalog(value[0], `${path}[*]`);
          paths.push(...subPaths);
        }
      } else {
        paths.push(path);
        paths.push(...getFlatPathsForCatalog(value, path));
      }
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function setDeepLocal(target: Record<string, any>, path: string, value: any) {
  const parts = path.split('.');
  let current: Record<string, any> = target;

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    if (isLast) {
      if (
        current[part] &&
        typeof current[part] === 'object' &&
        !Array.isArray(current[part]) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        current[part] = { ...current[part], ...value };
      } else {
        current[part] = value;
      }
      return;
    }

    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }

    current = current[part] as Record<string, any>;
  });
}

function extractByJsonPathLocal(path: string, data: any): any {
  if (!path) return undefined;
  let cleanPath = path.trim();
  if (cleanPath.startsWith("$.")) {
    cleanPath = cleanPath.substring(2);
  } else if (cleanPath.startsWith("$")) {
    cleanPath = cleanPath.substring(1);
  }
  if (cleanPath === "") return data;

  const wildcardIdx = cleanPath.indexOf("[*]");
  if (wildcardIdx === -1) {
    return resolveExpression(cleanPath, data);
  }

  const prefix = cleanPath.substring(0, wildcardIdx);
  const suffix = cleanPath.substring(wildcardIdx + 3);

  const arrayVal = resolveExpression(prefix, data);
  if (!Array.isArray(arrayVal)) {
    return [];
  }

  if (!suffix || suffix === "." || suffix === "") {
    return arrayVal;
  }

  const cleanSuffix = suffix.startsWith(".") ? suffix.substring(1) : suffix;

  return arrayVal.map(item => {
    if (item === null || item === undefined) return undefined;
    return resolveExpression(cleanSuffix, item);
  });
}

function normalizePayloadLocal(rawPayload: any, mappings: any[]) {
  const normalized: Record<string, any> = {};
  const arrayGroups = new Map<string, Array<{ suffix: string; values: any[] }>>();

  for (const mapping of mappings) {
    const jsonPath = mapping.jsonPath || "";
    const extracted = extractByJsonPathLocal(jsonPath, rawPayload);

    const pathKey = mapping.fieldTypeKey;

    if (pathKey.includes('[].')) {
      const [arrayKey, suffix] = pathKey.split('[].');
      if (!arrayGroups.has(arrayKey)) {
        arrayGroups.set(arrayKey, []);
      }
      arrayGroups.get(arrayKey)!.push({
        suffix,
        values: Array.isArray(extracted) ? extracted : (extracted !== undefined ? [extracted] : []),
      });
      continue;
    }

    const value = Array.isArray(extracted) && extracted.length === 1 ? extracted[0] : extracted;
    if (value !== undefined) {
      setDeepLocal(normalized, pathKey, value);
    }
  }

  for (const [arrayKey, groupedMappings] of arrayGroups.entries()) {
    const maxLength = groupedMappings.reduce((acc, item) => Math.max(acc, item.values.length), 0);
    const rows = Array.from({ length: maxLength }, () => ({} as Record<string, any>));

    for (const grouped of groupedMappings) {
      for (let index = 0; index < maxLength; index += 1) {
        const value = grouped.values[index];
        if (value !== undefined) {
          setDeepLocal(rows[index]!, grouped.suffix, value);
        }
      }
    }

    normalized[arrayKey] = rows.filter((row) => Object.keys(row).length > 0);
  }

  return normalized;
}

export function LeftPanel() {
  const tab = useEditorStore((s) => s.leftPanelTab);
  const setTab = useEditorStore((s) => s.setLeftPanelTab);
  const [openSections, setExpandedSections] = useState<Record<string, boolean>>({
    tipos: true,
    personalizados: true,
    legados: false
  });
  
  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const openEditor = useIsolatedEditorStore((s) => s.openEditor);
  const accessToken = useAuthStore((s) => s.accessToken);

  const patchCanonicalFieldMutation = useMutation({
    mutationFn: ({ fieldId, body }: { fieldId: string; body: Record<string, any> }) =>
      patchCanonicalFieldApi(accessToken, fieldId, body),
    onSuccess: () => {
      canonicalFieldsQuery.refetch();
      toast.success("Layout do Tipo Canônico salvo com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar layout do tipo: ${err?.message || "Erro desconhecido"}`);
    }
  });

  const frames = useEditorStore((s) => s.template.frames);
  const activeFrame = useEditorStore((s) => s.activeFrameId);
  const activeFrameObj = useEditorStore((s) => s.template.frames.find((f) => f.id === activeFrame));
  const addLegacyBlock = useEditorStore((s) => s.addLegacyBlock);
  const setActiveFrame = useEditorStore((s) => s.setActiveFrame);
  const removeFrame = useEditorStore((s) => s.removeFrame);
  const duplicateFrame = useEditorStore((s) => s.duplicateFrame);
  const reorderFrame = useEditorStore((s) => s.reorderFrame);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const addFrame = useEditorStore((s) => s.addFrame);
  const setViewport = useEditorStore((s) => s.setViewport);

  const components = useEditorStore((s) => s.reusableComponents);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const importComponents = useEditorStore((s) => s.importComponents);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const loadTemplate = useEditorStore((s) => s.loadTemplate);

  // Integração com Produção & Estado de autenticação
  // Integração com Produção & Estado de autenticação
  const activeTemplateId = useEditorStore((s) => s.activeTemplateId);
  const setActiveTemplateId = useEditorStore((s) => s.setActiveTemplateId);
  const currentLayoutJson = useEditorStore((s) => s.template);
  const measures = currentLayoutJson.measures || [];

  // Estados da store para a aba de integração (suporte a seleção múltipla de fontes de dados)
  const selectedConsultaIds = useEditorStore((s) => s.selectedConsultaIds);
  const setSelectedConsultaIds = useEditorStore((s) => s.setSelectedConsultaIds);
  const selectedScenarios = useEditorStore((s) => s.selectedScenarios);
  const setSelectedScenarios = useEditorStore((s) => s.setSelectedScenarios);

  // Estados adicionais para busca e exibição de variáveis sistêmicas e tipos
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [showAllFields, setShowAllFields] = useState(false);

  // Estados para gerenciamento de Medidas Calculadas & Assistente (Wizard)
  const addMeasure = useEditorStore((s) => s.addMeasure);
  const updateMeasure = useEditorStore((s) => s.updateMeasure);
  const removeMeasure = useEditorStore((s) => s.removeMeasure);
  const availableVariables = useEditorStore((s) => s.availableVariables || []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<{
    id?: string;
    name: string;
    expression: string;
    description?: string;
    dataType?: "currency" | "percent" | "integer" | "decimal" | "text";
  } | null>(null);

  // Assistente de agregação reativo por cliques (BI Quick Builder)
  const [assistantFunc, setAssistantFunc] = useState<string>("sum");
  const [assistantPath, setAssistantPath] = useState<string>("");

  const aggregatePaths = useMemo(() => {
    const aggs = new Set<string>();
    for (const path of availableVariables) {
      if (path.includes("[0].")) {
        // Ex: DIVIDAS_SPC[0].valor -> DIVIDAS_SPC[*].valor
        const specific = path.replace(/\[\d+\]\./g, "[*].");
        aggs.add(specific);
        
        // Ex: [0].valor -> [*].valor
        const firstBracket = path.indexOf("[");
        if (firstBracket !== -1) {
          const sub = path.substring(firstBracket).replace(/\[\d+\]\./g, "[*].");
          aggs.add(sub);
        }
      } else if (!path.includes("[")) {
        aggs.add(path);
      }
    }
    return Array.from(aggs).sort();
  }, [availableVariables]);

  useEffect(() => {
    if (!assistantPath && aggregatePaths.length > 0) {
      setAssistantPath(aggregatePaths[0]);
    }
  }, [aggregatePaths, assistantPath]);

  const handleOpenNew = () => {
    setEditingMeasure({ name: "", expression: "", description: "", dataType: "currency" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMeasure({
      id: m.id,
      name: m.name,
      expression: m.expression,
      description: m.description,
      dataType: m.dataType || "currency"
    });
    setIsModalOpen(true);
  };

  const handleGenerateAssistantFormula = () => {
    if (!assistantPath) {
      toast.error("Selecione um campo de origem!");
      return;
    }
    
    let generated = "";
    if (assistantFunc === "none") {
      generated = `$${assistantPath}`;
    } else {
      generated = `${assistantFunc}($${assistantPath})`;
    }
    
    if (editingMeasure) {
      const currentExpr = editingMeasure.expression;
      const separator = currentExpr && !currentExpr.endsWith(" ") ? " " : "";
      setEditingMeasure({
        ...editingMeasure,
        expression: currentExpr + separator + generated
      });
      toast.success("Fórmula injetada no editor com sucesso!");
    }
  };

  const handleSave = () => {
    if (!editingMeasure) return;
    
    const { id, name, expression, description, dataType } = editingMeasure;
    
    const cleanName = name.trim().replace(/\s+/g, "_").toLowerCase();
    if (!cleanName) {
      toast.error("Nome da medida é obrigatório!");
      return;
    }

    if (!expression.trim()) {
      toast.error("Fórmula da medida é obrigatória!");
      return;
    }

    const exists = measures.some((m) => m.id !== id && m.name.toLowerCase() === cleanName);
    if (exists) {
      toast.error(`Já existe uma medida calculada com o nome "${cleanName}"!`);
      return;
    }

    if (id) {
      updateMeasure(id, {
        name: cleanName,
        expression: expression.trim(),
        description: description?.trim(),
        dataType
      });
      toast.success(`Medida "${cleanName}" atualizada!`);
    } else {
      addMeasure({
        name: cleanName,
        expression: expression.trim(),
        description: description?.trim(),
        dataType
      });
      toast.success(`Medida "${cleanName}" criada com sucesso!`);
    }

    setIsModalOpen(false);
    setEditingMeasure(null);
  };

  // 1. Query de Provedores e Consultas (Produtos de Provedor)
  const providersQuery = useQuery({
    queryKey: ['admin-providers-integration'],
    queryFn: () => getProviders(accessToken),
    enabled: !!accessToken,
  });

  // 2. Query de Templates de Produção
  const templatesQuery = useQuery({
    queryKey: ['production-templates-integration'],
    queryFn: () => getTemplatesApi(accessToken),
    enabled: !!accessToken,
  });

  // 3. Query do Pool de Homologação (Mocks)
  const poolQuery = useQuery({
    queryKey: ['templates-mvp-pool-integration'],
    queryFn: () => getTemplateMvpPoolApi(accessToken),
    enabled: !!accessToken,
  });

  // 4. Query de Campos Canônicos
  const canonicalFieldsQuery = useQuery({
    queryKey: ['admin-canonical-fields-integration'],
    queryFn: () => getCanonicalFields(accessToken),
    enabled: !!accessToken,
  });

  const dataJson = useEditorStore((s) => s.dataJson) as Record<string, any> | null;

  const toggleTypeExpanded = (key: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fieldTypes = useMemo(() => {
    return mapCanonicalToFieldTypes(canonicalFieldsQuery.data ?? []);
  }, [canonicalFieldsQuery.data]);

  // Mapeamentos de dados derivados
  const consultations = useMemo(() => {
    const raw = providersQuery.data ?? [];
    const out: ProviderConsultation[] = [];
    for (const p of raw) {
      for (const prod of p.products ?? []) {
        out.push(mapApiProduct(prod, p.id));
      }
    }
    return out;
  }, [providersQuery.data]);

  // 1. Obter chaves de tipos que estão de fato mapeadas nas consultas ativas selecionadas
  const activeFieldTypeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const id of selectedConsultaIds) {
      const consultation = consultations.find((c) => c.id === id);
      if (consultation && consultation.fieldMappings) {
        for (const m of consultation.fieldMappings) {
          if (m.fieldTypeKey) {
            keys.add(m.fieldTypeKey);
          }
        }
      }
    }
    return keys;
  }, [selectedConsultaIds, consultations]);

  const dynamicFieldTypes = useMemo(() => {

    // Filtra fieldTypes para manter apenas os que estão em activeFieldTypeKeys
    const activeFieldTypes = fieldTypes.filter((ft) => activeFieldTypeKeys.has(ft.key));

    const realTypesMapped = activeFieldTypes.map((ft) => {
      const dataKey = dataJson ? Object.keys(dataJson).find(k => k.toLowerCase() === ft.key.toLowerCase()) : null;
      const value = dataKey ? dataJson[dataKey] : undefined;
      
      const hasValue = value && typeof value === "object" && (
        Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0
      );

      const hasConfiguredFields = (ft.reportFieldConfig?.fields ?? []).length > 0;
      let fields: Array<{ id: string; key: string; expression: string; label: string }> = [];

      const configured = (ft.reportFieldConfig?.fields ?? []).map((f) => {
        const expr = `{$${ft.key}.${f.key}}`;
        return {
          id: String(f.id || f.key),
          key: f.key,
          expression: expr,
          label: f.label || f.key,
        };
      });

      // Coleta computedFields reais configurados nas consultas selecionadas que pertencem a este tipo canônico
      const calculatedFields: typeof configured = [];
      for (const id of selectedConsultaIds) {
        const consultation = consultations.find((c) => c.id === id);
        if (consultation && consultation.typeItemFilters?.[ft.key]) {
          const typeItemConfig = consultation.typeItemFilters[ft.key];
          if (typeItemConfig && Array.isArray(typeItemConfig.computedFields)) {
            for (const comp of typeItemConfig.computedFields) {
              if (comp.key && !calculatedFields.some((f) => f.key === comp.key)) {
                const isGlobal = selectedConsultaIds.some((sId) => {
                  const c = consultations.find((x) => x.id === sId);
                  return c?.typeItemFilters?.['default']?.computedFields?.some(
                    (dm) => dm.key?.toLowerCase() === comp.key.toLowerCase()
                  );
                });
                if (!isGlobal) {
                  calculatedFields.push({
                    id: `${ft.key}.${comp.key}`,
                    key: comp.key,
                    expression: `{$${ft.key}.${comp.key}}`,
                    label: comp.label || comp.key,
                  });
                }
              }
            }
          }
        }
      }

      if (showAllFields) {
        // Se showAllFields (ALL) estiver marcado:
        // 1. Extrai campos dinâmicos do JSON de simulação se houver
        const dynamicPaths = hasValue ? getFlatPathsForCatalog(value, ft.key) : [];
        const dynamic = dynamicPaths.map((path) => {
          const expression = `{$${path}}`;
          const labelSuffix = path.substring(ft.key.length + 1);
          return {
            id: path,
            key: path,
            expression,
            label: labelSuffix || path,
          };
        });

        // 2. Mescla removendo duplicatas pela expressão
        const mergedMap = new Map<string, typeof configured[number]>();
        for (const f of configured) {
          mergedMap.set(f.expression, f);
        }
        for (const f of calculatedFields) {
          mergedMap.set(f.expression, f);
        }
        for (const f of dynamic) {
          mergedMap.set(f.expression, f);
        }
        fields = Array.from(mergedMap.values());
      } else {
        // Se showAllFields (ALL) estiver desmarcado (padrão):
        // Mostra apenas os configurados + calculados
        fields = [...configured, ...calculatedFields];
      }

      return {
        key: ft.key,
        label: ft.label,
        fields,
        hasConfiguredFields,
      };
    }).filter((ft) => {
      if (showAllFields) {
        return true;
      } else {
        // Se desmarcado, exibe o tipo apenas se possuir campos configurados no sistema OR tiver campos reais na simulação
        return ft.hasConfiguredFields || ft.fields.length > 0;
      }
    });

    return realTypesMapped;
  }, [fieldTypes, dataJson, showAllFields, activeFieldTypeKeys, selectedConsultaIds, consultations]);

  const systemVariables = useMemo(() => [
    { key: "template.protocol", expression: "{$template.protocol}", label: "Protocolo" },
    { key: "template.date", expression: "{$template.date}", label: "Data/Hora atual" },
    { key: "template.company", expression: "{$template.company}", label: "Empresa" }
  ], []);

  // Filtra as sistêmicas
  const filteredSystemVars = useMemo(() => {
    if (!searchQuery) return systemVariables;
    return systemVariables.filter(v =>
      v.expression.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, systemVariables]);

  // Filtra os tipos de consulta e seus campos dinâmicos
  const filteredFieldTypes = useMemo(() => {
    if (!searchQuery) return dynamicFieldTypes;
    return dynamicFieldTypes.map(ft => {
      const filteredFields = ft.fields.filter(f => {
        return f.expression.toLowerCase().includes(searchQuery.toLowerCase()) ||
               f.label.toLowerCase().includes(searchQuery.toLowerCase());
      });

      const typeMatches = ft.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ft.key.toLowerCase().includes(searchQuery.toLowerCase());

      return {
        ...ft,
        fieldsToDisplay: typeMatches ? ft.fields : filteredFields
      };
    }).filter(ft => (ft.fieldsToDisplay && ft.fieldsToDisplay.length > 0) || ft.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dynamicFieldTypes, searchQuery]);

  // Expande automaticamente os acordeões que têm correspondência durante a busca
  useEffect(() => {
    if (searchQuery) {
      const autoExpanded: Record<string, boolean> = {};
      for (const ft of filteredFieldTypes) {
        autoExpanded[ft.key] = true;
      }
      setExpandedTypes(autoExpanded);
    }
  }, [searchQuery, filteredFieldTypes]);

  const poolByProduct = useMemo(() => {
    const rows = poolQuery.data ?? [];
    return rows.reduce<Record<string, TemplateMvpPoolItem[]>>((acc, row) => {
      const key = row.providerProductId;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(row);
      return acc;
    }, {});
  }, [poolQuery.data]);

  // Função para mesclar reativamente os payloads das consultas ativas em um único JSON de simulação
  const mergeAndApplyPayloads = (ids: string[], scenarios: Record<string, string>) => {
    const mergedPayload: Record<string, any> = {};

    function helperParse(v: any) {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      const cleaned = String(v)
        .replace(/[R$\s%]/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }

    for (const consultaId of ids) {
      const scenarioId = scenarios[consultaId];
      const poolItem = scenarioId && scenarioId !== "__none__" ? poolQuery.data?.find((p) => p.id === scenarioId) : undefined;
      const consultation = consultations.find((c) => c.id === consultaId);
      
      const draftResponse = useEditorStore.getState().draftSampleResponses?.[consultaId];
      const isDraftModified = draftResponse && draftResponse !== consultation?.sampleResponse;

      // 1. Rascunho em edição ativa
      // 2. Cenário explicitamente selecionado
      // 3. Payload salvo na consulta
      let rawPayload = isDraftModified 
        ? draftResponse 
        : (poolItem?.payload || consultation?.sampleResponse);
      if (rawPayload) {
        try {
          const payloadObj = typeof rawPayload === "string"
            ? JSON.parse(rawPayload)
            : rawPayload;
          
          const rawPayloadStr = typeof rawPayload === "string"
            ? rawPayload
            : JSON.stringify(rawPayload);

          if (consultation && consultation.fieldMappings && consultation.fieldMappings.length > 0) {
            // 1. Processar cada Tipo Canônico cadastrado usando o processador canônico de dados do Drawer
            for (const ft of fieldTypes) {
              const mapsForType = consultation.fieldMappings.filter(
                (m) => m.fieldTypeKey === ft.key
              );

              if (mapsForType.length > 0) {
                const typeItemFilterConfig = consultation.typeItemFilters?.[ft.key] || {
                  fieldMappings: [],
                  computedFields: [],
                  dedupFieldIds: [],
                };

                const parsedVal = buildTypeKeyedDataForDrawer({
                  sampleResponse: rawPayloadStr,
                  trechoMappings: mapsForType,
                  fieldType: ft,
                  typeItemFilterConfig: typeItemFilterConfig as any,
                });

                if (parsedVal) {
                  mergedPayload[ft.key] = parsedVal;
                } else {
                  // Se o processamento retornar nulo (por falta de mapeamento de-para de campos),
                  // inicializamos uma estrutura limpa padrão para evitar erros, conforme alinhamento.
                  mergedPayload[ft.key] = [];
                }
              }
            }

            // 2. Processar mappings legados/órfãos que não pertencem a nenhum Tipo Canônico do catálogo
            const orphanMappings = consultation.fieldMappings.filter(
              (m) => !fieldTypes.some((ft) => ft.key === m.fieldTypeKey)
            );

            if (orphanMappings.length > 0) {
              const normalizedOrphans = normalizePayloadLocal(payloadObj, orphanMappings);
              for (const [key, val] of Object.entries(normalizedOrphans)) {
                if (
                  mergedPayload[key] &&
                  typeof mergedPayload[key] === "object" &&
                  !Array.isArray(mergedPayload[key]) &&
                  val &&
                  typeof val === "object" &&
                  !Array.isArray(val)
                ) {
                  mergedPayload[key] = { ...mergedPayload[key], ...val };
                } else {
                  mergedPayload[key] = val;
                }
              }
            }
          } else {
            // Se a consulta não tem mappings, faz dump completo na raiz
            for (const [key, val] of Object.entries(payloadObj)) {
              if (
                mergedPayload[key] &&
                typeof mergedPayload[key] === "object" &&
                !Array.isArray(mergedPayload[key]) &&
                val &&
                typeof val === "object" &&
                !Array.isArray(val)
              ) {
                mergedPayload[key] = { ...mergedPayload[key], ...val };
              } else {
                mergedPayload[key] = val;
              }
            }
          }
        } catch (e) {
          console.error("Erro ao mesclar payload da consulta:", e);
        }
      }
    }

    // 2.5. Executar Deduplicação Global/Cross-Type se houver múltiplos tipos de dívidas
    const activeDebtTypes = ["DIVIDAS_SPC", "DIVIDAS_SERASA", "DIVIDAS_BOA_VISTA"].filter(
      (key) => mergedPayload[key] && Array.isArray(mergedPayload[key]) && mergedPayload[key].length > 0
    );

    if (activeDebtTypes.length > 1) {
      const rowInfo = new Map<string, {
        rows: Record<string, unknown>[];
        dedupKeys: string[];
        dedupSummary?: Record<string, unknown>;
        dedupKeyToCanonical?: Map<string, string>;
      }>();

      const typeKeysInOrder = activeDebtTypes;

      for (const ftKey of activeDebtTypes) {
        const typeData = mergedPayload[ftKey];
        let dedupKeys: string[] = [];
        const dedupKeyToCanonical = new Map<string, string>();

        for (const id of ids) {
          const consultation = consultations.find((c) => c.id === id);
          const filterConfig = consultation?.typeItemFilters?.[ftKey];
          if (filterConfig && Array.isArray(filterConfig.dedupFieldIds) && filterConfig.dedupFieldIds.length > 0) {
            const dedupFieldIdSet = new Set(filterConfig.dedupFieldIds);
            
            if (Array.isArray(filterConfig.fieldMappings)) {
              for (const mapping of filterConfig.fieldMappings) {
                if (dedupFieldIdSet.has(mapping.reportFieldId)) {
                  const fieldDef = fieldTypes
                    .find((f) => f.key === ftKey)
                    ?.reportFieldConfig?.fields?.find((f) => f.id === mapping.reportFieldId);
                  
                  if (fieldDef?.key) {
                    dedupKeys.push(fieldDef.key);
                    dedupKeyToCanonical.set(fieldDef.key, fieldDef.key);
                  }
                }
              }
            }
          }
        }

        if (dedupKeys.length > 0) {
          dedupKeys = [...new Set(dedupKeys)];
          rowInfo.set(ftKey, {
            rows: typeData,
            dedupKeys,
            dedupKeyToCanonical,
          });
        }
      }

      const byTypeObj: Record<string, any> = {};
      for (const ftKey of activeDebtTypes) {
        byTypeObj[ftKey] = mergedPayload[ftKey];
      }

      const cleaned = buildByTypeWithGlobalDedupRemoved(byTypeObj, typeKeysInOrder, rowInfo);

      for (const ftKey of activeDebtTypes) {
        if (cleaned[ftKey]) {
          mergedPayload[ftKey] = cleaned[ftKey];
        }
      }
    }

    const payloadStr = JSON.stringify(mergedPayload, null, 2);
    useEditorStore.getState().setDataJsonText(payloadStr);
  };

  const handleCopyVariable = (expression: string) => {
    navigator.clipboard.writeText(expression);
    window.dispatchEvent(
      new CustomEvent("rd:insert-formula", {
        detail: { text: expression }
      })
    );
    toast.success(`Expressão "${expression}" copiada e inserida!`);
  };

  // Sincronização automática em tempo real e Cérebro Centralizador de Dados
  useEffect(() => {
    if (consultations.length > 0 && poolQuery.data && poolQuery.data.length > 0) {
      if (selectedConsultaIds.length === 0) {
        // Inicialização de fallback: se o usuário não tem nenhuma consulta ativa selecionada na store
        const initialIds = consultations.map((c) => c.id);
        const initialScenarios: Record<string, string> = {};
        for (const id of initialIds) {
          const productScenarios = poolByProduct[id] || [];
          if (productScenarios.length > 0) {
            // inicializar como Vazio (Rascunho) por padrão em vez de forçar o primeiro cenário
            initialScenarios[id] = "__none__";
          }
        }
        setSelectedConsultaIds(initialIds);
        setSelectedScenarios(initialScenarios);
        mergeAndApplyPayloads(initialIds, initialScenarios);
      } else {
        // Sincronização ativa em tempo real: se o usuário já tem consultas selecionadas na store (reidratadas ou ativas),
        // nós processamos os dados simulados síncronamente usando as configurações mais recentes das consultas do banco de dados!
        mergeAndApplyPayloads(selectedConsultaIds, selectedScenarios);
      }
    }
  }, [consultations, poolQuery.data, selectedConsultaIds, selectedScenarios]);

  // Efeito reativo para sincronizar as variáveis canônicas e dinâmicas na store global do editor
  useEffect(() => {
    const vars: string[] = [];
    
    // 1. Extrair variáveis dos Tipos Canônicos/Dicionário se disponíveis
    if (dynamicFieldTypes && dynamicFieldTypes.length > 0) {
      for (const ft of dynamicFieldTypes) {
        for (const f of ft.fields) {
          const match = f.expression.match(/\{\$(.+)\}/);
          if (match && match[1]) {
            vars.push(match[1]);
          } else {
            const clean = f.expression.replace(/[{}$]/g, "");
            if (clean) vars.push(clean);
          }
        }
      }
    }

    // 2. Extrair recursivamente caminhos de dados do dataJson ativo (Payload de simulação)
    if (dataJson && typeof dataJson === "object") {
      const extractPaths = (obj: any, currentPath = ""): string[] => {
        if (obj === null || typeof obj !== "object") {
          return currentPath ? [currentPath] : [];
        }
        
        if (Array.isArray(obj)) {
          const paths = [currentPath];
          if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
            const firstObjPaths = extractPaths(obj[0], currentPath ? `${currentPath}[0]` : "");
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
          paths.push(...extractPaths(obj[key], nextPath));
        }

        return paths;
      };

      try {
        const jsonPaths = extractPaths(dataJson);
        vars.push(...jsonPaths);
      } catch (err) {
        console.error("Erro ao extrair caminhos do dataJson:", err);
      }
    }

    // Remover duplicidades e ordenar
    const uniqueVars = Array.from(new Set(vars)).sort();
    if (uniqueVars.length > 0) {
      useEditorStore.getState().setAvailableVariables(uniqueVars);
    }
  }, [dynamicFieldTypes, dataJson]);

  useEffect(() => {
    const handleOpenNewEvent = () => {
      handleOpenNew();
    };
    const handleOpenWizardEvent = () => {
      handleOpenWizard();
    };

    window.addEventListener("rd:open-new-measure", handleOpenNewEvent);
    window.addEventListener("rd:open-wizard-measure", handleOpenWizardEvent);

    return () => {
      window.removeEventListener("rd:open-new-measure", handleOpenNewEvent);
      window.removeEventListener("rd:open-wizard-measure", handleOpenWizardEvent);
    };
  }, [availableVariables]);

  function exportComponents() {
    const blob = new Blob([JSON.stringify(components, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "components.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(String(r.result));
          if (Array.isArray(parsed)) importComponents(parsed);
        } catch {
          alert("JSON inválido");
        }
      };
      r.readAsText(file);
    };
    input.click();
  }

  return (
    <div
      className="flex border-r text-xs select-none h-full min-h-0 w-full"
      style={{ background: "var(--editor-panel)" }}
    >
      {/* Sidebar vertical estreita de ícones */}
      <div className="w-[48px] bg-slate-900 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 gap-4 shrink-0">
        {[
          { id: "elements", label: "Componentes", Icon: Plus },
          { id: "blocks", label: "Blocos Rápidos", Icon: LayoutTemplate },
          { id: "pages", label: "Páginas", Icon: FileText },
          { id: "pipeline", label: "Transformação de Dados", Icon: Sliders },
        ].map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={cn(
                "p-2 rounded-lg relative text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all duration-200 group cursor-pointer",
                isActive && "bg-[var(--editor-ribbon-accent)] text-white font-semibold"
              )}
              title={t.label}
            >
              <t.Icon className="size-5" />
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-white rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo do Painel Ativo */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950/20">
        {/* Título da Aba no Topo do Conteúdo */}
        <div className="h-9 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/10 shrink-0">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-400">
            {tab === "elements" && "Componentes do Editor"}
            {tab === "blocks" && "Blocos Rápidos de Layout"}
            {tab === "pages" && "Páginas & Documentos"}
            {tab === "pipeline" && "Transformação & Modelagem de Dados"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 pr-2.5 min-h-0 scrollbar-thin">
          {tab === "elements" && (
            <div className="grid grid-cols-2 gap-2">
              {ELEMENTS.map((el) => (
                <div
                  key={el.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-rd-element", el.type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 hover:bg-indigo-500/5 cursor-grab active:cursor-grabbing transition-all group"
                >
                  <el.Icon className="size-5 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[11px] font-medium text-slate-750 dark:text-slate-300 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">{el.label}</span>
                </div>
              ))}
              <p className="col-span-2 text-[10px] text-muted-foreground mt-2 leading-snug">
                Arraste qualquer elemento para o canvas. Solte dentro de um frame
                para vincular automaticamente.
              </p>
            </div>
          )}

          {tab === "pages" && (
            <div className="space-y-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full mb-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
                    <Plus className="size-3.5" /> Nova página <ChevronDown className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-slate-900 border-slate-800 text-slate-200">
                  {PRESET_LIST.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => addFrame(p.id as FramePreset)} className="text-xs hover:bg-slate-800 focus:bg-slate-800">
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {frames.map((f, idx) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setActiveFrame(f.id);
                    setViewport({
                      x: -f.x * 0.6 + 80,
                      y: -f.y * 0.6 + 80,
                      zoom: 0.6,
                    });
                  }}
                  className={cn(
                    "group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-slate-900/60 transition-colors border border-transparent",
                    activeFrame === f.id && "bg-slate-900 border-slate-800 text-slate-100",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <input
                      value={f.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateFrame(f.id, { name: e.target.value })}
                      className="font-semibold text-slate-200 bg-transparent border-none outline-none w-full px-0 hover:bg-slate-800/50 focus:bg-slate-850 rounded text-xs transition-colors"
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {f.preset} · {f.width}×{f.height}
                    </div>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                    <FrameInspectorPopover frameId={f.id}>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-slate-800 rounded"
                        title="Propriedades da página"
                      >
                        <Sliders className="size-3 text-muted-foreground hover:text-indigo-400" />
                      </button>
                    </FrameInspectorPopover>
                    <button
                      onClick={(e) => { e.stopPropagation(); reorderFrame(f.id, -1); }}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ArrowUp className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reorderFrame(f.id, 1); }}
                      disabled={idx === frames.length - 1}
                      className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateFrame(f.id); }}
                      className="p-1 hover:bg-slate-800 rounded"
                      title="Duplicar página"
                    >
                      <Copy className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDialog({
                          title: `Excluir página "${f.name}"?`,
                          description: "Os elementos vinculados também serão removidos.",
                          destructive: true,
                          confirmLabel: "Excluir",
                          onConfirm: () => {
                            removeFrame(f.id);
                            toast.success(`Página "${f.name}" excluída.`);
                          },
                        });
                      }}
                      className="p-1 hover:bg-slate-800 rounded hover:text-red-500"
                      title="Remover"
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "blocks" && (
            <div className="space-y-4">
              
              {/* ACORDEÃO 1: TIPOS CANÔNICOS */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/10 shadow-sm">
                <button
                  onClick={() => toggleSection("tipos")}
                  className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-450 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Database className="size-3.5 text-indigo-500" />
                    <span>Tipos Canônicos ({dynamicFieldTypes.length})</span>
                  </span>
                  <ChevronDown className={cn("size-3.5 transition-transform", openSections.tipos && "rotate-180")} />
                </button>

                {openSections.tipos && (
                  <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/5">
                    {dynamicFieldTypes.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center p-4">Carregando catálogo de tipos...</p>
                    )}
                    {dynamicFieldTypes.map((ft, idx) => (
                      <div
                        key={ft.id || ft.key || `ft-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-rd-canonical-field", JSON.stringify(ft));
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => {
                          // Inserção inteligente
                          const tree = ft.reportFieldConfig?.elementTree ?? [];
                          if (tree.length > 0) {
                            useEditorStore.getState().pushHistory();
                            let maxZ = useEditorStore.getState().template.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
                            const defaultX = activeFrameObj ? activeFrameObj.x + 40 : 40;
                            const defaultY = activeFrameObj ? activeFrameObj.y + 40 : 40;
                            
                            const copies = tree.map((e: any) => ({
                              ...structuredClone(e),
                              id: Math.random().toString(36).substring(2, 9),
                              frameId: activeFrame || undefined,
                              x: e.x + defaultX,
                              y: e.y + defaultY,
                              zIndex: ++maxZ,
                            }));
                            useEditorStore.setState((s) => ({
                              template: {
                                ...s.template,
                                elements: [...s.template.elements, ...copies]
                              },
                              selectedIds: copies.map((c) => c.id)
                            }));
                            toast.success(`Layout do Tipo "${ft.label}" inserido.`);
                          } else {
                            const defaultX = activeFrameObj ? activeFrameObj.x + 40 : 40;
                            const defaultY = activeFrameObj ? activeFrameObj.y + 40 : 40;
                            const elId = useEditorStore.getState().addElement("text", { x: defaultX, y: defaultY }, activeFrame || undefined);
                            useEditorStore.getState().updateElement(elId, {
                              name: ft.label,
                              width: 180,
                              height: 30,
                              binding: {
                                mode: "expression",
                                expression: ft.key,
                                fallback: ft.label
                              },
                              style: {
                                fontSize: 12,
                                color: "#0f172a",
                                fontWeight: 600
                              }
                            });
                            toast.success(`Expressão "${ft.label}" inserida.`);
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-200 group cursor-grab active:cursor-grabbing"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                            <span className="truncate">{ft.label}</span>
                            {ft.reportFieldConfig?.elementTree && ft.reportFieldConfig.elementTree.length > 0 && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 shrink-0">VISUAL</span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono truncate mt-0.5">{ft.key}</div>
                        </div>

                        {/* Hover Lápis de Edição Isolada */}
                        <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditor({
                                targetType: "canonicalField",
                                targetId: ft.id,
                                elementTree: ft.reportFieldConfig?.elementTree ?? [],
                                code: ft.reportFieldConfig?.code ?? "",
                                format: ft.reportFieldConfig?.format ?? "html",
                                onSave: async (newTree, newCode, newFormat) => {
                                  await patchCanonicalFieldMutation.mutateAsync({
                                    fieldId: ft.id,
                                    body: {
                                      reportFieldConfig: {
                                        version: 1,
                                        fields: ft.reportFieldConfig?.fields ?? [],
                                        code: newCode,
                                        format: newFormat,
                                        elementTree: newTree
                                      }
                                    }
                                  });
                                }
                              });
                            }}
                            className="p-1 hover:bg-indigo-600/10 hover:text-indigo-500 text-slate-400 rounded transition-all cursor-pointer"
                            title="Editar layout/código do Tipo"
                          >
                            <Sliders className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACORDEÃO 2: COMPONENTES PERSONALIZADOS */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/10 shadow-sm">
                <div
                  className="px-3 py-2.5 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/20 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-450 transition-colors"
                >
                  <button
                    onClick={() => toggleSection("personalizados")}
                    className="flex-1 flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Star className="size-3.5 text-indigo-500" />
                    <span>Personalizados ({components.length})</span>
                  </button>
                  
                  {/* Ferramentas do Acordeão */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => {
                        if (selectedIds.length === 0) {
                          toast.warning("Selecione elementos no canvas primeiro.");
                          return;
                        }
                        window.dispatchEvent(new CustomEvent("rd:open-save-component"));
                      }}
                      className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[8px] transition-colors cursor-pointer"
                      title="Salvar seleção como componente"
                    >
                      CRIAR
                    </button>
                    <button
                      onClick={importFile}
                      className="p-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                      title="Importar componentes (.json)"
                    >
                      <Upload className="size-3" />
                    </button>
                    <button
                      onClick={exportComponents}
                      className="p-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                      title="Exportar componentes"
                    >
                      <Download className="size-3" />
                    </button>
                    <button
                      onClick={() => toggleSection("personalizados")}
                      className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", openSections.personalizados && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {openSections.personalizados && (
                  <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/5">
                    {components.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center p-4">
                        Nenhum componente salvo. Selecione elementos no canvas e clique em "CRIAR".
                      </p>
                    )}
                    {components.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-rd-component", c.id);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => {
                          const defaultX = activeFrameObj ? activeFrameObj.x + 10 : 10;
                          const defaultY = activeFrameObj ? activeFrameObj.y + 10 : 10;
                          useEditorStore.getState().insertComponent(c.id, { x: defaultX, y: defaultY });
                          toast.success(`Componente "${c.name}" inserido.`);
                        }}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-250 group cursor-grab active:cursor-grabbing"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {c.name}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{c.elementTree.length} elementos</div>
                        </div>

                        {/* Hover Lápis & Lixeira */}
                        <div className="flex items-center gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditor({
                                targetType: "component",
                                targetId: c.id,
                                elementTree: c.elementTree ?? [],
                                code: "",
                                format: "html",
                                onSave: async (newTree) => {
                                  useEditorStore.setState((s) => ({
                                    reusableComponents: s.reusableComponents.map((comp) =>
                                      comp.id === c.id ? { ...comp, elementTree: newTree, updatedAt: new Date().toISOString() } : comp
                                    )
                                  }));
                                  toast.success("Componente personalizado atualizado!");
                                }
                              });
                            }}
                            className="p-1 hover:bg-indigo-600/10 hover:text-indigo-500 text-slate-400 rounded transition-colors cursor-pointer"
                            title="Editar layout do Componente"
                          >
                            <Sliders className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeComponent(c.id);
                              toast.success(`Componente "${c.name}" excluído.`);
                            }}
                            className="p-1 hover:bg-red-500/10 hover:text-red-500 text-slate-400 rounded transition-colors cursor-pointer"
                            title="Excluir componente"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACORDEÃO 3: BLOCOS LEGADOS */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/10 shadow-sm">
                <button
                  onClick={() => toggleSection("legados")}
                  className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-450 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <LayoutTemplate className="size-3.5 text-indigo-500" />
                    <span>Blocos Legados ({LEGACY_BLOCKS.length})</span>
                  </span>
                  <ChevronDown className={cn("size-3.5 transition-transform", openSections.legados && "rotate-180")} />
                </button>

                {openSections.legados && (
                  <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/5">
                    {LEGACY_BLOCKS.map((block) => {
                      const Icon = BLOCK_ICONS[block.id] || LayoutTemplate;
                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-rd-legacy-block", block.id);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => {
                            const defaultX = activeFrameObj ? activeFrameObj.x + 10 : 10;
                            const defaultY = activeFrameObj ? activeFrameObj.y + 10 : 10;
                            addLegacyBlock(block.id, { x: defaultX, y: defaultY }, activeFrame || undefined);
                            toast.success(`Bloco "${block.name}" adicionado.`);
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-250 cursor-grab active:cursor-grabbing text-left group"
                        >
                          <div
                            className="size-7 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${block.color}15`, color: block.color }}
                          >
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs truncate">
                              {block.name}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">
                              {block.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "pipeline" && (
            <div className="space-y-1.5 text-[10px] pr-1 animate-in fade-in-30 duration-200 flex flex-col h-full min-h-0">
              {/* Seção 2: Simulação Multi-Consulta */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5 space-y-1 shrink-0">
                <div className="font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1 uppercase text-[8.5px] tracking-wide justify-between">
                  <span className="flex items-center gap-1">
                    <Database className="size-3 text-indigo-500" />
                    <span>Fontes & Mocks (Simulação)</span>
                  </span>
                  
                  {/* Tooltip com descrição */}
                  <div className="relative group flex items-center justify-center shrink-0 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors">
                    <HelpCircle className="size-3" />
                    <div className="absolute top-full right-0 mt-1.5 hidden group-hover:block w-48 p-2 rounded-lg bg-slate-900 dark:bg-slate-950 text-[9px] text-slate-200 border border-slate-800 shadow-2xl z-50 font-normal normal-case leading-normal animate-in fade-in-50 duration-150">
                      Selecione produtos de consulta para simular cenários e mesclar seus retornos brutos.
                    </div>
                  </div>
                </div>

                {providersQuery.isLoading || poolQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] py-2 justify-center">
                    <Loader2 className="size-3 animate-spin text-indigo-500" /> Carregando produtos...
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1 scrollbar-thin">
                    {consultations.map((c) => {
                      const isChecked = selectedConsultaIds.includes(c.id);
                      const scenarios = poolByProduct[c.id] || [];
                      const activeScenarioId = selectedScenarios[c.id] || "";

                      return (
                        <div
                          key={c.id}
                          className="py-0.5 border-b border-slate-150 dark:border-slate-850/40 transition-all duration-150 flex flex-col gap-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              id={`chk-${c.id}`}
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let nextIds = [...selectedConsultaIds];
                                let nextScenarios = { ...selectedScenarios };
                                if (e.target.checked) {
                                  nextIds.push(c.id);
                                } else {
                                  nextIds = nextIds.filter((id) => id !== c.id);
                                  delete nextScenarios[c.id];
                                }
                                setSelectedConsultaIds(nextIds);
                                setSelectedScenarios(nextScenarios);
                              }}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-650 dark:text-indigo-500 focus:ring-indigo-500 size-3 cursor-pointer"
                            />
                            <label
                              htmlFor={`chk-${c.id}`}
                              className={cn(
                                "font-bold text-[9.5px] cursor-pointer select-none flex-1 truncate transition-colors",
                                isChecked ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {c.name}
                            </label>
                          </div>

                          {isChecked && scenarios.length > 0 && (
                            <div className="pl-4 pr-px pb-px space-y-0.5 animate-in fade-in-50 duration-200">
                              <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Cenário (Mock / Payload)
                              </span>
                              <Select
                                value={activeScenarioId || "__none__"}
                                onValueChange={(val) => {
                                  const nextScenarios = { ...selectedScenarios, [c.id]: val };
                                  setSelectedScenarios(nextScenarios);
                                  toast.success("Cenário de simulação atualizado e mesclado!");
                                }}
                              >
                                <SelectTrigger className="h-5 text-[9px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 rounded-md shadow-2xs py-0 px-1.5">
                                  <SelectValue placeholder="Selecione o cenário..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-200 rounded-md">
                                  <SelectItem value="__none__" className="text-[9px] focus:bg-slate-100 dark:focus:bg-slate-900">
                                    Nenhum mock (Vazio)
                                  </SelectItem>
                                  {scenarios.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-[9px] focus:bg-slate-100 dark:focus:bg-slate-900">
                                      {p.document} ({p.hasDebt ? "Restrição" : "Sem Dívidas"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ÁRVORE DINÂMICA DE VARIÁVEIS JSON (DADOS) */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0 pt-0.5">
                <div className="font-bold text-slate-850 dark:text-slate-200 flex items-center justify-between uppercase text-[10px] tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1.5 shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Database className="size-3.5 text-indigo-500" />
                    <span>Dados</span>
                    
                    {/* Hover Help Popover */}
                    <div className="relative group/help flex items-center justify-center shrink-0 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors">
                      <HelpCircle className="size-3.5" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/help:block w-56 p-2 rounded-lg bg-slate-900 dark:bg-slate-950 text-[10px] text-slate-200 border border-slate-800 shadow-2xl z-50 font-normal normal-case leading-normal animate-in fade-in-50 duration-150">
                        <p className="font-bold mb-1 text-slate-100">Como usar as variáveis?</p>
                        Dê um <strong>clique simples</strong> em qualquer campo abaixo para inseri-lo de forma inteligente na barra de fórmulas ativa. O formato de mapeamento correspondente será copiado automaticamente.
                      </div>
                    </div>
                  </span>

                  <div className="flex items-center gap-1.5 normal-case tracking-normal">
                    {/* Medidas Calculadas Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150/70 dark:border-indigo-900/50 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer shadow-2xs">
                          <Calculator className="size-3" />
                          <span>Medidas ({measures.length})</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                        <CalculatedMeasuresPanel
                          searchQuery={searchQuery}
                          onOpenNew={handleOpenNew}
                          onOpenEdit={handleOpenEdit}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="relative shrink-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar nos payloads brutos..."
                    className="w-full pl-8 pr-2.5 py-1 text-[10px] border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  />
                  <Search className="absolute left-2.5 top-1.5 size-3 text-slate-400" />
                </div>
                
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <JsonVariableTree searchQuery={searchQuery} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL UNIFICADO AVANÇADO DE GESTÃO DE MEDIDAS E BI (ESTILO POWER BI / MAPEAMENTO DE CAMPOS - 2 COLUNAS PREMIUM) */}
      <Dialog 
        open={isModalOpen && !!editingMeasure} 
        onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false);
            setEditingMeasure(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[850px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 flex flex-col">
          
          {/* Cabeçalho cinza platina elegante */}
          <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 px-5 flex items-center justify-between">
            <DialogHeader className="p-0 flex-1">
              <DialogTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calculator className="size-4 text-indigo-500" />
                <span>Painel Analítico de Medidas & Business Intelligence (BI)</span>
              </DialogTitle>
              <DialogDescription className="hidden">
                Crie fórmulas, agregações e lógicas de BI em tempo real para o seu relatório.
              </DialogDescription>
            </DialogHeader>
            <button
              onClick={() => { setIsModalOpen(false); setEditingMeasure(null); }}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Grid de Conteúdo - Duas Colunas */}
          <div className="grid grid-cols-12 divide-x divide-slate-200 dark:divide-slate-800/80 flex-1 min-h-[420px]">
            
            {/* Coluna Esquerda: Configuração Base & Formatação de Saída (col-span-5) */}
            <div className="col-span-5 p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Nome da Medida */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Type className="size-3.5 text-slate-400" />
                    <span>Nome Único da Medida</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: total_apontado, media_score"
                    value={editingMeasure?.name || ""}
                    onChange={(e) => setEditingMeasure(editingMeasure ? { ...editingMeasure, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors shadow-xs text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 italic block leading-relaxed">
                    Disponível no canvas como <code className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1 rounded">medida.{editingMeasure?.name || "nome"}</code>
                  </span>
                </div>

                {/* Descrição Opcional */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="size-3.5 text-slate-400" />
                    <span>Descrição / Propósito Analítico</span>
                  </label>
                  <textarea
                    placeholder="Comente o objetivo de negócio desta medida..."
                    value={editingMeasure?.description || ""}
                    onChange={(e) => setEditingMeasure(editingMeasure ? { ...editingMeasure, description: e.target.value } : null)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors shadow-xs text-xs resize-none"
                  />
                </div>

                {/* Tipo de Dado de Saída ( dataType ) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-indigo-500" />
                    <span>Formatação Visual de Saída</span>
                  </label>
                  <select
                    value={editingMeasure?.dataType || "currency"}
                    onChange={(e) => setEditingMeasure(editingMeasure ? { ...editingMeasure, dataType: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors cursor-pointer shadow-xs text-xs font-medium"
                  >
                    <option value="currency">Moeda BRL (R$ 29.754,70)</option>
                    <option value="percent">Percentual (10,5%)</option>
                    <option value="integer">Número Inteiro (1.234)</option>
                    <option value="decimal">Número Decimal (1.234,56)</option>
                    <option value="text">Texto Livre / Geral (Sem formatação)</option>
                  </select>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block leading-tight">
                    O canvas formatará o valor calculado automaticamente de acordo com o tipo escolhido.
                  </span>
                </div>
              </div>

              {/* Dicas de Expressão estilo Microsoft PBI */}
              <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 space-y-1.5 mt-auto">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Code2 className="size-3.5" />
                  <span>Exemplos de Sintaxe</span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                  <div>• <code className="text-indigo-650 dark:text-indigo-300">sum($dividas_spc[*].valor)</code></div>
                  <div>• <code className="text-indigo-650 dark:text-indigo-300">IF($score &gt;= 700, "Aprovado", "Análise")</code></div>
                  <div>• <code className="text-indigo-650 dark:text-indigo-300">sum($[*].totalapontado)</code></div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Editor Monospace + BI Quick Builder (col-span-7) */}
            <div className="col-span-7 p-5 flex flex-col space-y-4 bg-white dark:bg-slate-950">
              {/* Seção 1: Editor de Fórmula Monospace */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="font-sans font-bold text-[11px] text-indigo-500">fx</span>
                    <span>Editor de Fórmula</span>
                  </label>
                  <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/30 select-none">
                    Expressão DAX-JS
                  </span>
                </div>
                
                <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-xs bg-slate-50 dark:bg-slate-900/10">
                  {/* Barra de Fórmulas estilo MS Excel / Power BI */}
                  <div className="bg-slate-100/80 dark:bg-slate-900/80 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setEditingMeasure(editingMeasure ? { ...editingMeasure, expression: "" } : null)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all cursor-pointer flex items-center justify-center"
                      title="Limpar expressão (✗)"
                    >
                      <X className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="p-1 rounded text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-750 transition-all cursor-pointer flex items-center justify-center mr-1"
                      title="Confirmar medida (✓)"
                    >
                      <Check className="size-3.5 stroke-[2.5]" />
                    </button>
                    
                    <div className="w-px h-4 bg-slate-250 dark:bg-slate-750 mx-1" />
                    <span className="font-serif italic font-extrabold text-[12px] text-slate-500 px-1">fx</span>
                    <div className="w-px h-4 bg-slate-250 dark:bg-slate-750 mx-1" />
                    
                    <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 ml-1">
                      {editingMeasure?.name ? `[${editingMeasure.name.trim().toLowerCase().replace(/\s+/g, "_")}]` : "[nova_medida]"} =
                    </span>
                  </div>
                  
                  <textarea
                    placeholder="// Escreva sua expressão livre ou use o assistente de BI abaixo...&#10;// Ex: sum($dividas_spc[*].valor)"
                    value={editingMeasure?.expression || ""}
                    onChange={(e) => setEditingMeasure(editingMeasure ? { ...editingMeasure, expression: e.target.value } : null)}
                    className="flex-1 w-full font-mono text-[12px] p-3.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none border-none resize-none leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-650"
                  />
                </div>
              </div>

              {/* Seção 2: BI Quick Builder (Assistente Reativo por Cliques) */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-violet-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    BI Quick Builder (Assistente de Fórmulas)
                  </span>
                </div>
                
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-lg space-y-3 shadow-2xs">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Seleção de Função de Agregação */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Agregador (f)</label>
                      <select
                        value={assistantFunc}
                        onChange={(e) => setAssistantFunc(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none text-xs font-semibold cursor-pointer"
                      >
                        <option value="sum">Soma (sum)</option>
                        <option value="avg">Média (avg)</option>
                        <option value="count">Contagem (count)</option>
                        <option value="min">Mínimo (min)</option>
                        <option value="max">Máximo (max)</option>
                        <option value="none">Nenhum (Apenas Campo)</option>
                      </select>
                    </div>

                    {/* Seleção da Chave do JSON */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Campo de Origem (JSON)</label>
                      <select
                        value={assistantPath}
                        onChange={(e) => setAssistantPath(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-150 rounded-md outline-none text-xs font-mono cursor-pointer"
                      >
                        {aggregatePaths.map((path) => (
                          <option key={path} value={path}>
                            {path}
                          </option>
                        ))}
                        {aggregatePaths.length === 0 && (
                          <option value="">Nenhum campo disponível</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Botão para injetar */}
                  <button
                    type="button"
                    onClick={handleGenerateAssistantFormula}
                    className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                  >
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Injetar na Fórmula</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Rodapé cinza platina sutil */}
          <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 px-5 flex items-center justify-end gap-2 text-xs">
            <button
              onClick={() => { setIsModalOpen(false); setEditingMeasure(null); }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold transition-colors cursor-pointer shadow-sm shadow-indigo-500/10"
            >
              Salvar Medida
            </button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTES AUXILIARES PARA ÁRVORE DE VARIÁVEIS JSON (ESTILO MODELAGEM DE DADOS) ---

interface VariableTypeInfo {
  type: "id" | "date" | "boolean" | "number" | "array" | "object" | "string";
  label: string;
  colorClass: string;
}

function getVariableTypeInfo(key: string, value: any): VariableTypeInfo {
  const lowercaseKey = key.toLowerCase();
  
  // 1. Identificar se é chave primária / ID
  if (
    lowercaseKey === "id" || 
    lowercaseKey.endsWith("id") || 
    lowercaseKey.endsWith("key") || 
    lowercaseKey.endsWith("codigo") || 
    lowercaseKey.endsWith("código")
  ) {
    return {
      type: "id",
      label: "ID / Chave",
      colorClass: "text-slate-400 dark:text-slate-500"
    };
  }
  
  // 2. Identificar se é data/hora
  const isDateValue = typeof value === "string" && (
    /^\d{4}-\d{2}-\d{2}/.test(value) || 
    lowercaseKey.includes("data") || 
    lowercaseKey.includes("date") || 
    lowercaseKey.includes("criadoem") || 
    lowercaseKey.includes("atualizadoem")
  );
  if (isDateValue) {
    return {
      type: "date",
      label: "Data / Hora",
      colorClass: "text-emerald-500 dark:text-emerald-400"
    };
  }
  
  // 3. Identificar se é booleano
  if (typeof value === "boolean") {
    return {
      type: "boolean",
      label: "Booleano",
      colorClass: "text-purple-500 dark:text-purple-400"
    };
  }
  
  // 4. Identificar se é número
  if (typeof value === "number") {
    return {
      type: "number",
      label: "Número / Medida",
      colorClass: "text-amber-500 dark:text-amber-400"
    };
  }
  
  // 5. Identificar se é array
  if (Array.isArray(value)) {
    return {
      type: "array",
      label: "Tabela / Array",
      colorClass: "text-indigo-500 dark:text-indigo-400"
    };
  }
  
  // 6. Identificar se é objeto
  if (typeof value === "object" && value !== null) {
    return {
      type: "object",
      label: "Objeto / Pasta",
      colorClass: "text-blue-500 dark:text-blue-400"
    };
  }
  
  // Default: Texto
  return {
    type: "string",
    label: "Texto / Coluna",
    colorClass: "text-sky-500 dark:text-sky-400"
  };
}

function nodeMatchesSearch(name: string, value: any, path: string, query: string): boolean {
  if (!query) return true;
  const lowercaseQuery = query.toLowerCase();
  
  // Se o próprio nome ou caminho corresponderem
  if (name.toLowerCase().includes(lowercaseQuery) || path.toLowerCase().includes(lowercaseQuery)) {
    return true;
  }
  
  // Se for primitivo e o valor corresponder
  if (typeof value !== "object" || value === null) {
    return String(value).toLowerCase().includes(lowercaseQuery);
  }
  
  // Se for array ou objeto, verifica recursivamente se algum filho corresponde
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return Object.entries(value[0]).some(([key, val]) => 
        nodeMatchesSearch(key, val, `${path}[*].${key}`, query)
      );
    }
    return false;
  }
  
  return Object.entries(value).some(([key, val]) => 
    nodeMatchesSearch(key, val, `${path}.${key}`, query)
  );
}

interface VariableNodeProps {
  name: string;
  value: any;
  path: string;
  searchQuery?: string;
}

function JsonVariableNode({ name, value, path, searchQuery }: VariableNodeProps) {
  const [collapsed, setCollapsed] = useState(true);
  const isObject = typeof value === "object" && value !== null;
  const isArray = Array.isArray(value);
  const typeInfo = getVariableTypeInfo(name, value);

  // Efeito reativo: Se houver busca ativa, expande automaticamente os nós correspondentes
  useEffect(() => {
    if (searchQuery) {
      setCollapsed(false);
    } else {
      setCollapsed(true);
    }
  }, [searchQuery]);

  // Se houver busca e este nó (ou seus descendentes) não corresponder, oculta ele
  if (searchQuery && !nodeMatchesSearch(name, value, path, searchQuery)) {
    return null;
  }

  const handleSelectNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedExpression = `{{$${path}}}`;
    const insertExpression = `$${path}`;

    // Copiar para clipboard
    navigator.clipboard.writeText(formattedExpression);

    // Disparar injeção direta na FormulaBar
    window.dispatchEvent(
      new CustomEvent("rd:insert-formula", {
        detail: { text: insertExpression }
      })
    );

    toast.success(`Expressão "${formattedExpression}" copiada e injetada!`);
  };

  const renderIcon = () => {
    switch (typeInfo.type) {
      case "id":
        return <Key className="size-3 text-slate-400 shrink-0" title="Identificador único" />;
      case "date":
        return <Calendar className="size-3 text-emerald-500 shrink-0" title="Data / Hora" />;
      case "boolean":
        return <CheckSquare className="size-3 text-purple-500 shrink-0" title="Verdadeiro / Falso" />;
      case "number":
        return (
          <span className="font-sans text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200 dark:border-amber-900/30 select-none shrink-0" title="Número / Medida">
            Σ
          </span>
        );
      case "array":
        return <ListCollapse className="size-3 text-indigo-500 shrink-0" title="Array / Lista" />;
      case "object":
        return <Braces className="size-3 text-blue-500 shrink-0" title="Objeto JSON" />;
      default:
        return (
          <span className="font-sans text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-0.5 py-px rounded border border-sky-200 dark:border-sky-900/30 select-none shrink-0 leading-none" title="Texto / String">
            abc
          </span>
        );
    }
  };

  if (!isObject) {
    const strVal = value === null ? "null" : String(value);
    const truncatedVal = strVal.length > 25 ? strVal.slice(0, 22) + "..." : strVal;

    return (
      <div
        onClick={handleSelectNode}
        className="flex items-center justify-between py-px px-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-900/40 group cursor-pointer text-[9px] font-mono transition-all duration-150 overflow-hidden"
        title={`Clique para inserir: {{$${path}}}\nValor: ${strVal}`}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 whitespace-nowrap flex-nowrap overflow-hidden">
          {renderIcon()}
          <span className="text-slate-700 dark:text-slate-300 font-sans font-semibold whitespace-nowrap shrink-0 text-[9px]">{name}</span>
          <span className="text-slate-400 dark:text-slate-500 font-normal whitespace-nowrap opacity-65 truncate text-[8px]" title={strVal}>
            {value === null ? "null" : `(${truncatedVal})`}
          </span>
        </div>
        <button
          onClick={handleSelectNode}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-opacity shrink-0 ml-1"
          title="Inserir e Copiar"
        >
          <Copy className="size-3" />
        </button>
      </div>
    );
  }

  // Se for array/objeto, calcula seus filhos
  const keys = isArray
    ? (value.length > 0 && typeof value[0] === "object" && value[0] !== null ? Object.keys(value[0]) : [])
    : Object.keys(value);
  const childCount = isArray ? value.length : keys.length;

  return (
    <div className="space-y-0.5">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between py-px px-1 rounded hover:bg-slate-100/40 dark:hover:bg-slate-900/30 cursor-pointer text-[9px] font-mono group transition-all duration-150"
      >
        <div className="flex items-center gap-1 select-none min-w-0 flex-1 whitespace-nowrap flex-nowrap">
          <ChevronRight
            className={cn(
              "size-3 text-slate-400 transition-transform shrink-0 duration-200",
              !collapsed && "rotate-90"
            )}
          />
          {renderIcon()}
          <span className="font-bold text-slate-700 dark:text-slate-300 font-sans whitespace-nowrap shrink-0 text-[9px]">{name}</span>
          <span className="text-[8px] text-slate-400 dark:text-slate-500 shrink-0 font-sans bg-slate-100 dark:bg-slate-900/50 px-1 py-px rounded font-normal whitespace-nowrap">
            {isArray ? `Tabela [${childCount}]` : `Objeto {${childCount}}`}
          </span>
        </div>

        <button
          onClick={handleSelectNode}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-opacity shrink-0"
          title={`Inserir caminho: {{$${path}}}`}
        >
          <Copy className="size-3" />
        </button>
      </div>

      {!collapsed && (
        <div className="pl-2 border-l border-slate-150 dark:border-slate-800/80 ml-2 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
          {keys.map((key) => {
            const childPath = isArray
              ? `${path}[*].${key}`
              : path
                ? `${path}.${key}`
                : key;
            return (
              <JsonVariableNode
                key={key}
                name={key}
                value={isArray ? value[0][key] : value[key]}
                path={childPath}
                searchQuery={searchQuery}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const FRIENDLY_NAMES: Record<string, string> = {
  sistema: "Variáveis Globais de Sistema",
  cliente: "Dados Cadastrais & Cliente",
  spc: "Análise de Restrições SPC Brasil",
  serasa: "Análise de Crédito Serasa Experian",
  receita: "Receita Federal (RFB)",
  quod: "Cadastro Positivo Quod",
  sintegra: "Sintegra (Inscrição Estadual)",
  bacen: "Bacen CCS / SCR",
  protestos: "IEPTB Protestos de Títulos",
};

interface JsonVariableTreeProps {
  searchQuery?: string;
}

function JsonVariableTree({ searchQuery }: JsonVariableTreeProps) {
  const dataJson = useEditorStore((s) => s.dataJson) as Record<string, any> | null;

  if (!dataJson || typeof dataJson !== "object" || Object.keys(dataJson).length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 p-4 text-[11px] text-slate-400 leading-relaxed rounded-xl">
        Nenhum dado de simulação disponível.<br />Marque as fontes de dados e cenários acima.
      </div>
    );
  }

  // Se houver busca, calcula se existe algum nó que bate com a busca no objeto inteiro
  const filteredKeys = Object.keys(dataJson).filter((key) => {
    if (!searchQuery) return true;
    return nodeMatchesSearch(key, dataJson[key], key, searchQuery);
  });

  return (
    <div className="space-y-2 animate-in fade-in-30 duration-200 flex-1 flex flex-col min-h-0">
      <div className="max-h-[620px] overflow-y-auto pr-1 scrollbar-thin flex-1">
        <div className="min-w-full w-max space-y-1.5 pb-1">
          {filteredKeys.map((key) => {
            const friendlyName = FRIENDLY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
            let val = dataJson[key];
            const isObject = typeof val === "object" && val !== null;
            const isArray = Array.isArray(val);
            
            let renderChildrenDirectly = isObject && !isArray;
            let childKeys = renderChildrenDirectly ? Object.keys(val) : [];
            let basePath = key;

            // REMOVE A DUPLICIDADE NA EXIBIÇÃO DOS CAMPOS NAS DIVISÓRIAS
            // Se o valor contiver exatamente um objeto cujo nome é igual à chave pai (case-insensitive),
            // desembrulhamos esse objeto interno para evitar nós colapsáveis repetidos e redundantes.
            if (renderChildrenDirectly && childKeys.length === 1 && childKeys[0].toLowerCase() === key.toLowerCase()) {
              const innerVal = val[childKeys[0]];
              if (typeof innerVal === "object" && innerVal !== null && !Array.isArray(innerVal)) {
                val = innerVal;
                childKeys = Object.keys(innerVal);
                basePath = `${key}.${childKeys[0]}`;
              }
            }

            return (
              <div key={key} className="py-1 border-b border-slate-150 dark:border-slate-850/60 space-y-0.5 transition-all">
                <div className="font-bold text-[9.5px] tracking-wide flex items-center justify-between opacity-90 pb-0.5">
                  <span className={cn(
                    "font-bold text-[8.5px] uppercase tracking-wider flex items-center gap-1.5",
                    key === "sistema" ? "text-blue-500 dark:text-blue-400" :
                    key === "cliente" ? "text-emerald-500 dark:text-emerald-400" :
                    key === "spc" ? "text-indigo-500 dark:text-indigo-400" :
                    key === "serasa" ? "text-rose-500 dark:text-rose-400" :
                    "text-slate-700 dark:text-slate-300"
                  )}>
                    <span className={cn(
                      "size-1 rounded-full shrink-0",
                      key === "sistema" ? "bg-blue-500" :
                      key === "cliente" ? "bg-emerald-500" :
                      key === "spc" ? "bg-indigo-500" :
                      key === "serasa" ? "bg-rose-500" :
                      "bg-slate-400"
                    )} />
                    {friendlyName}
                  </span>
                  <span className="font-mono text-[7.5px] font-medium text-slate-400 dark:text-slate-500 ml-4">
                    {key}
                  </span>
                </div>
                <div className="pt-0.5 space-y-0.5 pl-1">
                  {renderChildrenDirectly ? (
                    childKeys.map((ck) => {
                      const childPath = `${basePath}.${ck}`;
                      return (
                        <JsonVariableNode
                          key={ck}
                          name={ck}
                          value={val[ck]}
                          path={childPath}
                          searchQuery={searchQuery}
                        />
                      );
                    })
                  ) : (
                    <JsonVariableNode
                      name={key}
                      value={val}
                      path={basePath}
                      searchQuery={searchQuery}
                    />
                  )}
                  {renderChildrenDirectly && childKeys.length === 0 && (
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 italic pl-1">
                      Objeto vazio
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {filteredKeys.length === 0 && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-1 text-center py-4">
              Nenhum campo correspondente à busca.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface CalculatedMeasuresPanelProps {
  searchQuery?: string;
  onOpenNew: () => void;
  onOpenEdit: (m: any, e: React.MouseEvent) => void;
}

function CalculatedMeasuresPanel({ searchQuery, onOpenNew, onOpenEdit }: CalculatedMeasuresPanelProps) {
  const template = useEditorStore((s) => s.template);
  const removeMeasure = useEditorStore((s) => s.removeMeasure);

  const measures = template.measures || [];

  const filteredMeasures = useMemo(() => {
    if (!searchQuery) return measures;
    const lower = searchQuery.toLowerCase();
    return measures.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.expression.toLowerCase().includes(lower) ||
        (m.description && m.description.toLowerCase().includes(lower))
    );
  }, [measures, searchQuery]);

  const handleInsert = (measureName: string) => {
    const formattedExpression = `medida.${measureName}`;
    const insertExpression = `{{ medida.${measureName} }}`;
    
    navigator.clipboard.writeText(formattedExpression);
    
    window.dispatchEvent(
      new CustomEvent("rd:insert-formula", {
        detail: { text: insertExpression }
      })
    );
    
    toast.success(`Medida "${measureName}" copiada e injetada!`);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog({
      title: "Excluir Medida",
      message: `Tem certeza que deseja excluir a medida calculada "${name}"?`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      onConfirm: () => {
        removeMeasure(id);
        toast.success(`Medida "${name}" excluída com sucesso!`);
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in-30 duration-200">
      <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Calculator className="size-3.5 text-indigo-500" />
          <span>Medidas Calculadas & Fórmulas</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNew}
            className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Nova Medida</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredMeasures.map((m) => (
          <div
            key={m.id}
            onClick={() => handleInsert(m.name)}
            className="group py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/40 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/5 cursor-pointer transition-all flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calculator className="size-3.5 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  medida.{m.name}
                </p>
                <p className="font-mono text-[9px] text-slate-450 dark:text-slate-500 truncate">
                  {m.expression}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => onOpenEdit(m, e)}
                title="Editar Medida"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <Edit3 className="size-3" />
              </button>
              <button
                onClick={(e) => handleDelete(m.id, m.name, e)}
                title="Excluir Medida"
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        ))}

        {filteredMeasures.length === 0 && (
          <p className="text-[10px] text-slate-450 dark:text-slate-500 italic pl-1 text-center py-4">
            {measures.length === 0 ? "Nenhuma medida calculada cadastrada." : "Nenhuma medida correspondente à busca."}
          </p>
        )}
      </div>
    </div>
  );
}
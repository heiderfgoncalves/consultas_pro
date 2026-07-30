import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  Server, Plus, Pencil, Trash2, Database,
  Play, Tag, ChevronDown, ChevronRight, Search, RefreshCcw,
  Code2, Link2, Save, Hash, Filter, Undo2, Loader2, Layers3, Cog, Sliders, Braces, Eye,
  WrapText, Copy, Folder, FolderPlus, FolderOpen, ArrowLeft, MoreVertical, FolderTree, Move,
  Factory,
  Maximize2, Minimize2, X
} from 'lucide-react';
import { useIsolatedEditorStore } from '@/features/templates-drawer/store/isolated-editor.store';
import { IsolatedEditorDialog } from '@/features/templates-drawer/components/IsolatedEditorDialog';
import { SafeEditor } from '@/features/templates-drawer/components/SafeEditor';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ImperativePanelHandle } from 'react-resizable-panels';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CustomDialog, useConfirmDialog } from '@/components/CustomDialog';
import { useEditorStore } from '@/features/templates-drawer/store/editor.store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type {
  Provider, ProviderConsultation, ConsultationFieldType, FieldMapping,
  MappingItemFilter, MappingItemFilterOp, TypeItemFilterConfig,
} from '@/types/integrations';
import JsonFieldMapper from '@/components/integrations/JsonFieldMapper';
import TypeReportFieldsConfig from '@/components/integrations/TypeReportFieldsConfig';
import TemplatesMvpTab from '@/components/integrations/TemplatesMvpTab';
import IntegrationsSettingsTab from '@/components/integrations/IntegrationsSettingsTab';
import CompanyApiTokensTab from '@/components/integrations/CompanyApiTokensTab';
import { ContractAuditTab } from '@/features/data-contract-audit';
import { buildTypeLinkedConsultationMappedPreview } from '@/lib/consultationMappedPreview';
import {
  buildSingleGroupTypeItemFilterConfig,
  cloneTypeItemFilterConfig,
  countActiveTypeItemRules,
  flattenTypeItemFilterRules,
  normalizeTypeItemFilterConfig,
} from '@/lib/typeItemFilters';
import { toast } from 'sonner';
import { slugify } from '@/lib/slug';
import {
  INTEGRATIONS_TAB_QUERY_KEY,
  parseIntegrationsTabFromSearch,
  tabToIntegrationsAbaParam,
  type IntegrationsTab,
} from '@/lib/integrationsTabQuery';
import {
  authToApi,
  createCanonicalFieldApi,
  createMappingApi,
  createOperationApi,
  createProductApi,
  createProviderApi,
  deleteCanonicalFieldApi,
  deleteMappingApi,
  deleteProductApi,
  deleteProviderApi,
  getCanonicalFields,
  getProviders,
  getTestLogs,
  importDefaultCanonicalSectionsApi,
  mapApiProduct,
  mapApiProvider,
  mapCanonicalToFieldTypes,
  mapTestLogs,
  pairsToCredentials,
  patchCanonicalFieldApi,
  patchOperationApi,
  patchProductApi,
  patchProviderApi,
  testProductApi,
  testProductDraftApi,
  getCanonicalFolders,
  createCanonicalFolder,
  patchCanonicalFolder,
  deleteCanonicalFolder,
  getCanonicalFolderAssociations,
  postCanonicalFolderAssociation,
  type ApiProviderTestResult,
  type ApiTestLog,
  type ApiCanonicalFolder,
  type ApiCanonicalFieldFolderAssociation,
} from '@/api/admin-integrations';

type ConsultationTestInput =
  | {
      kind: 'saved';
      productId: string;
      testDocument?: string;
      bodyTemplate?: unknown;
      queryTemplate?: Record<string, unknown>;
      headersTemplate?: Record<string, unknown>;
    }
  | {
      kind: 'draft';
      providerId: string;
      endpointPath: string;
      method: 'GET' | 'POST';
      testDocument?: string;
      bodyTemplate?: unknown;
      queryTemplate?: Record<string, unknown>;
      headersTemplate?: Record<string, unknown>;
    };

function parseOptionalBodyTemplateJson(raw: string): { bodyTemplate?: unknown } {
  const t = raw.trim();
  if (!t) return {};
  try {
    const parsedRaw = t.replace(/:\s*`([\s\S]*?)`/g, ': "$1"');
    return { bodyTemplate: JSON.parse(parsedRaw) };
  } catch {
    toast.error('Corpo da requisição (JSON) inválido');
    throw new Error('INVALID_BODY_JSON');
  }
}

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide';
const inputCls = 'h-9 text-sm bg-background placeholder:text-muted-foreground';
const selectTriggerCls = 'h-9 text-sm';
const sectionLabelCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1';
const metaMonoCls = 'text-xs font-mono text-muted-foreground';
const cardTitleCls = 'text-sm font-semibold text-foreground';
const subtleBadgeCls = 'text-xs px-2 py-0.5 rounded font-medium';
const linkActionCls = 'text-xs font-medium transition-colors flex items-center gap-1';

/** Valor do Select ao criar consulta nova (não confundir com id de produto). */
const CONSULTATION_PICKER_NEW = '__new__';

const CONSULTATION_PICKER_STORAGE_KEY = 'consultas-pro:integrations-consultation-picker';

function readStoredConsultationPicker(consultations: ProviderConsultation[]): string | null {
  try {
    const raw = sessionStorage.getItem(CONSULTATION_PICKER_STORAGE_KEY);
    if (!raw) return null;
    if (raw === CONSULTATION_PICKER_NEW) return CONSULTATION_PICKER_NEW;
    if (consultations.some((c) => c.id === raw)) return raw;
  } catch {
    /* storage indisponível */
  }
  return null;
}

type TestLogRow = {
  id: string;
  productId?: string | null;
  consultationName: string;
  providerId: string;
  responseJson: string;
  testedAt: string;
};

type ConsultationEditorHandle = {
  save: () => void;
  revert: () => void;
  loadResponseFromLog: (entry: TestLogRow, opts?: { silent?: boolean }) => void;
};

const TYPES_TAB_FILTER_OPS: { value: MappingItemFilterOp; label: string }[] = [
  { value: 'eq', label: 'igual a' },
  { value: 'contains', label: 'contém' },
  { value: 'startsWith', label: 'começa com' },
  { value: 'endsWith', label: 'termina com' },
  { value: 'regex', label: 'regex' },
];

/** Referência estável para evitar reset do estado em LinkedConsultationCard a cada render. */
const EMPTY_LINKED_FILTERS: MappingItemFilter[] = [];

/**
 * Critérios exibidos por consulta: usa o que está salvo no produto (`typeItemFilters[pathKey]`).
 * Se essa chave não existir no JSON do produto, usa o padrão do catálogo (`uiItemFilters` do tipo),
 * para dados legados e até a primeira gravação por consulta.
 */
function linkedConsultationInitialFilters(
  pc: ProviderConsultation,
  fieldTypeKey: string,
  catalogTypes: ConsultationFieldType[],
): MappingItemFilter[] {
  const blob = pc.typeItemFilters;
  if (blob && Object.prototype.hasOwnProperty.call(blob, fieldTypeKey)) {
    const row = blob[fieldTypeKey];
    return flattenTypeItemFilterRules(row) || EMPTY_LINKED_FILTERS;
  }
  const ft = catalogTypes.find((f) => f.key === fieldTypeKey);
  return ft?.typeItemFilters ?? EMPTY_LINKED_FILTERS;
}

const emptyProvider: Partial<Provider> = {
  name: '', baseUrl: '', balanceEndpoint: '', rechargeEndpoint: '',
  authType: 'bearer', credentials: [{ key: 'token', value: '' }], status: 'active',
  custom_variables: [],
};

function ProviderModal({ open, onClose, provider, onSave, saving }: {
  open: boolean;
  onClose: () => void;
  provider?: Provider;
  onSave: (form: Partial<Provider>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Provider>>(emptyProvider);

  useEffect(() => {
    if (!open) return;
    setForm(provider ? { ...provider } : { ...emptyProvider });
  }, [open, provider]);

  const save = async () => {
    if (!form.name || !form.baseUrl) {
      toast.error('Nome e URL base são obrigatórios');
      return;
    }
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar provedor';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl gap-0 p-0 overflow-hidden bg-background border border-border rounded-xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Server className="size-5 text-indigo-500" />
            {provider ? 'Editar Provedor' : 'Novo Provedor'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure as credenciais de autenticação, endpoints padrão e variáveis de substituição do provedor
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Coluna Esquerda: Configurações Técnicas e Credenciais */}
          <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto pr-4 scrollbar-thin">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cog className="size-3.5" /> Parâmetros de Autenticação
            </h3>
            
            <div className="space-y-1">
              <label className={labelCls}>Nome</label>
              <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Sollos, EHM" className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>URL Base</label>
              <Input value={form.baseUrl || ''} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.provedor.com.br/v1" className={`${inputCls} font-mono`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Endpoint Saldo</label>
                <Input value={form.balanceEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, balanceEndpoint: e.target.value }))} placeholder="/account/balance" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Endpoint Recarga</label>
                <Input value={form.rechargeEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, rechargeEndpoint: e.target.value }))} placeholder="/account/recharge" className={`${inputCls} font-mono text-xs`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Autenticação</label>
              <Select value={form.authType} onValueChange={(v) => setForm((f) => ({ ...f, authType: v as Provider['authType'] }))}>
                <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="apikey">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {provider && (
              <div
                className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id="provider-modal-ativo"
                  checked={form.status !== 'inactive'}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, status: v === true ? 'active' : 'inactive' }))}
                />
                <Label htmlFor="provider-modal-ativo" className="cursor-pointer text-sm font-normal text-foreground">
                  Ativo
                </Label>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <label className={labelCls}>Campos de Autenticação</label>
              {(form.credentials || []).map((cred, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={cred.key}
                    onChange={(e) => {
                      const creds = [...(form.credentials || [])];
                      creds[i] = { ...creds[i], key: e.target.value };
                      setForm((f) => ({ ...f, credentials: creds }));
                    }}
                    placeholder="Chave"
                    className={`${inputCls} flex-1`}
                  />
                  <Input
                    value={cred.value}
                    onChange={(e) => {
                      const creds = [...(form.credentials || [])];
                      creds[i] = { ...creds[i], value: e.target.value };
                      setForm((f) => ({ ...f, credentials: creds }));
                    }}
                    placeholder="Valor"
                    className={`${inputCls} flex-1`}
                    type="password"
                  />
                  <button
                    type="button"
                    className="h-9 w-9 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors flex-shrink-0"
                    onClick={() => setForm((f) => ({ ...f, credentials: (f.credentials || []).filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`${linkActionCls} text-primary hover:text-primary/80 mt-1 flex items-center gap-1 text-xs`}
                onClick={() => setForm((f) => ({ ...f, credentials: [...(f.credentials || []), { key: '', value: '' }] }))}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar campo técnico
              </button>
            </div>
          </div>

          {/* Coluna Direita: Variáveis Customizadas */}
          <div className="p-6 bg-muted/20 border-l border-border dark:border-slate-800 space-y-4 max-h-[55vh] flex flex-col min-h-[300px]">
            <div className="space-y-1 shrink-0">
              <h3 className="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                <Braces className="size-4" /> Variáveis de Integração
              </h3>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Adicione chaves de substituição (ex: <code className="font-mono text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 px-1 rounded">URL_PROVEDOR_TOKEN</code>) que serão substituídas com o padrão <code className="font-mono text-indigo-500">{"{{ URL_PROVEDOR_TOKEN }}"}</code> nos corpos de requisição JSON das consultas associadas.
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {(!form.custom_variables || form.custom_variables.length === 0) ? (
                <div className="text-center py-8 px-4 bg-background border border-dashed border-border rounded-lg text-muted-foreground flex flex-col items-center justify-center gap-1.5 h-full min-h-[160px]">
                  <Braces className="size-6 text-indigo-500/50 animate-pulse" />
                  <p className="text-xs font-medium text-foreground">Nenhuma variável criada</p>
                  <p className="text-[10px] text-muted-foreground/80 max-w-[200px] leading-relaxed">
                    Você pode atribuir valores personalizados dinâmicos para utilizar na aba de Consultas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.custom_variables.map((cv, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={cv.key}
                        onChange={(e) => {
                          const list = [...(form.custom_variables || [])];
                          list[i] = { ...list[i], key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') };
                          setForm((f) => ({ ...f, custom_variables: list }));
                        }}
                        placeholder="NOME_VARIAVEL"
                        className={`${inputCls} flex-1 font-mono text-xs`}
                      />
                      <Input
                        value={cv.value}
                        onChange={(e) => {
                          const list = [...(form.custom_variables || [])];
                          list[i] = { ...list[i], value: e.target.value };
                          setForm((f) => ({ ...f, custom_variables: list }));
                        }}
                        placeholder="Valor personalizado"
                        className={`${inputCls} flex-1 text-xs`}
                      />
                      <button
                        type="button"
                        className="h-9 w-9 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors flex-shrink-0"
                        onClick={() => {
                          const list = (form.custom_variables || []).filter((_, j) => j !== i);
                          setForm((f) => ({ ...f, custom_variables: list }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 shrink-0 border-t border-border/50">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
                onClick={() => setForm((f) => ({ ...f, custom_variables: [...(f.custom_variables || []), { key: '', value: '' }] }))}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Variável
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border gap-2 bg-muted/10 shrink-0">
          <Button variant="ghost" size="default" onClick={onClose} className="text-sm h-9" disabled={saving}>Cancelar</Button>
          <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-5" onClick={() => void save()} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar Provedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldTypeModal({ open, onClose, fieldType, onSave, saving }: {
  open: boolean;
  onClose: () => void;
  fieldType?: ConsultationFieldType;
  onSave: (form: Partial<ConsultationFieldType>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<ConsultationFieldType>>({
    key: '', label: '', description: '', color: 'primary', icon: 'Tag',
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      fieldType
        ? { ...fieldType }
        : { key: '', label: '', description: '', color: 'primary', icon: 'Tag' },
    );
  }, [open, fieldType]);

  const save = async () => {
    if (!form.key || !form.label) {
      toast.error('Chave e label são obrigatórios');
      return;
    }
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar tipo';
      toast.error(msg);
    }
  };

  const colors = ['primary', 'destructive', 'warning', 'success', 'info'] as const;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">{fieldType ? 'Editar Tipo' : 'Novo Tipo'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Defina a chave e o significado desse tipo de dado</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className={labelCls}>Chave</label>
            <Input
              value={form.key || ''}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
              placeholder="DIVIDAS_SPC"
              className={`${inputCls} font-mono`}
              disabled={!!fieldType}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Label</label>
            <Input value={form.label || ''} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Dívidas SPC" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Descrição</label>
            <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Registros..." className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Título Customizado (Title)</label>
            <Input
              value={form.reportFieldConfig?.title ?? ''}
              onChange={(e) => {
                const titleVal = e.target.value;
                setForm((f) => ({
                  ...f,
                  reportFieldConfig: {
                    version: 1,
                    fields: f.reportFieldConfig?.fields ?? [],
                    ...(f.reportFieldConfig || {}),
                    title: titleVal,
                  } as any
                }));
              }}
              placeholder="Ex: Título Customizado para o Relatório"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Cor (UI)</label>
            <div className="flex gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded border transition-all ${
                    c === 'primary' ? 'bg-primary/20' :
                    c === 'destructive' ? 'bg-destructive/20' :
                    c === 'warning' ? 'bg-amber-500/20' :
                    c === 'success' ? 'bg-emerald-500/20' :
                    'bg-sky-500/20'
                  } ${form.color === c ? 'border-foreground scale-110 ring-1 ring-foreground/20' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="pt-3 gap-2">
          <Button variant="ghost" size="default" onClick={onClose} className="text-sm h-9" disabled={saving}>Cancelar</Button>
          <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9" onClick={() => void save()} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCurl(curlStr: string) {
  const result: { method: string; url: string; headers: { key: string; value: string }[]; body?: string } = {
    method: 'GET', url: '', headers: [], body: undefined,
  };
  const methodMatch = curlStr.match(/-X\s+(GET|POST|PUT|PATCH|DELETE)/i);
  if (methodMatch) result.method = methodMatch[1].toUpperCase();
  const urlMatch = curlStr.match(/curl\s+(?:.*?\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/i);
  if (urlMatch) result.url = urlMatch[1];
  const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
  let hMatch;
  while ((hMatch = headerRegex.exec(curlStr)) !== null) {
    const colonIdx = hMatch[1].indexOf(':');
    if (colonIdx > 0) {
      result.headers.push({ key: hMatch[1].substring(0, colonIdx).trim(), value: hMatch[1].substring(colonIdx + 1).trim() });
    }
  }
  const bodyMatch = curlStr.match(/(?:--data-raw|--data|-d)\s+['"](.+?)['"]\s*(?:-|$|\s*\\?\s*$)/si)
    || curlStr.match(/(?:--data-raw|--data|-d)\s+'([\s\S]+?)'\s*/i)
    || curlStr.match(/(?:--data-raw|--data|-d)\s+"([\s\S]+?)"\s*/i);
  if (bodyMatch) {
    result.body = bodyMatch[1];
    if (!methodMatch) result.method = 'POST';
  }
  return result;
}

const sectionRailStyle: CSSProperties = {
  width: 1,
  background:
    'repeating-linear-gradient(to bottom, hsl(var(--primary)) 0px, hsl(var(--primary)) 6px, transparent 6px, transparent 14px)',
};

function MinimalExpandSection({
  title,
  icon,
  open,
  onOpenChange,
  headerExtra,
  children,
}: {
  title: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex w-8 shrink-0 flex-col items-center self-stretch pt-0.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary shadow-sm"
          aria-hidden
        >
          {icon}
        </div>
        <div className="mt-2 min-h-[0.5rem] w-px flex-1 rounded-full" style={sectionRailStyle} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition-colors hover:text-foreground"
          >
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {open
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
          {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
        </div>
        {open ? <div className="space-y-2 pb-0.5">{children}</div> : null}
      </div>
    </div>
  );
}

function evaluateSimpleExpression(expr: string, context: Record<string, any>): boolean {
  const cleanExpr = expr.trim();
  if (!cleanExpr) return false;

  if (cleanExpr.includes('||')) {
    return cleanExpr.split('||').some((p) => evaluateSimpleExpression(p, context));
  }

  if (cleanExpr.includes('&&')) {
    return cleanExpr.split('&&').every((p) => evaluateSimpleExpression(p, context));
  }

  if (cleanExpr.includes('==')) {
    const parts = cleanExpr.split('==').map((s) => s.trim());
    const leftVal = parts[0].startsWith('$') || parts[0] in context ? (context[parts[0].replace('$', '')] ?? parts[0]) : parts[0].replace(/['"]/g, '');
    const rightVal = parts[1].startsWith('$') || parts[1] in context ? (context[parts[1].replace('$', '')] ?? parts[1]) : parts[1].replace(/['"]/g, '');
    return String(leftVal) === String(rightVal);
  }

  if (cleanExpr.includes('!=')) {
    const parts = cleanExpr.split('!=').map((s) => s.trim());
    const leftVal = parts[0].startsWith('$') || parts[0] in context ? (context[parts[0].replace('$', '')] ?? parts[0]) : parts[0].replace(/['"]/g, '');
    const rightVal = parts[1].startsWith('$') || parts[1] in context ? (context[parts[1].replace('$', '')] ?? parts[1]) : parts[1].replace(/['"]/g, '');
    return String(leftVal) !== String(rightVal);
  }

  if (cleanExpr.startsWith('!')) {
    const varName = cleanExpr.slice(1).trim();
    const val = varName in context ? context[varName] : varName.replace(/['"]/g, '');
    return val === 'false' || val === '0' || val === '' || val === 'null' || val === 'undefined' || val === false || val === null || val === undefined;
  }

  const val = cleanExpr in context ? context[cleanExpr] : cleanExpr.replace(/['"]/g, '');
  return !(val === 'false' || val === '0' || val === '' || val === 'null' || val === 'undefined' || val === false || val === null || val === undefined);
}

function renderSimpleMustacheAndCond(template: string, context: Record<string, any>): string {
  let result = template.replace(/\$\{\{document\}\}/g, '{{document}}');

  // 1. Resolver blocos {{#cond}} expressao | conteudo {{/cond}}
  const condRegex = /\{\{#cond\}\}([\s\S]*?)\{\{\/cond\}\}/g;
  result = result.replace(condRegex, (_, innerContent: string) => {
    const resolvedInner = renderSimpleMustacheAndCond(innerContent, context);
    const parts = resolvedInner.split('|');
    if (parts.length < 2) return resolvedInner;

    const expression = parts[0].trim();
    const content = parts.slice(1).join('|');

    if (evaluateSimpleExpression(expression, context)) {
      return content;
    }
    return '';
  });

  // 2. Resolver seções verdadeiras {{#prop}} conteudo {{/prop}}
  const sectionTrueRegex = /\{\{#([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(sectionTrueRegex, (_, key: string, content: string) => {
    const value = context[key];
    const isTrue = value && value !== 'false' && value !== '0';
    if (isTrue) {
      return renderSimpleMustacheAndCond(content, context);
    }
    return '';
  });

  // 3. Resolver seções falsas (invertidas) {{^prop}} conteudo {{/prop}}
  const sectionFalseRegex = /\{\{\^([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(sectionFalseRegex, (_, key: string, content: string) => {
    const value = context[key];
    const isTrue = value && value !== 'false' && value !== '0';
    if (!isTrue) {
      return renderSimpleMustacheAndCond(content, context);
    }
    return '';
  });

  // 4. Resolver variáveis simples {{ chave }}
  const varRegex = /\{\{\s*([A-Za-z0-9_\.]+)\s*\}\}/g;
  result = result.replace(varRegex, (_, path: string) => {
    const parts = path.split('.');
    let current: any = context;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }
    return current !== undefined ? String(current) : `{{ ${path} }}`;
  });

  return result;
}

const ConsultationEditor = forwardRef(function ConsultationEditor(
  {
    consultation,
    providers,
    fieldTypes,
    onSave,
    onCancel,
    onTest,
    registerCardTestFn,
    registerNewConsultationTestFn,
  }: {
    consultation: ProviderConsultation;
    providers: Provider[];
    fieldTypes: ConsultationFieldType[];
    /** Mantido na assinatura por compatibilidade com chamadas; o histórico fica no toolbar do card. */
    testLog?: TestLogRow[];
    onSave: (data: Partial<ProviderConsultation>) => Promise<void>;
    onCancel: () => void;
    onTest: (input: ConsultationTestInput) => Promise<ApiProviderTestResult>;
    registerCardTestFn?: (productId: string, fn: (() => Promise<void>) | null) => void;
    registerNewConsultationTestFn?: (fn: (() => Promise<void>) | null) => void;
  },
  ref: Ref<ConsultationEditorHandle>,
) {
  const [form, setForm] = useState<Partial<ProviderConsultation>>(() => ({
    ...consultation,
  }));
  const [testJson, setTestJson] = useState(consultation.sampleResponse || '');
  const [bodyTemplateJson, setBodyTemplateJson] = useState(consultation.bodyTemplateJson || '');
  const [curlInput, setCurlInput] = useState('');
  const [testDocument, setTestDocument] = useState('35012345678');
  const [showPreview, setShowPreview] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);

  const customVariablesRef = useRef<any[]>([]);
  const completionDisposableRef = useRef<any>(null);

  const activeProvider = useMemo(() => {
    return providers.find((p) => p.id === form.providerId);
  }, [providers, form.providerId]);

  useEffect(() => {
    customVariablesRef.current = activeProvider?.custom_variables || [];
  }, [activeProvider]);

  useEffect(() => {
    return () => {
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose();
      }
    };
  }, []);

  const handleEditorMount = useCallback((_editor: any, monaco: any) => {
    if (monaco && monaco.languages && monaco.languages.json) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: false,
      });
    }

    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose();
    }

    completionDisposableRef.current = monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['{', '$'],
      provideCompletionItems: (model: any, position: any) => {
        if (!model.uri.path.includes('bodyTemplate')) {
          return { suggestions: [] };
        }

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        let prefix = '';
        if (textBeforeCursor.endsWith('${{')) {
          prefix = '${{';
        } else if (textBeforeCursor.endsWith('{{')) {
          prefix = '{{';
        } else if (textBeforeCursor.endsWith('${')) {
          prefix = '${';
        } else if (textBeforeCursor.endsWith('{')) {
          prefix = '{';
        }

        const range = prefix ? {
          startLineNumber: position.lineNumber,
          startColumn: position.column - prefix.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        } : {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        };

        const suggestions: any[] = [];

        const systemVars = [
          { name: 'documento', label: '${{document}}', insertText: '${{document}}', desc: 'CPF ou CNPJ limpo (somente números)' },
          { name: 'is_cpf', label: '{{is_cpf}}', insertText: '{{is_cpf}}', desc: 'Booleano: true se documento for CPF' },
          { name: 'is_cnpj', label: '{{is_cnpj}}', insertText: '{{is_cnpj}}', desc: 'Booleano: true se documento for CNPJ' }
        ];

        for (const v of systemVars) {
          suggestions.push({
            label: v.label,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: `Variável de Sistema: ${v.desc}`,
            documentation: `Substitui dinamicamente pelo ${v.desc} na requisição ativa.`,
            insertText: v.insertText,
            range
          });
        }

        suggestions.push({
          label: '{{#cond}}',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Helper Condicional',
          documentation: 'Estrutura condicional if/else. Ex: {{#cond}} is_cpf | "tipo": "F" {{/cond}}',
          insertText: '{{#cond}} ${1:condição} | ${2:conteúdo} {{/cond}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        });

        suggestions.push({
          label: '{{round}}',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Helper de Arredondamento',
          documentation: 'Arredonda valores decimais. Ex: {{round($var, 2)}}',
          insertText: '{{round(${1:variável}, ${2:casas_decimais})}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        });

        const customVars = customVariablesRef.current || [];
        for (const cv of customVars) {
          if (cv.key && cv.key.trim()) {
            const keyClean = cv.key.trim();
            suggestions.push({
              label: `{{${keyClean}}}`,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `Variável Customizada: ${keyClean}`,
              documentation: `Valor personalizado: "${cv.value}" definido nas configurações do provedor.`,
              insertText: `{{${keyClean}}}`,
              range
            });
          }
        }

        return { suggestions };
      }
    });
  }, []);

  const resolvedBodyPreview = useMemo(() => {
    if (!bodyTemplateJson) return '';

    // Injetar variáveis customizadas do provedor ativo no contexto
    const contextObj: Record<string, any> = {};
    const customVars = activeProvider?.custom_variables || [];
    for (const cv of customVars) {
      if (cv.key.trim()) {
        contextObj[cv.key.trim()] = cv.value;
      }
    }

    // Injetar variáveis de sistema simuladas para o preview do documento baseado em testDocument
    const docClean = testDocument.replace(/\D/g, '');
    const isCnpj = docClean.length === 14;
    const isCpf = docClean.length === 11 || (!isCnpj && docClean.length > 0);

    contextObj['document'] = docClean;
    contextObj['documento'] = docClean;
    contextObj['is_cpf'] = isCpf;
    contextObj['is_cnpj'] = isCnpj;
    contextObj['subject'] = {
      document: docClean,
      type: isCpf ? 'CPF' : 'CNPJ',
    };

    try {
      return renderSimpleMustacheAndCond(bodyTemplateJson, contextObj);
    } catch (err) {
      return 'Erro na renderização: ' + String(err);
    }
  }, [bodyTemplateJson, activeProvider, testDocument]);

  const handleCopyCode = useCallback(() => {
    const code = showPreview ? resolvedBodyPreview : bodyTemplateJson;
    if (!code) {
      toast.info("Não há código para copiar!");
      return;
    }
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  }, [showPreview, resolvedBodyPreview, bodyTemplateJson]);
  const [paramsSectionOpen, setParamsSectionOpen] = useState(true);
  const [mappingSectionOpen, setMappingSectionOpen] = useState(true);

  const applyParsedCurl = (val: string) => {
    setCurlInput(val);
    if (!val.trim().toLowerCase().startsWith('curl')) return;
    const parsed = parseCurl(val);
    if (parsed.url) {
      const mp = providers.find((p) => parsed.url.startsWith(p.baseUrl));
      const endpoint = mp ? parsed.url.replace(mp.baseUrl, '') : parsed.url;
      const method = parsed.method === 'GET' ? 'GET' : 'POST';
      setForm((f) => ({
        ...f,
        method,
        endpoint,
        ...(mp ? { providerId: mp.id } : {}),
      }));
      if (parsed.body !== undefined && parsed.body !== '') {
        try {
          const asJson = JSON.parse(parsed.body) as unknown;
          setBodyTemplateJson(JSON.stringify(asJson, null, 2));
        } catch {
          setBodyTemplateJson(parsed.body);
        }
      }
      toast.success(`cURL parseado: ${parsed.method} ${endpoint}`);
    }
  };

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(testJson), null, 2);
    } catch {
      return testJson;
    }
  }, [testJson]);

  const typeFiltersForMapper = useMemo(() => {
    const stored = form.typeItemFilters ?? {};
    const out: Record<string, TypeItemFilterConfig> = {};
    for (const ft of fieldTypes) {
      const own = stored[ft.key];
      if (own !== undefined) {
        out[ft.key] = cloneTypeItemFilterConfig(own);
      } else {
        out[ft.key] = normalizeTypeItemFilterConfig(ft.typeItemFilters ?? []);
      }
    }
    return out;
  }, [fieldTypes, form.typeItemFilters]);

  const handleMapperTypeFiltersChange = useCallback((next: Record<string, TypeItemFilterConfig>) => {
    const cloned: Record<string, TypeItemFilterConfig> = {};
    for (const [k, config] of Object.entries(next)) {
      if (k === 'default') continue;
      cloned[k] = cloneTypeItemFilterConfig(config);
    }
    setForm((f) => ({ ...f, typeItemFilters: cloned }));
  }, []);

  const baseUrl = providers.find((p) => p.id === form.providerId)?.baseUrl || '';
  const path = (form.endpoint || '').trim();
  const fullUrlLabel = baseUrl && path ? `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}` : baseUrl || path || '—';

  const loadResponseFromLog = useCallback((entry: TestLogRow, opts?: { silent?: boolean }) => {
    setTestJson(entry.responseJson);
    setForm((f) => ({ ...f, sampleResponse: entry.responseJson }));
    if (consultation.id) {
      useEditorStore.getState().setDraftSampleResponse(consultation.id, entry.responseJson);
    }
    if (!opts?.silent) toast.success('JSON carregado do log');
  }, [consultation.id]);

  const applyProviderResponsePayload = (payload: unknown) => {
    if (payload === undefined || payload === null) return;
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    setTestJson(str);
    setForm((f) => ({ ...f, sampleResponse: str }));
    if (consultation.id) {
      useEditorStore.getState().setDraftSampleResponse(consultation.id, str);
    }
  };

  const runTestInternal = useCallback(async () => {
    let extras: { bodyTemplate?: unknown } = {};
    try {
      extras = parseOptionalBodyTemplateJson(bodyTemplateJson);
    } catch {
      return;
    }
    try {
      let result: ApiProviderTestResult;
      if (consultation.id) {
        result = await onTest({ kind: 'saved', productId: consultation.id, testDocument, ...extras });
      } else {
        const endpoint = (form.endpoint || '').trim();
        if (!form.providerId || !endpoint) {
          toast.error('Preencha provedor e endpoint para testar');
          return;
        }
        result = await onTest({
          kind: 'draft',
          providerId: form.providerId,
          endpointPath: endpoint,
          method: (form.method || 'POST') as 'GET' | 'POST',
          testDocument,
          ...extras,
        });
      }
      applyProviderResponsePayload(result.response?.payload);
    } catch {
      /* onError da mutation */
    }
  }, [bodyTemplateJson, consultation.id, form.endpoint, form.method, form.providerId, testDocument, onTest]);

  useEffect(() => {
    if (consultation.id) {
      registerCardTestFn?.(consultation.id, runTestInternal);
      return () => registerCardTestFn?.(consultation.id, null);
    }
    registerNewConsultationTestFn?.(runTestInternal);
    return () => registerNewConsultationTestFn?.(null);
  }, [consultation.id, registerCardTestFn, registerNewConsultationTestFn, runTestInternal]);

  useEffect(() => {
    setForm({
      ...consultation,
    });
    setTestJson(consultation.sampleResponse || '');
    setBodyTemplateJson(consultation.bodyTemplateJson || '');
    setCurlInput('');
  }, [
    consultation.id,
  ]);

  const handleSave = useCallback(() => {
    if (!form.name || !form.providerId || !form.endpoint) {
      toast.error('Preencha nome, provedor e endpoint');
      return;
    }
    try {
      parseOptionalBodyTemplateJson(bodyTemplateJson);
    } catch {
      return;
    }
    void onSave({
      ...form,
      sampleResponse: testJson,
      bodyTemplateJson,
      typeItemFilters: form.typeItemFilters,
    });
  }, [bodyTemplateJson, form, onSave, testJson]);

  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
      revert: onCancel,
      loadResponseFromLog,
    }),
    [handleSave, loadResponseFromLog, onCancel],
  );

  return (
    <div className="space-y-4">
      <MinimalExpandSection
        title="Parâmetros"
        icon={<Code2 className="h-3.5 w-3.5" />}
        open={paramsSectionOpen}
        onOpenChange={setParamsSectionOpen}
      >
        <div className="overflow-x-auto -mx-0.5 px-0.5">
          <div className="flex min-w-[58rem] items-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer gap-1.5 px-2.5"
                >
                  <Link2 className="h-4 w-4" />
                  cURL
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Cole um cURL — método, URL, headers e corpo serão aplicados ao salvar os campos abaixo.
                </p>
                <textarea
                  value={curlInput}
                  onChange={(e) => applyParsedCurl(e.target.value)}
                  className="min-h-[5.5rem] w-full resize-y rounded-md border border-border bg-background p-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="curl -X POST 'https://…' -H '…' -d '{…}'"
                  spellCheck={false}
                />
              </PopoverContent>
            </Popover>
            <div className="grid min-w-0 flex-1 grid-cols-8 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Método</label>
                <Select value={form.method || 'POST'} onValueChange={(v) => setForm((f) => ({ ...f, method: v as 'GET' | 'POST' }))}>
                  <SelectTrigger className={`${selectTriggerCls} font-semibold`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Provedor</label>
                <Select value={form.providerId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, providerId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Nome</label>
                <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Consulta PF" className={inputCls} />
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>External ID</label>
                <Input value={form.externalId || ''} onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))} placeholder="CODIGO" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Endpoint</label>
                <Input value={form.endpoint || ''} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="/rota" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls} title="Documento (CPF ou CNPJ) para simulação de variáveis no preview e teste de execução">Documento (document)</label>
                <Input value={testDocument} onChange={(e) => setTestDocument(e.target.value)} placeholder="35012345678" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="space-y-1">
                <label className={`${labelCls} normal-case tracking-normal`} title="Tarifa cobrada pelo provedor (custo admin)">
                  Custo (R$)
                </label>
                <Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={`${labelCls} normal-case tracking-normal`} title="Valor debitado do cliente na carteira ao emitir a consulta">
                  Preço (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.consultationPrice ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, consultationPrice: parseFloat(e.target.value) }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="truncate px-0.5 font-mono text-[11px] text-muted-foreground/90" title={fullUrlLabel}>
          {fullUrlLabel}
        </p>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <label className={sectionLabelCls}>
              <Code2 className="h-4 w-4" /> Corpo da requisição (JSON)
            </label>
            
            <div className="flex items-center gap-2">
              {showPreview && activeProvider && (
                <span className="text-[10px] bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 px-2 py-0.5 rounded-md font-mono select-none">
                  Preview usando: Provedor {activeProvider.name} e Doc {testDocument}
                </span>
              )}

              {/* Botão de Quebra de Linha (Word Wrap) */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 w-8 p-0 cursor-pointer transition-all ${
                  wordWrap 
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setWordWrap(!wordWrap)}
                title="Alternar Quebra de Linha (Word Wrap)"
              >
                <WrapText className="size-4" />
              </Button>

              {/* Botão de Copiar Código */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={handleCopyCode}
                title="Copiar Código"
              >
                <Copy className="size-4" />
              </Button>

              {/* Botão de Visualização / Preview */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 cursor-pointer gap-1.5 px-3 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                  showPreview 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-indigo-500/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <Code2 className="h-3.5 w-3.5" />
                    Ver Código / Editar
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar Preview Resolvido
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="h-[14rem] w-full">
            <SafeEditor
              language="json"
              theme="vs-dark"
              value={showPreview ? resolvedBodyPreview : bodyTemplateJson}
              onChange={(v) => {
                if (!showPreview) {
                  setBodyTemplateJson(v || '');
                }
              }}
              path={showPreview ? `preview-bodyTemplate-${consultation.id || 'new'}.json` : `bodyTemplate-${consultation.id || 'new'}.json`}
              onMount={handleEditorMount}
              hideHeader={true}
              options={{
                readOnly: showPreview,
                minimap: { enabled: false },
                lineNumbers: 'off',
                folding: false,
                glyphMargin: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                wordWrap: wordWrap ? 'on' : 'off',
              }}
            />
          </div>
        </div>
      </MinimalExpandSection>

      <MinimalExpandSection
        title="Mapeamento de retorno"
        icon={<Database className="h-3.5 w-3.5" />}
        open={mappingSectionOpen}
        onOpenChange={setMappingSectionOpen}
      >
        <JsonFieldMapper
          key={consultation.id || 'new-consultation'}
          json={formattedJson}
          onJsonChange={(v) => {
            setTestJson(v);
            setForm((f) => ({ ...f, sampleResponse: v }));
            if (consultation.id) {
              useEditorStore.getState().setDraftSampleResponse(consultation.id, v);
            }
          }}
          fieldTypes={fieldTypes}
          mappings={form.fieldMappings || []}
          onMappingsChange={(m) => setForm((f) => ({ ...f, fieldMappings: m }))}
          typeFilters={typeFiltersForMapper}
          onTypeFiltersChange={handleMapperTypeFiltersChange}
        />
      </MinimalExpandSection>
    </div>
  );
});

const NewConsultationForm = forwardRef(function NewConsultationForm(
  {
    providerId,
    ...rest
  }: Omit<ComponentProps<typeof ConsultationEditor>, 'consultation'> & { providerId?: string },
  ref: Ref<ConsultationEditorHandle>,
) {
  const dummy: ProviderConsultation = {
    id: '',
    providerId: providerId || '',
    name: '',
    externalId: '',
    endpoint: '',
    method: 'POST',
    cost: 0,
    consultationPrice: 0,
    fieldMappings: [],
    status: 'active',
    sampleResponse: '',
    bodyTemplateJson: '',
    typeItemFilters: {},
    updatedAt: '',
  };
  return <ConsultationEditor ref={ref} consultation={dummy} {...rest} />;
});

function ConsultationTypeFiltersEditor({
  filters,
  onChange,
}: {
  filters: MappingItemFilter[];
  onChange: (next: MappingItemFilter[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground">Critérios desta consulta</span>
      </div>
      {filters.length === 0 && (
        <p className="text-xs italic text-muted-foreground">Nenhum critério. O preview exibe o trecho inteiro.</p>
      )}
      <div className="space-y-2">
        {filters.map((rule, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-md border border-border/80 bg-background/80 p-2"
          >
            <Input
              value={rule.field}
              onChange={(e) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)))
              }
              placeholder="Campo (ex: INFORMANTE)"
              className="h-9 min-w-[6rem] flex-1 bg-background font-mono text-xs"
            />
            <Select
              value={rule.op}
              onValueChange={(v) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, op: v as MappingItemFilterOp } : x)))
              }
            >
              <SelectTrigger className="h-9 w-[9.5rem] shrink-0 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_TAB_FILTER_OPS.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={rule.value}
              onChange={(e) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
              }
              placeholder="Valor"
              className="h-9 min-w-[6rem] flex-1 bg-background text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Remover critério"
              onClick={() => onChange(filters.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full text-xs"
        onClick={() => onChange([...filters, { field: '', op: 'eq', value: '' }])}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Adicionar critério
      </Button>
    </div>
  );
}

function LinkedConsultationCard({
  consultation: pc,
  provider: prov,
  fieldType,
  fieldTypeKey,
  initialFilters,
  accessToken,
  onFiltersPersisted,
}: {
  consultation: ProviderConsultation;
  provider?: Provider;
  fieldType: ConsultationFieldType;
  fieldTypeKey: string;
  initialFilters?: MappingItemFilter[];
  accessToken: string | null;
  onFiltersPersisted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<MappingItemFilter[]>(() => (initialFilters ?? []).map((rule) => ({ ...rule })));
  const [savingFilters, setSavingFilters] = useState(false);
  const maps = pc.fieldMappings.filter((m) => m.fieldTypeKey === fieldTypeKey);
  const filterConfigForType = normalizeTypeItemFilterConfig(pc.typeItemFilters?.[fieldTypeKey]);
  const mergedFilterConfig = buildSingleGroupTypeItemFilterConfig(filters, filterConfigForType);
  const filterActive = countActiveTypeItemRules(mergedFilterConfig) > 0;

  const initialSignature = JSON.stringify(initialFilters ?? []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(initialSignature) as unknown;
      if (!Array.isArray(parsed)) {
        setFilters([]);
        return;
      }
      setFilters(
        parsed.map((rule) => {
          if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
            return { field: '', op: 'eq' as MappingItemFilterOp, value: '' };
          }
          const r = rule as Record<string, unknown>;
          const opRaw = typeof r.op === 'string' ? r.op : 'eq';
          const op = TYPES_TAB_FILTER_OPS.some((o) => o.value === opRaw)
            ? (opRaw as MappingItemFilterOp)
            : 'eq';
          return {
            field: typeof r.field === 'string' ? r.field : '',
            op,
            value: r.value == null ? '' : String(r.value),
          };
        }),
      );
    } catch {
      setFilters([]);
    }
  }, [initialSignature, pc.id, fieldTypeKey]);

  const persistFilters = async () => {
    setSavingFilters(true);
    try {
      const merged: Record<string, TypeItemFilterConfig> = {
        ...(pc.typeItemFilters ?? {}),
        [fieldTypeKey]: buildSingleGroupTypeItemFilterConfig(filters, filterConfigForType),
      };
      await patchProductApi(accessToken, pc.id, { typeItemFilters: merged });
      toast.success('Critérios salvos nesta consulta');
      onFiltersPersisted();
    } catch {
      toast.error('Não foi possível salvar os critérios');
    } finally {
      setSavingFilters(false);
    }
  };

  const jsonExcerpt =
    pc.sampleResponse && maps.length > 0
      ? buildTypeLinkedConsultationMappedPreview({
          sampleResponse: pc.sampleResponse,
          trechoMappings: maps,
          fieldType,
          typeItemFilterConfig: mergedFilterConfig,
        })
      : '';

  return (
    <div className="rounded border border-border overflow-hidden bg-card">
      <div
        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        <Database className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cardTitleCls}>{pc.name}</span>
            <span className="text-xs text-muted-foreground">{prov?.name}</span>
          </div>
          <code className={`${metaMonoCls} block mt-0.5`}>
            {maps.map((m) => m.jsonPath).join(' · ')}
          </code>
          {filters && filters.length > 0 && (
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {filters.length} critério(s) de filtro no tipo
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2.5 border-t border-border pt-2 space-y-2">
              <ConsultationTypeFiltersEditor filters={filters} onChange={setFilters} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs gradient-primary text-primary-foreground"
                  disabled={savingFilters}
                  onClick={(e) => {
                    e.stopPropagation();
                    void persistFilters();
                  }}
                >
                  {savingFilters ? 'Salvando…' : 'Salvar critérios'}
                </Button>
              </div>
              <pre className="text-sm font-mono text-foreground/80 bg-background rounded-md border border-border p-3 max-h-40 overflow-auto scrollbar-thin leading-relaxed">
                {jsonExcerpt || '—'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ftColorClass(color: string, part: 'bg' | 'text' | 'border') {
  const map: Record<string, Record<string, string>> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    info: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/30' },
  };
  return (map[color] || map.primary)[part];
}

async function syncMappings(
  token: string | null,
  productId: string,
  fieldTypes: ConsultationFieldType[],
  mappings: FieldMapping[],
  previous: ProviderConsultation | undefined,
) {
  const prevIds = Object.values(previous?.mappingIds ?? {});
  for (const id of prevIds) {
    await deleteMappingApi(token, id);
  }
  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const ft = fieldTypes.find((f) => f.key === m.fieldTypeKey);
    if (!ft) continue;
    await createMappingApi(token, {
      productId,
      canonicalFieldId: ft.id,
      sourcePath: m.jsonPath,
      uiStartLine: m.uiStartLine,
      uiEndLine: m.uiEndLine,
      sortOrder: i,
    });
  }
}

export default function IntegrationsPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const currentFolderId = searchParams.get('pasta') || null;
  const setCurrentFolderId = useCallback((folderId: string | null) => {
    setSelectedTypes([]);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (folderId) {
          next.set('pasta', folderId);
        } else {
          next.delete('pasta');
        }
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const [integrationsTab, setIntegrationsTab] = useState<IntegrationsTab>(() =>
    parseIntegrationsTabFromSearch(
      new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    ) ?? 'providers',
  );

  const enabled = !!accessToken && (user?.backendRole === 'PLATFORM_ADMIN' || user?.backendRole === 'CUSTOMER_ADMIN');

  // React Query para pastas e associações
  const foldersQuery = useQuery({
    queryKey: ['admin-canonical-folders'],
    queryFn: () => getCanonicalFolders(accessToken),
    enabled: enabled && integrationsTab === 'types',
  });

  const associationsQuery = useQuery({
    queryKey: ['admin-canonical-associations'],
    queryFn: () => getCanonicalFolderAssociations(accessToken),
    enabled: enabled && integrationsTab === 'types',
  });

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const associations = useMemo(() => associationsQuery.data ?? [], [associationsQuery.data]);

  const getBreadcrumbs = useCallback((folderId: string | null): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Raiz' }];
    if (!folderId) return crumbs;

    const path: { id: string; name: string }[] = [];
    let currId: string | null = folderId;
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const folder = folders.find((f) => f.id === currId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currId = folder.parentId;
      } else {
        break;
      }
    }

    return [...crumbs, ...path];
  }, [folders]);

  const [providerModal, setProviderModal] = useState<{ open: boolean; provider?: Provider }>({ open: false });
  const [fieldTypeModal, setFieldTypeModal] = useState<{ open: boolean; ft?: ConsultationFieldType }>({ open: false });
  const [togglingProviderStatusId, setTogglingProviderStatusId] = useState<string | null>(null);
  const [consultationPicker, setConsultationPicker] = useState<string | null>(null);
  const [newConsultationProviderId, setNewConsultationProviderId] = useState<string | undefined>(undefined);
  const [consultationEditorNonce, setConsultationEditorNonce] = useState(0);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigationPanelRef = useRef<ImperativePanelHandle>(null);

  const prevSelectedFieldType = useRef<string | null>(null);
  const prevFolderId = useRef<string | null>(null);
  const prevIsExpanded = useRef<boolean>(false);
  const isChangingLayoutRef = useRef<boolean>(false);

  const [isDragging, setIsDragging] = useState(false);
  const lastNavigationSizeRef = useRef<number>(15);
  const lastValidNavigationSizeRef = useRef<number>(15);
  const lastCatalogSizeRef = useRef<number>(65);
  const lastValidCatalogSizeRef = useRef<number>(65);
  const prevDepthRef = useRef<number>(1);

  const handleDragEnd = () => {
    if (selectedFieldType === null || isChangingLayoutRef.current) return;
    const navSize = lastNavigationSizeRef.current;
    const catSize = lastCatalogSizeRef.current;

    if (isDetailsExpanded) {
      if (navSize > 25) {
        isChangingLayoutRef.current = true;
        setIsDetailsExpanded(false);
        setTimeout(() => {
          isChangingLayoutRef.current = false;
        }, 400);
      }
    } else {
      if (catSize <= 25) {
        isChangingLayoutRef.current = true;
        setIsDetailsExpanded(true);
        setTimeout(() => {
          isChangingLayoutRef.current = false;
        }, 400);
      }
    }
  };

  useEffect(() => {
    const wasDetailsOpen = prevSelectedFieldType.current !== null;
    const isDetailsOpen = selectedFieldType !== null;
    const detailsVisibilityChanged = wasDetailsOpen !== isDetailsOpen;
    
    const wasSidebarVisible = prevSelectedFieldType.current !== null && prevIsExpanded.current;
    const isSidebarVisible = selectedFieldType !== null && isDetailsExpanded;
    const sidebarVisibilityChanged = wasSidebarVisible !== isSidebarVisible;

    const expansionChanged = isDetailsExpanded !== prevIsExpanded.current;

    if (detailsVisibilityChanged || sidebarVisibilityChanged || expansionChanged) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 350);
      
      if (isSidebarVisible && navigationPanelRef.current) {
        navigationPanelRef.current.resize(15);
      }

      prevSelectedFieldType.current = selectedFieldType;
      prevFolderId.current = currentFolderId;
      prevIsExpanded.current = isDetailsExpanded;
      
      return () => clearTimeout(timer);
    } else {
      prevSelectedFieldType.current = selectedFieldType;
      prevFolderId.current = currentFolderId;
      prevIsExpanded.current = isDetailsExpanded;
    }
  }, [selectedFieldType, currentFolderId, isDetailsExpanded]);

  const showSidebar = selectedFieldType !== null && isDetailsExpanded;

  useEffect(() => {
    if (showSidebar && navigationPanelRef.current) {
      navigationPanelRef.current.resize(15);
    }
  }, [showSidebar]);

  // Reset expansion state when closing details
  useEffect(() => {
    if (selectedFieldType === null && isDetailsExpanded) {
      setIsDetailsExpanded(false);
    }
  }, [selectedFieldType, isDetailsExpanded]);

  // Close details, clear bulk selection, and reset expansion state when navigating between folders
  useEffect(() => {
    setSelectedFieldType(null);
    setIsDetailsExpanded(false);
    setSelectedTypes([]);
    
    // Resetar referências de tamanho válidas para os valores padrão de fábrica ao navegar
    lastValidCatalogSizeRef.current = 65;
    lastValidNavigationSizeRef.current = 15;
    lastCatalogSizeRef.current = 65;
    lastNavigationSizeRef.current = 15;
    
    // Sincronizar profundidade de navegação do catálogo após a montagem do estado
    prevDepthRef.current = getBreadcrumbs(currentFolderId).length;
  }, [currentFolderId, getBreadcrumbs]);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingFieldType, setSavingFieldType] = useState(false);
  const [importingDefaultFieldTypes, setImportingDefaultFieldTypes] = useState(false);

  const createFolderMutation = useMutation({
    mutationFn: (body: { name: string; parentId: string | null }) =>
      createCanonicalFolder(accessToken, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-folders'] });
      toast.success('Pasta criada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar pasta');
    },
  });

  const patchFolderMutation = useMutation({
    mutationFn: (payload: { folderId: string; body: { name?: string; parentId?: string | null } }) =>
      patchCanonicalFolder(accessToken, payload.folderId, payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-folders'] });
      toast.success('Pasta atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar pasta');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => deleteCanonicalFolder(accessToken, folderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-folders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-associations'] });
      toast.success('Pasta removida');
    },
    onError: () => {
      toast.error('Erro ao remover pasta');
    },
  });

  const postAssociationMutation = useMutation({
    mutationFn: (body: { fieldTypeKey: string; folderId: string | null }) =>
      postCanonicalFolderAssociation(accessToken, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-associations'] });
    },
    onError: () => {
      toast.error('Erro ao associar tipo à pasta');
    },
  });

  // Controles de interface de pastas
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
  const [selectedFolderForAction, setSelectedFolderForAction] = useState<ApiCanonicalFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<{ type: 'folder' | 'type'; id: string; keyOrName: string } | null>(null);
  const [targetFolderIdForMove, setTargetFolderIdForMove] = useState<string | null>(null);

  const handleOpenCreateFolder = () => {
    setFolderDialogMode('create');
    setSelectedFolderForAction(null);
    setFolderNameInput('');
    setFolderDialogOpen(true);
  };

  const handleOpenRenameFolder = (folder: ApiCanonicalFolder) => {
    setFolderDialogMode('rename');
    setSelectedFolderForAction(folder);
    setFolderNameInput(folder.name);
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderNameInput.trim()) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }
    if (folderDialogMode === 'create') {
      await createFolderMutation.mutateAsync({
        name: folderNameInput.trim(),
        parentId: currentFolderId,
      });
    } else if (folderDialogMode === 'rename' && selectedFolderForAction) {
      await patchFolderMutation.mutateAsync({
        folderId: selectedFolderForAction.id,
        body: { name: folderNameInput.trim() },
      });
    }
    setFolderDialogOpen(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolderMutation.mutateAsync(folderId);
  };

  const handleOpenMoveItem = (type: 'folder' | 'type', id: string, keyOrName: string) => {
    setMovingItem({ type, id, keyOrName });
    setTargetFolderIdForMove(null);
    setMoveDialogOpen(true);
  };

  const handleConfirmMoveItem = async () => {
    if (!movingItem) return;
    if (movingItem.id === 'bulk') {
      try {
        await Promise.all(
          selectedTypes.map((key) =>
            postAssociationMutation.mutateAsync({
              fieldTypeKey: key,
              folderId: targetFolderIdForMove,
            }),
          ),
        );
        toast.success(`${selectedTypes.length} tipos canônicos movidos`);
        setSelectedTypes([]);
      } catch {
        toast.error('Erro ao mover alguns tipos');
      }
    } else if (movingItem.type === 'folder') {
      const isSubfolder = (parent: string | null, child: string): boolean => {
        if (!parent) return false;
        if (parent === child) return true;
        const p = folders.find((f) => f.id === parent);
        return p ? isSubfolder(p.parentId, child) : false;
      };

      if (movingItem.id === targetFolderIdForMove || isSubfolder(targetFolderIdForMove, movingItem.id)) {
        toast.error('Não é possível mover uma pasta para dentro de si mesma ou de suas subpastas');
        return;
      }

      await patchFolderMutation.mutateAsync({
        folderId: movingItem.id,
        body: { parentId: targetFolderIdForMove },
      });
    } else {
      await postAssociationMutation.mutateAsync({
        fieldTypeKey: movingItem.id,
        folderId: targetFolderIdForMove,
      });
      toast.success('Mapeamento de pasta atualizado');
    }
    setMoveDialogOpen(false);
    setMovingItem(null);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir os ${selectedTypes.length} tipos canônicos selecionados?`)) {
      try {
        const idsToDelete = selectedTypes
          .map((key) => fieldTypes.find((ft) => ft.key === key)?.id)
          .filter(Boolean) as string[];
        await Promise.all(idsToDelete.map((id) => deleteCanonicalFieldApi(accessToken, id)));
        toast.success(`${selectedTypes.length} tipos canônicos excluídos`);
        setSelectedTypes([]);
        void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
      } catch {
        toast.error('Erro ao excluir alguns tipos canônicos (pode haver mapeamentos ativos)');
      }
    }
  };

  const handleBulkCopy = async () => {
    try {
      const typesToCopy = selectedTypes
        .map((key) => fieldTypes.find((ft) => ft.key === key))
        .filter(Boolean) as ConsultationFieldType[];
      
      await Promise.all(
        typesToCopy.map(async (ft) => {
          const newKey = `${ft.key}_COPIA_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const newLabel = `${ft.label} (Cópia)`;
          
          await createCanonicalFieldApi(accessToken, {
            pathKey: newKey,
            label: newLabel,
            dataType: 'object',
            description: ft.description,
            uiItemFilters: ft.typeItemFilters ?? [],
            reportFieldConfig: ft.reportFieldConfig,
          });

          if (currentFolderId) {
            await postAssociationMutation.mutateAsync({
              fieldTypeKey: newKey,
              folderId: currentFolderId,
            });
          }
        })
      );

      toast.success(`${selectedTypes.length} tipos copiados com sucesso`);
      setSelectedTypes([]);
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } catch {
      toast.error('Erro ao copiar tipos canônicos');
    }
  };

  const handleDropOnFolder = useCallback(async (e: React.DragEvent, targetFolderId: string | null, targetFolderName: string) => {
    e.preventDefault();
    const jsonStr = e.dataTransfer.getData("application/json");
    let dragData: { type: 'single' | 'bulk'; key?: string; keys?: string[] } | null = null;
    
    if (jsonStr) {
      try {
        dragData = JSON.parse(jsonStr);
      } catch {
        // ignore
      }
    }
    
    if (!dragData) {
      const key = e.dataTransfer.getData("text/plain");
      if (key) {
        dragData = { type: 'single', key };
      }
    }
    
    if (!dragData) return;
    
    if (dragData.type === 'bulk' && dragData.keys && dragData.keys.length > 0) {
      const keysToMove = dragData.keys;
      try {
        await Promise.all(
          keysToMove.map((key) =>
            postAssociationMutation.mutateAsync({
              fieldTypeKey: key,
              folderId: targetFolderId,
            })
          )
        );
        toast.success(`${keysToMove.length} tipos canônicos movidos para a pasta ${targetFolderName}`);
        setSelectedTypes([]);
      } catch {
        toast.error('Erro ao mover alguns tipos');
      }
    } else if (dragData.type === 'single' && dragData.key) {
      await postAssociationMutation.mutateAsync({
        fieldTypeKey: dragData.key,
        folderId: targetFolderId,
      });
      toast.success(`Tipo ${dragData.key} movido para a pasta ${targetFolderName}`);
    }
  }, [postAssociationMutation, setSelectedTypes]);

  const currentDepth = getBreadcrumbs(currentFolderId).length;
  const isNavigatingBack = currentDepth < prevDepthRef.current;
  const catalogSlideClass = isNavigatingBack ? "slide-in-from-left-4" : "slide-in-from-right-4";

  const getFolderDepth = useCallback((folderId: string, allFolders: ApiCanonicalFolder[]): number => {
    let depth = 0;
    let curr = allFolders.find((f) => f.id === folderId);
    const visited = new Set<string>();
    while (curr && curr.parentId && !visited.has(curr.id)) {
      visited.add(curr.id);
      depth += 1;
      curr = allFolders.find((f) => f.id === curr!.parentId);
    }
    return depth;
  }, []);

  const setIntegrationsTabWithUrl = useCallback(
    (tab: IntegrationsTab) => {
      setIntegrationsTab(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(INTEGRATIONS_TAB_QUERY_KEY, tabToIntegrationsAbaParam(tab));
          next.delete('pasta');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const fromUrl = parseIntegrationsTabFromSearch(searchParams);
    if (fromUrl != null) setIntegrationsTab(fromUrl);
  }, [searchParams]);

  const consultationPickerRef = useRef(consultationPicker);
  consultationPickerRef.current = consultationPicker;

  const cardTestFnsRef = useRef<Record<string, () => Promise<void>>>({});
  const newConsultationTestRef = useRef<(() => Promise<void>) | null>(null);
  const consultationEditorRef = useRef<ConsultationEditorHandle | null>(null);
  const [selectedTestLogId, setSelectedTestLogId] = useState<string | undefined>(undefined);
  const [testLogSelectKey, setTestLogSelectKey] = useState(0);

  const registerCardTestFn = useCallback((productId: string, fn: (() => Promise<void>) | null) => {
    if (fn) cardTestFnsRef.current[productId] = fn;
    else delete cardTestFnsRef.current[productId];
  }, []);

  const registerNewConsultationTestFn = useCallback((fn: (() => Promise<void>) | null) => {
    newConsultationTestRef.current = fn;
  }, []);

  const providersQuery = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => getProviders(accessToken),
    enabled,
  });

  const canonicalQuery = useQuery({
    queryKey: ['admin-canonical-fields'],
    queryFn: () => getCanonicalFields(accessToken),
    enabled,
  });

  const testLogsQuery = useQuery({
    queryKey: ['admin-test-logs'],
    queryFn: () => getTestLogs(accessToken),
    enabled,
  });

  const apiProviders = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const fieldTypes = useMemo(
    () => mapCanonicalToFieldTypes(canonicalQuery.data ?? []),
    [canonicalQuery.data],
  );

  const providers = useMemo(() => apiProviders.map(mapApiProvider), [apiProviders]);

  const consultations = useMemo(() => {
    const list: ProviderConsultation[] = [];
    for (const ap of apiProviders) {
      for (const p of ap.products) {
        list.push(mapApiProduct(p, ap.id));
      }
    }
    return list;
  }, [apiProviders]);
  const sortedConsultations = useMemo(
    () =>
      [...consultations].sort((a, b) => {
        const providerCompare = (providers.find((p) => p.id === a.providerId)?.name ?? '')
          .localeCompare(providers.find((p) => p.id === b.providerId)?.name ?? '', 'pt-BR');
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name, 'pt-BR');
      }),
    [consultations, providers],
  );

  const recentConsultations = useMemo(
    () =>
      [...consultations].sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      ),
    [consultations],
  );

  useEffect(() => {
    if (consultationPicker == null) return;
    try {
      sessionStorage.setItem(CONSULTATION_PICKER_STORAGE_KEY, consultationPicker);
    } catch {
      /* ignore */
    }
  }, [consultationPicker]);

  useEffect(() => {
    if (integrationsTab !== 'consultations' || providersQuery.isLoading) return;

    if (consultationPicker != null && consultationPicker !== CONSULTATION_PICKER_NEW) {
      if (!consultations.some((c) => c.id === consultationPicker)) {
        const restored = readStoredConsultationPicker(consultations);
        const next =
          restored ??
          recentConsultations[0]?.id ??
          CONSULTATION_PICKER_NEW;
        setConsultationPicker(next);
        setConsultationEditorNonce((n) => n + 1);
      }
      return;
    }

    if (consultationPicker === null) {
      const restored = readStoredConsultationPicker(consultations);
      if (restored) setConsultationPicker(restored);
      else if (recentConsultations.length === 0) setConsultationPicker(CONSULTATION_PICKER_NEW);
      else setConsultationPicker(recentConsultations[0].id);
    }
  }, [
    integrationsTab,
    providersQuery.isLoading,
    consultations,
    consultationPicker,
    recentConsultations,
  ]);

  const testLog = useMemo(() => mapTestLogs(testLogsQuery.data ?? []), [testLogsQuery.data]);

  const testLogForPicker = useMemo(() => {
    const sorted = [...testLog].sort(
      (a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
    );
    if (consultationPicker === CONSULTATION_PICKER_NEW) {
      return sorted.filter((t) => t.productId == null);
    }
    if (consultationPicker == null) return [];
    return sorted.filter((t) => t.productId === consultationPicker);
  }, [consultationPicker, testLog]);

  const selectedTestLog = useMemo(
    () => testLogForPicker.find((entry) => entry.id === selectedTestLogId),
    [selectedTestLogId, testLogForPicker],
  );

  const prevConsultationPickerForLogsRef = useRef<string | null>(null);

  useEffect(() => {
    const consultationChanged = prevConsultationPickerForLogsRef.current !== consultationPicker;
    prevConsultationPickerForLogsRef.current = consultationPicker;

    if (!testLogForPicker.length) {
      setSelectedTestLogId(undefined);
      if (consultationChanged) setTestLogSelectKey((k) => k + 1);
      return;
    }

    if (consultationChanged) {
      setSelectedTestLogId(testLogForPicker[0].id);
      setTestLogSelectKey((k) => k + 1);
      return;
    }

    setSelectedTestLogId((prev) => {
      if (prev && testLogForPicker.some((e) => e.id === prev)) return prev;
      return testLogForPicker[0].id;
    });
  }, [consultationPicker, testLogForPicker]);

  /**
   * Evita reaplicar o mesmo log ao só refazer o fetch; alinha JSON do editor ao item do dropdown.
   * Não inclui remount do editor no “skip”: após reverter, o texto volta ao sampleResponse salvo sem sobrescrever com o log.
   */
  const prevSyncedTestLogRef = useRef<{
    picker: string | null;
    logId: string;
    newProviderId?: string;
  } | null>(null);

  useEffect(() => {
    if (integrationsTab !== 'consultations') return;
    if (consultationPicker == null) return;

    if (!selectedTestLogId) {
      prevSyncedTestLogRef.current = null;
      return;
    }

    const entry = testLogForPicker.find((t) => t.id === selectedTestLogId);
    if (!entry) return;

    if (consultationPicker !== CONSULTATION_PICKER_NEW) {
      if (entry.productId !== consultationPicker) return;
    } else if (entry.productId != null) {
      return;
    }

    const prev = prevSyncedTestLogRef.current;
    const sameDraftProvider =
      consultationPicker !== CONSULTATION_PICKER_NEW ||
      prev?.newProviderId === newConsultationProviderId;
    if (
      prev &&
      prev.picker === consultationPicker &&
      prev.logId === selectedTestLogId &&
      sameDraftProvider
    ) {
      return;
    }

    prevSyncedTestLogRef.current = {
      picker: consultationPicker,
      logId: selectedTestLogId,
      ...(consultationPicker === CONSULTATION_PICKER_NEW
        ? { newProviderId: newConsultationProviderId }
        : {}),
    };
    consultationEditorRef.current?.loadResponseFromLog(entry, { silent: true });
  }, [
    integrationsTab,
    consultationPicker,
    newConsultationProviderId,
    selectedTestLogId,
    testLogForPicker,
  ]);

  const findApiProvider = (id: string) => apiProviders.find((p) => p.id === id);
  const findConsultation = (id: string) => consultations.find((c) => c.id === id);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-test-logs'] });
  };

  const persistProviderIsActive = async (providerId: string, isActive: boolean) => {
    setTogglingProviderStatusId(providerId);
    try {
      await patchProviderApi(accessToken, providerId, { isActive });
      invalidateAll();
    } catch {
      toast.error('Não foi possível atualizar o status do provedor');
    } finally {
      setTogglingProviderStatusId(null);
    }
  };

  const testMutation = useMutation({
    mutationFn: async (input: ConsultationTestInput) => {
      const docClean = input.testDocument ? input.testDocument.replace(/\D/g, '') : '';
      const isCnpj = docClean.length === 14;
      const isCpf = docClean.length === 11 || (!isCnpj && docClean.length > 0);

      const payload: Parameters<typeof testProductApi>[2] = {
        context: {
          document: docClean,
          documento: docClean,
          cpf_cnpj: docClean,
          cpf: isCpf ? docClean : '',
          cnpj: isCnpj ? docClean : '',
          is_cpf: isCpf,
          is_cnpj: isCnpj,
          subject: {
            document: docClean,
            type: isCpf ? 'CPF' : 'CNPJ',
          }
        },
        ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate } : {}),
        ...(input.queryTemplate !== undefined ? { queryTemplate: input.queryTemplate } : {}),
        ...(input.headersTemplate !== undefined ? { headersTemplate: input.headersTemplate } : {}),
      };
      if (input.kind === 'saved') {
        return testProductApi(accessToken, input.productId, payload);
      }
      return testProductDraftApi(accessToken, {
        providerId: input.providerId,
        endpointPath: input.endpointPath,
        method: input.method,
        ...payload,
      });
    },
    onSuccess: async () => {
      toast.success('Teste executado');
      await queryClient.refetchQueries({ queryKey: ['admin-test-logs'] });
      const logs = queryClient.getQueryData<ApiTestLog[]>(['admin-test-logs']) ?? [];
      const sorted = [...mapTestLogs(logs)].sort(
        (a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
      );
      const pick = consultationPickerRef.current;
      const filtered =
        pick === CONSULTATION_PICKER_NEW
          ? sorted.filter((t) => t.productId == null)
          : pick == null
            ? []
            : sorted.filter((t) => t.productId === pick);
      if (filtered.length > 0) {
        setSelectedTestLogId(filtered[0].id);
        setTestLogSelectKey((k) => k + 1);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no teste'),
  });

  const handleSaveProvider = async (form: Partial<Provider>) => {
    setSavingProvider(true);
    try {
      const creds = pairsToCredentials(form.credentials || []);
      if (form.custom_variables) {
        const cvObj: Record<string, string> = {};
        for (const cv of form.custom_variables) {
          if (cv.key.trim()) {
            cvObj[cv.key.trim().toUpperCase()] = cv.value;
          }
        }
        (creds as any).custom_variables = cvObj;
      }
      const isActive = form.status !== 'inactive';

      if (providerModal.provider) {
        const id = providerModal.provider.id;
        await patchProviderApi(accessToken, id, {
          name: form.name,
          baseUrl: form.baseUrl,
          authType: authToApi(form.authType || 'custom'),
          credentials: creds,
          isActive,
        });
        const balId = providerModal.provider.balanceOperationId;
        const recId = providerModal.provider.rechargeOperationId;
        if (balId && form.balanceEndpoint) {
          await patchOperationApi(accessToken, balId, { path: form.balanceEndpoint });
        }
        if (recId && form.rechargeEndpoint) {
          await patchOperationApi(accessToken, recId, { path: form.rechargeEndpoint });
        }
        toast.success('Provedor atualizado');
      } else {
        const slug = slugify(form.name || 'provedor');
        const created = await createProviderApi(accessToken, {
          name: form.name!,
          slug,
          baseUrl: form.baseUrl!,
          authType: authToApi(form.authType || 'custom'),
          credentials: creds,
        });
        await createOperationApi(accessToken, {
          providerId: created.id,
          operationType: 'BALANCE_CHECK',
          name: 'Saldo',
          path: form.balanceEndpoint || '/balance',
          method: 'GET',
        });
        await createOperationApi(accessToken, {
          providerId: created.id,
          operationType: 'RECHARGE',
          name: 'Recarga',
          path: form.rechargeEndpoint || '/recharge',
          method: 'POST',
        });
        toast.success('Provedor cadastrado');
      }
      invalidateAll();
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSaveFieldType = async (form: Partial<ConsultationFieldType>) => {
    setSavingFieldType(true);
    try {
      if (fieldTypeModal.ft) {
        await patchCanonicalFieldApi(accessToken, fieldTypeModal.ft.id, {
          label: form.label,
          description: form.description || null,
          uiItemFilters: form.typeItemFilters ?? [],
          ...(form.reportFieldConfig !== undefined ? { reportFieldConfig: form.reportFieldConfig } : {}),
        });
        toast.success('Tipo atualizado');
      } else {
        await createCanonicalFieldApi(accessToken, {
          pathKey: form.key!,
          label: form.label!,
          dataType: 'object',
          description: form.description,
          uiItemFilters: form.typeItemFilters ?? [],
          ...(form.reportFieldConfig !== undefined ? { reportFieldConfig: form.reportFieldConfig } : {}),
        });
        if (currentFolderId) {
          await postAssociationMutation.mutateAsync({
            fieldTypeKey: form.key!,
            folderId: currentFolderId,
          });
        }
        toast.success('Tipo cadastrado');
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } finally {
      setSavingFieldType(false);
    }
  };

  const handleImportDefaultFieldTypes = async () => {
    setImportingDefaultFieldTypes(true);
    try {
      await importDefaultCanonicalSectionsApi(accessToken);
      toast.success('Tipos padrão importados');
      await queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível importar os tipos padrão';
      toast.error(msg);
    } finally {
      setImportingDefaultFieldTypes(false);
    }
  };

  const handleSaveTypeReportFields = async (fieldType: ConsultationFieldType, reportFieldConfig: ConsultationFieldType['reportFieldConfig']) => {
    setSavingFieldType(true);
    try {
      await patchCanonicalFieldApi(accessToken, fieldType.id, {
        reportFieldConfig,
      });
      toast.success('Campos do tipo atualizados');
      await queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível salvar os campos do tipo';
      toast.error(msg);
    } finally {
      setSavingFieldType(false);
    }
  };

  const saveConsultation = async (data: Partial<ProviderConsultation>, existingId?: string) => {
    let sampleResponse: unknown = undefined;
    if (data.sampleResponse !== undefined && data.sampleResponse !== '') {
      try {
        sampleResponse = JSON.parse(data.sampleResponse);
      } catch {
        sampleResponse = data.sampleResponse;
      }
    }

    let bodyTemplate: unknown | null | undefined = undefined;
    if (data.bodyTemplateJson !== undefined) {
      const raw = data.bodyTemplateJson.trim();
      if (!raw) {
        bodyTemplate = null;
      } else {
        try {
          const parsedRaw = raw.replace(/:\s*`([\s\S]*?)`/g, ': "$1"');
          bodyTemplate = JSON.parse(parsedRaw);
        } catch {
          toast.error('Corpo da requisição (JSON) inválido');
          return;
        }
      }
    }

    if (existingId) {
      const prev = findConsultation(existingId);
      const apiProd = apiProviders.flatMap((p) => p.products).find((pr) => pr.id === existingId);
      await patchProductApi(accessToken, existingId, {
        name: data.name,
        code: apiProd?.code ?? slugify(data.name || 'prod'),
        externalId: data.externalId || null,
        endpointPath: data.endpoint,
        method: data.method || 'POST',
        cost: data.cost ?? 0,
        consultationPrice: data.consultationPrice ?? data.cost ?? 0,
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse === undefined ? undefined : sampleResponse,
        ...(bodyTemplate !== undefined ? { bodyTemplate } : {}),
        ...(data.typeItemFilters !== undefined ? { typeItemFilters: data.typeItemFilters } : {}),
      });
      await syncMappings(accessToken, existingId, fieldTypes, data.fieldMappings || [], prev);
      useEditorStore.getState().clearDraftSampleResponse(existingId);
      // Limpar o log de teste selecionado para esta consulta no templates drawer,
      // garantindo que o drawer use o mock estático recém-salvo (sampleResponse do banco).
      {
        const currentMeta = useEditorStore.getState().template?.metadata ?? {};
        const selectedTestLogs = { ...((currentMeta.selectedTestLogs as Record<string, string>) ?? {}) };
        if (selectedTestLogs[existingId]) {
          delete selectedTestLogs[existingId];
          useEditorStore.getState().updateMetadata({ selectedTestLogs });
        }
      }
      toast.success('Consulta atualizada');
    } else {
      if (!data.providerId) {
        toast.error('Selecione o provedor');
        return;
      }
      const code = slugify(data.externalId || data.name || `prod-${Date.now()}`);
      const created = await createProductApi(accessToken, {
        providerId: data.providerId,
        name: data.name!,
        code,
        externalId: data.externalId || null,
        endpointPath: data.endpoint!,
        method: data.method || 'POST',
        cost: data.cost ?? 0,
        consultationPrice: data.consultationPrice ?? data.cost ?? 0,
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse ?? undefined,
        ...(bodyTemplate !== undefined && bodyTemplate !== null ? { bodyTemplate } : {}),
        ...(data.typeItemFilters !== undefined ? { typeItemFilters: data.typeItemFilters } : {}),
      });
      await syncMappings(accessToken, created.id, fieldTypes, data.fieldMappings || [], undefined);
      useEditorStore.getState().clearDraftSampleResponse(created.id);
      toast.success('Consulta cadastrada');
      setConsultationPicker(created.id);
    }
    invalidateAll();
    setNewConsultationProviderId(undefined);
  };

  const errToast = useRef(false);
  useEffect(() => {
    if (providersQuery.isError && !errToast.current) {
      errToast.current = true;
      toast.error('Erro ao carregar integrações');
    }
    if (!providersQuery.isError) errToast.current = false;
  }, [providersQuery.isError]);

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.baseUrl.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getLinkedConsultations = (fieldTypeKey: string) =>
    consultations.filter((c) => c.fieldMappings.some((m) => m.fieldTypeKey === fieldTypeKey));

  const isCompanyManager = user?.backendRole === 'COMPANY_OWNER' || user?.backendRole === 'COMPANY_MANAGER';
  const isPlatformAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const isCustomerAdmin = user?.backendRole === 'CUSTOMER_ADMIN';

  if (!isPlatformAdmin && !isCustomerAdmin && !isCompanyManager) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isCompanyManager) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Integrações & API"
          subtitle="Gerencie seus tokens de acesso e scripts White-Label"
          titleClassName="text-3xl font-bold tracking-tight"
          subtitleClassName="text-base text-muted-foreground mt-1.5"
        />
        <CompanyApiTokensTab accessToken={accessToken} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrações"
        subtitle="Provedores, consultas e mapeamento de dados"
        titleClassName="text-3xl font-bold tracking-tight"
        subtitleClassName="text-base text-muted-foreground mt-1.5"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className={`pl-9 w-52 h-9 ${inputCls}`}
          />
        </div>
      </PageHeader>

      {providersQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}

      <Tabs
        value={integrationsTab}
        onValueChange={(v) => setIntegrationsTabWithUrl(v as IntegrationsTab)}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-10 bg-muted/50 p-1 rounded-lg gap-1 inline-flex w-fit max-w-full overflow-x-auto [scrollbar-width:thin]">
            <TabsTrigger value="providers" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Server className="w-4 h-4" /> Provedores
            </TabsTrigger>
            <TabsTrigger value="consultations" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Database className="w-4 h-4" /> Consultas
            </TabsTrigger>
            <TabsTrigger value="types" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Tag className="w-4 h-4" /> Tipos
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Layers3 className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="data_contract" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Factory className="w-4 h-4" /> Fábrica de Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Cog className="w-4 h-4" /> Configurações
            </TabsTrigger>
          </TabsList>
          {integrationsTab === 'providers' && (
            <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4 shrink-0" onClick={() => setProviderModal({ open: true })}>
              <Plus className="w-4 h-4 mr-1.5" /> Provedor
            </Button>
          )}
          {integrationsTab === 'consultations' && (
            <Button
              size="default"
              className="gradient-primary text-primary-foreground text-sm h-9 px-4 shrink-0"
              onClick={() => {
                setConsultationPicker(CONSULTATION_PICKER_NEW);
                setNewConsultationProviderId(undefined);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova consulta
            </Button>
          )}

        </div>

        <TabsContent value="providers" className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredProviders.map((prov, i) => {
              const provConsults = consultations.filter((c) => c.providerId === prov.id);
              const isActive = prov.status === 'active';

              return (
                <motion.div key={prov.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="min-w-0">
                  <div
                    className={`bg-card rounded-lg border border-border overflow-hidden h-full flex flex-col shadow-sm transition-[opacity,filter] ${
                      isActive ? '' : 'opacity-[0.68] saturate-[0.55]'
                    }`}
                  >
                    <div className="border-b border-border/70">
                      <div className="flex items-start gap-2.5 px-3 py-2.5">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-emerald-500/10' : 'bg-muted'}`}
                        >
                          <Server className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className={`${cardTitleCls} line-clamp-2 block leading-snug`}>{prov.name}</span>
                          <p className={`${metaMonoCls} truncate text-[11px] leading-tight text-muted-foreground`}>{prov.baseUrl}</p>
                        </div>
                        <div className="flex shrink-0 items-center pt-0.5">
                          <Switch
                            size="sm"
                            checked={isActive}
                            disabled={togglingProviderStatusId === prov.id}
                            onCheckedChange={(v) => {
                              void persistProviderIsActive(prov.id, v);
                            }}
                            aria-label={isActive ? 'Desativar provedor' : 'Ativar provedor'}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/40 px-3 py-2">
                        <button
                          type="button"
                          className={`${linkActionCls} text-primary hover:text-primary/80`}
                          onClick={() => {
                            setIntegrationsTabWithUrl('consultations');
                            setConsultationPicker(CONSULTATION_PICKER_NEW);
                            setNewConsultationProviderId(prov.id);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Consulta
                        </button>
                        <span className="text-border hidden sm:inline select-none" aria-hidden>
                          ·
                        </span>
                        <button type="button" className={`${linkActionCls} text-muted-foreground hover:text-foreground`} onClick={() => setProviderModal({ open: true, provider: prov })}>
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <span className="text-border hidden sm:inline select-none" aria-hidden>
                          ·
                        </span>
                        <button
                          type="button"
                          className={`${linkActionCls} text-muted-foreground hover:text-destructive`}
                          onClick={async () => {
                            try {
                              await deleteProviderApi(accessToken, prov.id);
                              toast.success('Removido');
                              invalidateAll();
                            } catch {
                              toast.error('Não foi possível remover o provedor');
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden flex-1 flex flex-col min-h-0">
                      <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3 pt-2.5">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="rounded-md border border-border/80 bg-muted/20 p-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo</p>
                            <code className="break-all text-xs font-mono leading-relaxed text-foreground">{prov.balanceEndpoint || '—'}</code>
                          </div>
                          <div className="rounded-md border border-border/80 bg-muted/20 p-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recarga</p>
                            <code className="break-all text-xs font-mono leading-relaxed text-foreground">{prov.rechargeEndpoint || '—'}</code>
                          </div>
                          <div className="rounded-md border border-border/80 bg-muted/20 p-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Auth</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs capitalize text-foreground">{prov.authType}</span>
                              <span className="text-[11px] text-muted-foreground">({prov.credentials.length})</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div
                            className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/15 px-2.5 py-2"
                            role="status"
                            aria-label={`${provConsults.length} consultas cadastradas neste provedor`}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Consultas cadastradas
                            </span>
                            <span className="flex items-center gap-1 tabular-nums text-sm font-medium text-foreground">
                              <Hash className="h-3 w-3 text-muted-foreground" aria-hidden />
                              {provConsults.length}
                            </span>
                          </div>
                          {provConsults.length > 0 && (
                            <div className="space-y-1" role="list">
                              {provConsults.map((pc) => (
                                <div
                                  key={pc.id}
                                  role="listitem"
                                  className="flex items-center justify-between gap-1 rounded-md border border-border/80 bg-background px-2 py-1.5 transition-colors hover:border-primary/25 group"
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                    <Database className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                                    <span className="truncate text-xs font-medium text-foreground">{pc.name}</span>
                                    <code className="shrink-0 text-[10px] font-mono text-muted-foreground">{pc.externalId}</code>
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                    onClick={async () => {
                                      try {
                                        await deleteProductApi(accessToken, pc.id);
                                        toast.success('Removida');
                                        invalidateAll();
                                      } catch {
                                        toast.error('Não foi possível remover');
                                      }
                                    }}
                                    aria-label={`Remover ${pc.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {!providersQuery.isLoading && filteredProviders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Server className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum provedor encontrado</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-2">
          {integrationsTab === 'consultations' && providersQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando consultas…</p>
          )}

          {integrationsTab === 'consultations' && !providersQuery.isLoading && consultationPicker !== null && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <div
                className={`bg-card rounded-md border p-4 ${
                  consultationPicker === CONSULTATION_PICKER_NEW ? 'border-2 border-primary/30' : 'border-border'
                }`}
              >
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Select
                      value={consultationPicker}
                      onValueChange={(v) => {
                        setConsultationPicker(v);
                        if (v !== CONSULTATION_PICKER_NEW) setNewConsultationProviderId(undefined);
                      }}
                    >
                      <SelectTrigger className={`h-9 w-full min-w-[12rem] flex-1 sm:max-w-lg ${selectTriggerCls}`}>
                        <SelectValue placeholder="Selecione uma consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CONSULTATION_PICKER_NEW}>Nova consulta</SelectItem>
                        {sortedConsultations.map((c) => {
                          const pv = providers.find((p) => p.id === c.providerId);
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} — {pv?.name ?? 'Provedor'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      key={testLogSelectKey}
                      value={selectedTestLogId}
                      disabled={testLogForPicker.length === 0}
                      onValueChange={(logId) => {
                        const entry = testLogForPicker.find((t) => t.id === logId);
                        if (entry) {
                          consultationEditorRef.current?.loadResponseFromLog(entry);
                          setSelectedTestLogId(logId);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full min-w-[11rem] sm:w-[min(100%,16rem)] cursor-pointer disabled:cursor-not-allowed">
                        <SelectValue
                          placeholder={
                            selectedTestLog
                              ? `${selectedTestLog.consultationName} · ${new Date(selectedTestLog.testedAt).toLocaleString('pt-BR')}`
                              : 'Carregar retorno do histórico…'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {testLogForPicker.map((entry) => {
                          const pv = providers.find((p) => p.id === entry.providerId);
                          return (
                            <SelectItem key={entry.id} value={entry.id} className="cursor-pointer">
                              <span className="font-medium">{entry.consultationName}</span>
                              <span className="text-muted-foreground">
                                {' '}
                                · {pv?.name ?? '—'} ·{' '}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {new Date(entry.testedAt).toLocaleString('pt-BR')}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="gradient-primary h-9 w-9 shrink-0 cursor-pointer text-primary-foreground"
                          disabled={testMutation.isPending}
                          aria-label="Testar no provedor"
                          onClick={() => {
                            if (consultationPicker === CONSULTATION_PICKER_NEW) {
                              void newConsultationTestRef.current?.();
                            } else {
                              const run = cardTestFnsRef.current[consultationPicker];
                              if (run) void run();
                              else void testMutation.mutateAsync({ kind: 'saved', productId: consultationPicker });
                            }
                          }}
                        >
                          {testMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Play className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Testar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="gradient-primary h-9 w-9 shrink-0 cursor-pointer text-primary-foreground"
                          aria-label="Salvar consulta"
                          onClick={() => consultationEditorRef.current?.save()}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Salvar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 cursor-pointer"
                          aria-label="Reverter alterações"
                          onClick={() => consultationEditorRef.current?.revert()}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Reverter alterações</TooltipContent>
                    </Tooltip>
                    {consultationPicker !== CONSULTATION_PICKER_NEW && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                            aria-label="Excluir consulta"
                            onClick={async () => {
                              const idToDelete = consultationPicker;
                              try {
                                await deleteProductApi(accessToken, idToDelete);
                                toast.success('Removida');
                                invalidateAll();
                                const rest = consultations.filter((c) => c.id !== idToDelete);
                                const sorted = [...rest].sort(
                                  (a, b) =>
                                    new Date(b.updatedAt || 0).getTime() -
                                    new Date(a.updatedAt || 0).getTime(),
                                );
                                setConsultationPicker(sorted[0]?.id ?? CONSULTATION_PICKER_NEW);
                                setConsultationEditorNonce((n) => n + 1);
                              } catch {
                                toast.error('Não foi possível remover');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Excluir consulta</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {consultationPicker === CONSULTATION_PICKER_NEW ? (
                  <NewConsultationForm
                    ref={consultationEditorRef}
                    key={`new-${newConsultationProviderId ?? 'none'}`}
                    providers={providers}
                    fieldTypes={fieldTypes}
                    testLog={testLog}
                    providerId={newConsultationProviderId}
                    registerNewConsultationTestFn={registerNewConsultationTestFn}
                    onTest={(input) => testMutation.mutateAsync(input)}
                    onSave={async (data) => saveConsultation(data)}
                    onCancel={() => {
                      if (sortedConsultations.length === 0) return;
                      setConsultationPicker(sortedConsultations[0].id);
                      setNewConsultationProviderId(undefined);
                    }}
                  />
                ) : (
                  <ConsultationEditor
                    ref={consultationEditorRef}
                    key={`${consultationPicker}-${consultationEditorNonce}`}
                    consultation={findConsultation(consultationPicker)!}
                    providers={providers}
                    fieldTypes={fieldTypes}
                    testLog={testLog}
                    registerCardTestFn={registerCardTestFn}
                    onTest={(input) => testMutation.mutateAsync(input)}
                    onSave={async (data) => saveConsultation(data, consultationPicker)}
                    onCancel={() => {
                      if (consultationPicker) {
                        useEditorStore.getState().clearDraftSampleResponse(consultationPicker);
                      }
                      setConsultationEditorNonce((n) => n + 1);
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="types" className="mt-2 outline-none focus-visible:ring-0">
          {(() => {
            const isLoadingData = canonicalQuery.isLoading || foldersQuery.isLoading || associationsQuery.isLoading;

            if (isLoadingData) {
              return (
                <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/65 shadow-sm h-[clamp(22rem,calc(100vh-11.5rem),52rem)] w-full animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-sm font-semibold text-muted-foreground animate-pulse">Carregando catálogo de tipos...</p>
                  </div>
                </div>
              );
            }

            const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
            const currentTypes = searchTerm.trim()
              ? fieldTypes.filter(
                  (ft) =>
                    ft.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    ft.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    ft.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : fieldTypes.filter((ft) => {
                  const assoc = associations.find((a) => a.fieldTypeKey === ft.key);
                  const folderId = assoc ? assoc.folderId : null;
                  return folderId === currentFolderId;
                });
            const isFolderEmpty = currentFolders.length === 0 && currentTypes.length === 0;
            const hasSelection = selectedTypes.length > 0;
            const isAllSelected = currentTypes.length > 0 && currentTypes.map((ft) => ft.key).every((key) => selectedTypes.includes(key));

            const handleSelectAll = () => {
              const allCurrentKeys = currentTypes.map((ft) => ft.key);
              const allAlreadySelected = allCurrentKeys.every((key) => selectedTypes.includes(key));
              if (allAlreadySelected) {
                setSelectedTypes((prev) => prev.filter((key) => !allCurrentKeys.includes(key)));
              } else {
                setSelectedTypes((prev) => {
                  const next = [...prev];
                  allCurrentKeys.forEach((key) => {
                    if (!next.includes(key)) next.push(key);
                  });
                  return next;
                });
              }
            };

            const showNavigation = selectedFieldType !== null && isDetailsExpanded;
            const showCatalog = selectedFieldType === null || (selectedFieldType !== null && !isDetailsExpanded);
            const showDetails = selectedFieldType !== null;

            return (
              <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm h-[clamp(22rem,calc(100vh-11.5rem),52rem)] w-full">
                <style>{`
                  .catalog-panel-container {
                    container-type: inline-size;
                    container-name: catalog;
                  }
                  .catalog-cards-grid {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                  }
                  .catalog-folders-grid {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                  }
                  @container catalog (max-width: 850px) {
                    .catalog-cards-grid {
                      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                    .catalog-folders-grid {
                      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }
                  }
                  @container catalog (max-width: 580px) {
                    .catalog-cards-grid {
                      grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                    }
                    .catalog-folders-grid {
                      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                  }
                  @container catalog (max-width: 380px) {
                    .catalog-folders-grid {
                      grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                    }
                  }
                `}</style>
                <ResizablePanelGroup
                  key={`panel-group-${showNavigation}-${showCatalog}-${showDetails}`}
                  direction="horizontal"
                  className="h-full w-full"
                >
                  {/* Painel 1: Barra Lateral de Navegação (Folders / Types Reference) */}
                  {showNavigation && (
                    <ResizablePanel
                      ref={navigationPanelRef}
                      id="types-navigation"
                      order={1}
                      defaultSize={lastValidNavigationSizeRef.current}
                      minSize={10}
                      maxSize={45}
                      collapsible={true}
                      onResize={(size) => {
                        if (selectedFieldType !== null && isDetailsExpanded && size < 95) {
                          lastNavigationSizeRef.current = size;
                          if (size >= 10 && size <= 25) {
                            lastValidNavigationSizeRef.current = size;
                          }
                        }
                        if (!isChangingLayoutRef.current && selectedFieldType !== null && size >= 25 && isDetailsExpanded) {
                          isChangingLayoutRef.current = true;
                          setIsDetailsExpanded(false);
                          setTimeout(() => {
                            isChangingLayoutRef.current = false;
                          }, 400);
                        }
                      }}
                      className={`border-r border-border bg-muted/20 flex flex-col h-full overflow-hidden shrink-0 ${isTransitioning ? 'transition-all duration-300 ease-in-out' : ''}`}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full flex flex-col h-full min-w-[200px] shrink-0"
                      >
                        <div className="shrink-0 border-b border-border/70 px-3 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipos canônicos</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                              {searchTerm.trim() ? `${currentTypes.length} encontrados` : `${currentFolders.length} pastas · ${currentTypes.length} tipos`}
                            </p>
                          </div>
                        </div>

                        {!searchTerm.trim() && currentFolderId && (
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add("bg-indigo-500/10");
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove("bg-indigo-500/10");
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("bg-indigo-500/10");
                              const folder = folders.find((f) => f.id === currentFolderId);
                              const parentId = folder ? folder.parentId : null;
                              const parentName = folder && folder.parentId 
                                ? (folders.find(f => f.id === folder.parentId)?.name || 'Pasta anterior')
                                : 'Raiz';
                              await handleDropOnFolder(e, parentId, parentName);
                            }}
                            className="shrink-0 border-b border-border/70 px-3 py-2 flex items-center gap-1.5 bg-muted/10 transition-colors"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md cursor-pointer hover:bg-muted"
                              onClick={() => {
                                const folder = folders.find((f) => f.id === currentFolderId);
                                setCurrentFolderId(folder ? folder.parentId : null);
                                setSelectedFieldType(null);
                                setIsDetailsExpanded(false);
                              }}
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </Button>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {folders.find((f) => f.id === currentFolderId)?.name || 'Voltar'}
                            </span>
                          </div>
                        )}

                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2.5 [scrollbar-width:thin] space-y-2">
                          {/* Listagem de pastas filhas na barra lateral */}
                          {!searchTerm.trim() && currentFolders.length > 0 && (
                            <div className="space-y-1.5 pb-2 border-b border-border/40">
                              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase px-1 tracking-wide">Pastas</p>
                              {currentFolders.map((folder) => (
                                <div
                                  key={folder.id}
                                  onClick={() => {
                                           setCurrentFolderId(folder.id);
                                           setSelectedFieldType(null);
                                           setIsDetailsExpanded(false);
                                         }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add("border-indigo-500", "bg-indigo-500/10");
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-500/10");
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-500/10");
                                    await handleDropOnFolder(e, folder.id, folder.name);
                                  }}
                                  className="group/folder flex items-center justify-between gap-2 p-1.5 rounded-lg border border-border/45 bg-card/65 hover:border-indigo-500/35 hover:bg-background/85 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="text-xs font-semibold text-foreground truncate">{folder.name}</span>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover/folder:opacity-100 focus:opacity-100 transition-opacity">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleOpenRenameFolder(folder)}>
                                        <Pencil className="w-3 h-3 mr-1.5" /> Renomear
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="cursor-pointer text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteFolder(folder.id)}>
                                        <Trash2 className="w-3 h-3 mr-1.5" /> Excluir
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleOpenMoveItem('folder', folder.id, folder.name)}>
                                        <Move className="w-3 h-3 mr-1.5" /> Mover
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Listagem de tipos canônicos na barra lateral */}
                          <div className="space-y-2">
                            {!searchTerm.trim() && currentFolders.length > 0 && currentTypes.length > 0 && (
                              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase px-1 tracking-wide pt-1">Tipos Canônicos</p>
                            )}
                            {currentTypes.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {currentTypes.map((ft, i) => {
                                  const isSelected = selectedTypes.includes(ft.key);
                                  const isEditorSelected = selectedFieldType === ft.key;
                                  
                                  return (
                                    <motion.div key={ft.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}>
                                      <div
                                         onClick={() => setSelectedFieldType(isEditorSelected ? null : ft.key)}
                                         onKeyDown={(e) => e.key === 'Enter' && setSelectedFieldType(isEditorSelected ? null : ft.key)}
                                         draggable
                                         onDragStart={(e) => {
                                           const isSelected = selectedTypes.includes(ft.key);
                                           const dragData = isSelected 
                                             ? { type: 'bulk', keys: selectedTypes } 
                                             : { type: 'single', key: ft.key };
                                           e.dataTransfer.setData("application/json", JSON.stringify(dragData));
                                           e.dataTransfer.setData("text/plain", ft.key);
                                           e.dataTransfer.effectAllowed = "move";
                                         }}
                                         role="button"
                                         tabIndex={0}
                                         className={`group/card relative flex cursor-pointer flex-col rounded-lg border text-left transition-all duration-200 p-2.5 ${
                                           isEditorSelected
                                             ? `${ftColorClass(ft.color, 'bg')} ${ftColorClass(ft.color, 'border')} border-2 shadow-sm ring-1 ring-primary/10`
                                             : isSelected
                                             ? 'border-indigo-500 border-2 bg-indigo-500/5 shadow-sm'
                                             : 'border-border/60 bg-card/90 hover:border-primary/25 hover:bg-background hover:shadow-sm'
                                         }`}
                                       >
                                         <div className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-px rounded-md border border-border/40 bg-background/90 p-px opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
                                           <button
                                             type="button"
                                             className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setFieldTypeModal({ open: true, ft });
                                             }}
                                             aria-label={`Editar ${ft.label}`}
                                           >
                                             <Pencil className="h-3 w-3" />
                                           </button>
                                           <button
                                             type="button"
                                             className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                             onClick={async (e) => {
                                               e.stopPropagation();
                                               try {
                                                 await deleteCanonicalFieldApi(accessToken, ft.id);
                                                 toast.success('Removido');
                                                 void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
                                               } catch {
                                                 toast.error('Não foi possível remover (pode haver mapeamentos)');
                                               }
                                             }}
                                             aria-label={`Remover ${ft.label}`}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </button>
                                           <button
                                             type="button"
                                             className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleOpenMoveItem('type', ft.key, ft.label);
                                             }}
                                             aria-label={`Mover ${ft.label}`}
                                           >
                                             <Move className="h-3 w-3" />
                                           </button>
                                         </div>

                                         <div className="flex gap-2 items-center">
                                           <div
                                             className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${ftColorClass(ft.color, 'bg')}`}
                                             aria-hidden
                                           >
                                             <Tag className={`h-3.5 w-3.5 ${ftColorClass(ft.color, 'text')}`} />
                                           </div>
                                           <div className="min-w-0 flex-1 space-y-0.5">
                                             <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">{ft.label}</p>
                                             <code
                                               className="block truncate font-mono text-[10px] leading-none text-muted-foreground/90"
                                               title={ft.key}
                                             >
                                               {ft.key}
                                             </code>
                                           </div>
                                         </div>
                                       </div>
                                     </motion.div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground text-xs">
                                Nenhum tipo nesta pasta
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </ResizablePanel>
                  )}

                  {showNavigation && showCatalog && (
                    <ResizableHandle 
                      className="w-1 bg-border/40 hover:bg-indigo-500/50 transition-colors" 
                      onDragging={(dragging) => {
                        setIsDragging(dragging);
                        if (!dragging) {
                          handleDragEnd();
                        }
                      }}
                    />
                  )}

                  {/* Painel 2: Grade de Catálogo (Subpastas e Cards de Tipos Canônicos) */}
                  {showCatalog && (
                    <ResizablePanel
                      id="types-catalog"
                      order={2}
                      defaultSize={selectedFieldType ? lastValidCatalogSizeRef.current : 100}
                      minSize={20}
                      onResize={(size) => {
                        if (selectedFieldType !== null && size < 95) {
                          lastCatalogSizeRef.current = size;
                          if (size >= 45 && size <= 85) {
                            lastValidCatalogSizeRef.current = size;
                          }
                        }
                        if (!isChangingLayoutRef.current && selectedFieldType !== null && size <= 25 && !isDetailsExpanded) {
                          isChangingLayoutRef.current = true;
                          setIsDetailsExpanded(true);
                          setTimeout(() => {
                            isChangingLayoutRef.current = false;
                          }, 400);
                        }
                      }}
                      className={`catalog-panel-container bg-background/40 flex flex-col h-full min-w-0 ${isTransitioning ? 'transition-all duration-300 ease-in-out' : ''}`}
                    >
                      {/* Toolbar Unificada */}
                      <div className="shrink-0 border-b border-border/60 bg-muted/10 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Botão Novo Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                className="gradient-primary text-primary-foreground h-8 gap-1.5 px-3 rounded-md text-xs cursor-pointer shadow-sm hover:shadow transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Novo
                                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-background border-border text-foreground shadow-lg rounded-lg">
                              <DropdownMenuItem className="cursor-pointer text-xs" onClick={handleOpenCreateFolder}>
                                <FolderPlus className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                Nova pasta
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setFieldTypeModal({ open: true })}>
                                <Plus className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                Novo tipo canônico
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Botão Importar Padrões */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2.5 rounded-md text-xs cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                            onClick={() => void handleImportDefaultFieldTypes()}
                            disabled={importingDefaultFieldTypes}
                          >
                            <RefreshCcw className={`w-3.5 h-3.5 text-indigo-500 ${importingDefaultFieldTypes ? 'animate-spin' : ''}`} />
                            {importingDefaultFieldTypes ? 'Importando…' : 'Importar padrões'}
                          </Button>

                          <div className="h-4 w-px bg-border/60 mx-1" />

                          {/* Ações em Lote */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBulkCopy}
                            disabled={!hasSelection}
                            className={`h-8 gap-1.5 px-2.5 rounded-md text-xs cursor-pointer transition-all ${
                              hasSelection 
                                ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-medium' 
                                : 'text-muted-foreground/30 opacity-50 cursor-not-allowed pointer-events-none'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenMoveItem('type', 'bulk', `${selectedTypes.length} tipos`)}
                            disabled={!hasSelection}
                            className={`h-8 gap-1.5 px-2.5 rounded-md text-xs cursor-pointer transition-all ${
                              hasSelection 
                                ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-medium' 
                                : 'text-muted-foreground/30 opacity-50 cursor-not-allowed pointer-events-none'
                            }`}
                          >
                            <Move className="w-3.5 h-3.5" />
                            Mover
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={!hasSelection}
                            className={`h-8 gap-1.5 px-2.5 rounded-md text-xs cursor-pointer transition-all ${
                              hasSelection 
                                ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium' 
                                : 'text-muted-foreground/30 opacity-50 cursor-not-allowed pointer-events-none'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </Button>
                        </div>

                        {/* Selecionar Tudo e Contagem */}
                        <div className="flex items-center gap-3">
                          {hasSelection && (
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 animate-in fade-in duration-200">
                              {selectedTypes.length} selecionado{selectedTypes.length !== 1 ? 's' : ''}
                            </span>
                          )}

                          <div
                            role="button"
                            tabIndex={0}
                            className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 gap-2 px-2.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80 ${
                              currentTypes.length === 0 ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            onClick={currentTypes.length > 0 ? handleSelectAll : undefined}
                            onKeyDown={(e) => {
                              if (currentTypes.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                handleSelectAll();
                              }
                            }}
                          >
                            <Checkbox
                              checked={isAllSelected}
                              disabled={currentTypes.length === 0}
                              className="h-3.5 w-3.5 pointer-events-none border-muted-foreground data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <span>Selecionar tudo</span>
                          </div>
                        </div>
                      </div>

                      {/* Breadcrumbs */}
                      <div className="shrink-0 border-b border-border/50 px-4 py-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        {getBreadcrumbs(currentFolderId).map((crumb, idx, arr) => (
                          <div 
                            key={crumb.id ?? 'root'} 
                            className="flex items-center gap-1.5"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add("bg-indigo-500/10", "rounded", "px-1");
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove("bg-indigo-500/10", "rounded", "px-1");
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("bg-indigo-500/10", "rounded", "px-1");
                              await handleDropOnFolder(e, crumb.id, crumb.name);
                            }}
                          >
                            <button
                              type="button"
                              className={`hover:text-indigo-600 transition-colors font-semibold flex items-center gap-1 cursor-pointer ${
                                idx === arr.length - 1 ? 'text-foreground font-bold' : ''
                              }`}
                              onClick={() => {
                                 setCurrentFolderId(crumb.id);
                                 setSelectedFieldType(null);
                                 setIsDetailsExpanded(false);
                              }}
                            >
                              {crumb.id === null ? <FolderTree className="w-3.5 h-3.5 text-indigo-500" /> : <Folder className="w-3.5 h-3.5 text-indigo-500" />}
                              {crumb.name}
                            </button>
                            {idx < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
                          </div>
                        ))}
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5 [scrollbar-width:thin]">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={currentFolderId ?? 'root'}
                            initial={{ opacity: 0, x: isNavigatingBack ? -12 : 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isNavigatingBack ? 12 : -12 }}
                            transition={{
                              opacity: { duration: 0.2, ease: "easeInOut" },
                              x: { type: "spring", damping: 30, stiffness: 220 }
                            }}
                            className="space-y-6 h-full"
                          >
                            {isFolderEmpty ? (
                              <div className="flex min-h-[min(26rem,calc(100vh-20rem))] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-16 text-center">
                                <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                                  <FolderOpen className="h-7 w-7 animate-pulse" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">Esta pasta está vazia</h3>
                                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground/80">
                                  Adicione subpastas para organize ou crie tipos canônicos de dados diretamente aqui.
                                </p>
                              </div>
                            ) : (
                              <>
                                {!searchTerm.trim() && currentFolders.length > 0 && (
                                  <div className="space-y-2.5">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <Folder className="w-3.5 h-3.5 text-indigo-500" /> Pastas ({currentFolders.length})
                                    </h3>
                                    <div className="catalog-folders-grid">
                                      {currentFolders.map((folder) => {
                                        const folderAssocs = associations.filter(a => a.folderId === folder.id);
                                        const subFolders = folders.filter(f => f.parentId === folder.id);
                                        const itemsCount = folderAssocs.length + subFolders.length;

                                        return (
                                          <div
                                            key={folder.id}
                                            onClick={() => {
                                              setCurrentFolderId(folder.id);
                                              setSelectedFieldType(null);
                                              setIsDetailsExpanded(false);
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              e.currentTarget.classList.add("border-indigo-500", "bg-indigo-500/10");
                                            }}
                                            onDragLeave={(e) => {
                                              e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-500/10");
                                            }}
                                            onDrop={async (e) => {
                                              e.preventDefault();
                                              e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-500/10");
                                              await handleDropOnFolder(e, folder.id, folder.name);
                                            }}
                                            className="group/folder-card flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:border-indigo-500/40 hover:shadow-sm cursor-pointer transition-all duration-200 border-2"
                                          >
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                                <Folder className="w-5 h-5 shrink-0" />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate">{folder.name}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                                  {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                                                </p>
                                              </div>
                                            </div>
                                            
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <button className="h-7 w-7 flex items-center justify-center rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover-card/folder-card:opacity-100 focus:opacity-100 transition-opacity">
                                                  <MoreVertical className="w-4 h-4" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleOpenRenameFolder(folder)}>
                                                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Renomear
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteFolder(folder.id)}>
                                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleOpenMoveItem('folder', folder.id, folder.name)}>
                                                  <Move className="w-3.5 h-3.5 mr-1.5" /> Mover pasta
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {currentTypes.length > 0 && (
                                  <div className="space-y-2.5">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-indigo-500" /> Tipos Canônicos ({currentTypes.length})
                                    </h3>
                                    <div className="catalog-cards-grid">
                                      {currentTypes.map((ft) => {
                                        const linked = getLinkedConsultations(ft.key);
                                        const assoc = associations.find((a) => a.fieldTypeKey === ft.key);
                                        const parentFolder = assoc ? folders.find((f) => f.id === assoc.folderId) : null;
                                        const isSelected = selectedTypes.includes(ft.key);

                                        return (
                                          <div
                                            key={ft.id}
                                            onClick={(e) => {
                                              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const isSelected = selectedTypes.includes(ft.key);
                                                if (isSelected) {
                                                  setSelectedTypes((prev) => prev.filter((k) => k !== ft.key));
                                                } else {
                                                  setSelectedTypes((prev) => [...prev, ft.key]);
                                                }
                                              } else {
                                                setSelectedFieldType(ft.key);
                                              }
                                            }}
                                            draggable
                                            onDragStart={(e) => {
                                              const isSelected = selectedTypes.includes(ft.key);
                                              const dragData = isSelected 
                                                ? { type: 'bulk', keys: selectedTypes } 
                                                : { type: 'single', key: ft.key };
                                              e.dataTransfer.setData("application/json", JSON.stringify(dragData));
                                              e.dataTransfer.setData("text/plain", ft.key);
                                              e.dataTransfer.effectAllowed = "move";
                                            }}
                                            className={`group/type-card relative flex flex-col justify-between p-4 rounded-xl border backdrop-blur-sm cursor-pointer transition-all duration-300 min-h-[8.5rem] ${
                                              isSelected 
                                                ? 'border-indigo-500 bg-indigo-500/5 shadow-md ring-2 ring-indigo-500/10' 
                                                : 'border-border/30 bg-card/40 hover:bg-card/75 hover:border-indigo-500/25 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                                            }`}
                                          >
                                            <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    setSelectedTypes((prev) => [...prev, ft.key]);
                                                  } else {
                                                    setSelectedTypes((prev) => prev.filter((k) => k !== ft.key));
                                                  }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`h-3.5 w-3.5 border-muted-foreground data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shrink-0 transition-opacity duration-200 ${
                                                  isSelected ? 'opacity-100' : 'opacity-0 group-hover/type-card:opacity-100 focus-within/type-card:opacity-100'
                                                }`}
                                              />
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                  <button className="h-6 w-6 flex items-center justify-center rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover/type-card:opacity-100 focus/type-card:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                  </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                                                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleOpenMoveItem('type', ft.key, ft.label)}>
                                                    <Move className="w-3.5 h-3.5 mr-1.5" /> Mover para pasta
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setFieldTypeModal({ open: true, ft })}>
                                                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem className="cursor-pointer text-xs text-destructive hover:bg-destructive/10" onClick={async () => {
                                                    try {
                                                      await deleteCanonicalFieldApi(accessToken, ft.id);
                                                      toast.success('Removido');
                                                      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
                                                    } catch {
                                                      toast.error('Não foi possível remover');
                                                    }
                                                  }}>
                                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>

                                            <div className="space-y-1 pr-14">
                                              <div className="flex items-center gap-2">
                                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/5 text-indigo-500 ${ftColorClass(ft.color, 'bg').replace('/10', '/5')}`}>
                                                  <Tag className={`h-3.5 w-3.5 ${ftColorClass(ft.color, 'text')}`} />
                                                </div>
                                                <span className="text-xs font-semibold text-foreground truncate leading-none">{ft.label}</span>
                                              </div>
                                              <code className="block font-mono text-[9px] text-muted-foreground/75 tracking-wider uppercase truncate pl-9">{ft.key}</code>
                                              {ft.description && (
                                                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 leading-relaxed pl-9">{ft.description}</p>
                                              )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/40 shrink-0">
                                              {parentFolder ? (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium truncate max-w-[120px]">
                                                  <Folder className="w-3 h-3 text-amber-500/70 shrink-0" />
                                                  <span className="truncate">{parentFolder.name}</span>
                                                </div>
                                              ) : (
                                                <span />
                                              )}
                                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium tabular-nums">
                                                <Database className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                                <span>{linked.length}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </ResizablePanel>
                  )}

                  {((showCatalog && showDetails) || (showNavigation && !showCatalog && showDetails)) && (
                    <ResizableHandle 
                      className="w-1 bg-border/40 hover:bg-indigo-500/50 transition-colors" 
                      onDragging={(dragging) => {
                        setIsDragging(dragging);
                        if (!dragging) {
                          handleDragEnd();
                        }
                      }}
                    />
                  )}

                  {/* Painel 3: Editor de Detalhes do Tipo Canônico */}
                  {showDetails && (
                    <ResizablePanel
                      id="types-details"
                      order={3}
                      defaultSize={isDetailsExpanded ? (100 - lastValidNavigationSizeRef.current) : (100 - lastValidCatalogSizeRef.current)}
                      minSize={30}
                      collapsible={true}
                      onCollapse={() => {
                        setSelectedFieldType(null);
                      }}
                      className={`flex flex-col h-full overflow-hidden bg-background ${isTransitioning ? 'transition-all duration-300 ease-in-out' : ''}`}
                    >
                      {(() => {
                        const ft = fieldTypes.find((f) => f.key === selectedFieldType);
                        const linked = getLinkedConsultations(selectedFieldType);
                        if (!ft) {
                          return (
                            <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-xs">
                              Tipo não encontrado
                            </div>
                          );
                        }

                        return (
                          <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                            style={{ originX: 1 }}
                            className="flex flex-col h-full overflow-hidden bg-background"
                          >
                            {/* Detalhes Header */}
                            <div className="shrink-0 border-b border-border/60 bg-muted/10 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <span className="font-semibold">Detalhes</span>
                                <ChevronRight className="w-3 h-3 shrink-0" />
                                <AnimatePresence mode="popLayout" initial={false}>
                                  <motion.span
                                    key={ft.key}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{
                                      opacity: { duration: 0.2, ease: "easeInOut" },
                                      y: { type: "spring", damping: 25, stiffness: 220 }
                                    }}
                                    className="text-foreground font-bold truncate max-w-[12rem] inline-block"
                                  >
                                    {ft.label}
                                  </motion.span>
                                </AnimatePresence>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                      onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                                      aria-label={isDetailsExpanded ? "Recolher painel" : "Expandir painel"}
                                    >
                                      {isDetailsExpanded ? (
                                        <Minimize2 className="w-3.5 h-3.5 text-indigo-500" />
                                      ) : (
                                        <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    {isDetailsExpanded ? "Recolher" : "Expandir"}
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                      onClick={() => setSelectedFieldType(null)}
                                      aria-label="Fechar painel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">Fechar</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5 [scrollbar-width:thin]">
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                  key={ft.key}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{
                                    opacity: { duration: 0.25, ease: "easeInOut" },
                                    y: { type: "spring", damping: 28, stiffness: 180 }
                                  }}
                                  className="space-y-4 h-full"
                                >
                              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/60">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Tag className={`w-5 h-5 ${ftColorClass(ft.color, 'text')}`} />
                                  <span className="text-base font-semibold text-foreground">{ft.label}</span>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{linked.length} consultas</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 px-3 rounded-md hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-400 shrink-0 cursor-pointer text-xs"
                                  onClick={() => {
                                    useIsolatedEditorStore.getState().openEditor({
                                      targetType: "canonicalField",
                                      targetId: ft.id,
                                      elementTree: ft.reportFieldConfig?.elementTree ?? [],
                                      code: ft.reportFieldConfig?.code ?? "",
                                      format: ft.reportFieldConfig?.format ?? "html",
                                      onSave: async (newTree, newCode, newFormat) => {
                                        try {
                                          await handleSaveTypeReportFields(ft, {
                                            version: 1,
                                            fields: ft.reportFieldConfig?.fields ?? [],
                                            code: newCode,
                                            format: newFormat,
                                            elementTree: newTree
                                          });
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }
                                    });
                                  }}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  Editar Layout/Código
                                </Button>
                              </div>

                              <TypeReportFieldsConfig
                                fieldType={ft}
                                saving={savingFieldType}
                                onSave={(nextConfig) => handleSaveTypeReportFields(ft, nextConfig)}
                              />

                              {linked.length === 0 ? (
                                <div className="text-center py-12 bg-card rounded-md border border-border">
                                  <Database className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">Nenhuma consulta vinculada</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {linked.map((pc) => (
                                    <LinkedConsultationCard
                                      key={pc.id}
                                      consultation={pc}
                                      provider={providers.find((p) => p.id === pc.providerId)}
                                      fieldType={ft}
                                      fieldTypeKey={selectedFieldType!}
                                      initialFilters={linkedConsultationInitialFilters(pc, selectedFieldType, fieldTypes)}
                                      accessToken={accessToken}
                                      onFiltersPersisted={invalidateAll}
                                    />
                                  ))}
                                </div>
                              )}
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-2">
          {integrationsTab === 'settings' && (
            <IntegrationsSettingsTab
              accessToken={accessToken}
              enabled={enabled}
              providers={providers}
              consultations={sortedConsultations}
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-2">
          <TemplatesMvpTab
            accessToken={accessToken}
            consultations={consultations}
          />
        </TabsContent>

        <TabsContent value="data_contract" className="space-y-2">
          {integrationsTab === 'data_contract' && (
            <ContractAuditTab
              accessToken={accessToken}
              providers={providers}
              consultations={consultations}
              fieldTypes={fieldTypes}
              testLogs={testLog}
              onCataloged={() => {
                invalidateAll();
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <ProviderModal
        open={providerModal.open}
        onClose={() => setProviderModal({ open: false })}
        provider={providerModal.provider}
        onSave={handleSaveProvider}
        saving={savingProvider}
      />
      <FieldTypeModal
        open={fieldTypeModal.open}
        onClose={() => setFieldTypeModal({ open: false })}
        fieldType={fieldTypeModal.ft}
        onSave={handleSaveFieldType}
        saving={savingFieldType}
      />
      
      {/* Diálogo para Criar/Renomear Pasta */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-sm gap-4 p-5 bg-background border border-border rounded-xl shadow-2xl">
          <DialogHeader className="pb-1 border-b border-border/40">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {folderDialogMode === 'create' ? <FolderPlus className="w-5 h-5 text-indigo-500" /> : <Pencil className="w-5 h-5 text-indigo-500" />}
              {folderDialogMode === 'create' ? 'Nova Pasta' : 'Renomear Pasta'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {folderDialogMode === 'create' ? 'Digite o nome da nova pasta organizacional.' : 'Digite o novo nome para esta pasta organizacional.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-1">
            <Label htmlFor="folder-name-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome da pasta</Label>
            <Input
              id="folder-name-input"
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="Ex: Financeiro, SPC, EHM..."
              className={inputCls}
              onKeyDown={(e) => e.key === 'Enter' && void handleSaveFolder()}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 border-t border-border/40 pt-3 mt-1">
            <Button variant="ghost" size="sm" onClick={() => setFolderDialogOpen(false)} className="text-xs h-8">Cancelar</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-8 px-4" onClick={() => void handleSaveFolder()}>
              {createFolderMutation.isPending || patchFolderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Mover Pasta ou Tipo Canônico */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md gap-4 p-5 bg-background border border-border rounded-xl shadow-2xl">
          <DialogHeader className="pb-1 border-b border-border/40">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Move className="w-5 h-5 text-indigo-500" />
              Mover para pasta
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Selecione a pasta de destino para: <strong className="text-foreground">{movingItem?.keyOrName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="border border-border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1 bg-muted/20 scrollbar-thin">
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition-colors border ${
                targetFolderIdForMove === null ? 'bg-indigo-500/10 text-indigo-600 font-semibold border-indigo-500/20' : 'hover:bg-muted text-foreground border-transparent'
              }`}
              onClick={() => setTargetFolderIdForMove(null)}
            >
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <span>Raiz (Sem pasta)</span>
            </button>
            {folders
              .filter((f) => movingItem?.type !== 'folder' || f.id !== movingItem.id)
              .map((f) => {
                const depth = getFolderDepth(f.id, folders);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition-colors border ${
                      targetFolderIdForMove === f.id ? 'bg-indigo-500/10 text-indigo-600 font-semibold border-indigo-500/20' : 'hover:bg-muted text-foreground border-transparent'
                    }`}
                    style={{ paddingLeft: `${12 + depth * 12}px` }}
                    onClick={() => setTargetFolderIdForMove(f.id)}
                  >
                    <Folder className="w-4 h-4 text-indigo-500" />
                    <span>{f.name}</span>
                  </button>
                );
              })}
          </div>
          
          <DialogFooter className="gap-2 border-t border-border/40 pt-3 mt-1">
            <Button variant="ghost" size="sm" onClick={() => setMoveDialogOpen(false)} className="text-xs h-8">Cancelar</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-8 px-4" onClick={() => void handleConfirmMoveItem()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IsolatedEditorDialog />
    </div>
  );
}

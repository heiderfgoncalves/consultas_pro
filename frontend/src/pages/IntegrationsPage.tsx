import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  Server, Plus, Pencil, Trash2, Database, ArrowRightLeft,
  Play, Tag, ChevronDown, ChevronRight, Search,
  Code2, Link2, Save, Zap, Hash,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import type { Provider, ProviderConsultation, ConsultationFieldType, FieldMapping } from '@/types/integrations';
import JsonFieldMapper from '@/components/integrations/JsonFieldMapper';
import { applyMappingItemFilters, getValueAtJsonPath } from '@/lib/providerResponseMapping';
import { toast } from 'sonner';
import { slugify } from '@/lib/slug';
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
  type ApiProviderTestResult,
} from '@/api/admin-integrations';

type ConsultationTestInput =
  | { kind: 'saved'; productId: string }
  | { kind: 'draft'; providerId: string; endpointPath: string; method: 'GET' | 'POST' };

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide';
const inputCls = 'h-9 text-sm bg-background placeholder:text-muted-foreground';
const selectTriggerCls = 'h-9 text-sm';
const sectionLabelCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1';
const metaMonoCls = 'text-xs font-mono text-muted-foreground';
const cardTitleCls = 'text-sm font-semibold text-foreground';
const subtleBadgeCls = 'text-xs px-2 py-0.5 rounded font-medium';
const linkActionCls = 'text-xs font-medium transition-colors flex items-center gap-1';

const emptyProvider: Partial<Provider> = {
  name: '', baseUrl: '', balanceEndpoint: '', rechargeEndpoint: '',
  authType: 'bearer', credentials: [{ key: 'token', value: '' }], status: 'active',
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
      <DialogContent className="max-w-md gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">{provider ? 'Editar Provedor' : 'Novo Provedor'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Configure o provedor de consultas</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 py-2">
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
              <Input value={form.balanceEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, balanceEndpoint: e.target.value }))} placeholder="/account/balance" className={`${inputCls} font-mono`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Endpoint Recarga</label>
              <Input value={form.rechargeEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, rechargeEndpoint: e.target.value }))} placeholder="/account/recharge" className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Autenticação</label>
            <Select value={form.authType} onValueChange={(v) => setForm((f) => ({ ...f, authType: v as Provider['authType'] }))}>
              <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Credenciais</label>
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
              className={`${linkActionCls} text-primary hover:text-primary/80`}
              onClick={() => setForm((f) => ({ ...f, credentials: [...(f.credentials || []), { key: '', value: '' }] }))}
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
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

function ConsultationEditor({
  consultation,
  providers,
  fieldTypes,
  testLog,
  onSave,
  onCancel,
  onTest,
  testing,
}: {
  consultation: ProviderConsultation;
  providers: Provider[];
  fieldTypes: ConsultationFieldType[];
  testLog: { id: string; consultationName: string; providerId: string; responseJson: string; testedAt: string }[];
  onSave: (data: Partial<ProviderConsultation>) => Promise<void>;
  onCancel: () => void;
  onTest: (input: ConsultationTestInput) => Promise<ApiProviderTestResult>;
  testing: boolean;
}) {
  const [form, setForm] = useState<Partial<ProviderConsultation>>(() => ({
    ...consultation,
    typeItemFilters: { ...(consultation.typeItemFilters ?? {}) },
  }));
  const [testJson, setTestJson] = useState(consultation.sampleResponse || '');
  const [curlInput, setCurlInput] = useState('');
  const [showLogPicker, setShowLogPicker] = useState(false);
  const [jsonCollapsed, setJsonCollapsed] = useState(!!consultation.sampleResponse);

  const isValidJson = (() => {
    try {
      JSON.parse(testJson);
      return testJson.trim().length > 2;
    } catch {
      return false;
    }
  })();

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(testJson), null, 2);
    } catch {
      return testJson;
    }
  }, [testJson]);

  const loadFromLog = (entry: (typeof testLog)[0]) => {
    setTestJson(entry.responseJson);
    setForm((f) => ({ ...f, sampleResponse: entry.responseJson }));
    setShowLogPicker(false);
    setJsonCollapsed(false);
    toast.success('JSON carregado do log');
  };

  const applyProviderResponsePayload = (payload: unknown) => {
    if (payload === undefined || payload === null) return;
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    setTestJson(str);
    setForm((f) => ({ ...f, sampleResponse: str }));
    setJsonCollapsed(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 rounded border border-dashed border-primary/20 p-3 bg-primary/5">
        <label className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Link2 className="w-4 h-4" /> cURL (auto-parse)
        </label>
        <textarea
          value={curlInput}
          onChange={(e) => {
            const val = e.target.value;
            setCurlInput(val);
            if (!val.trim().toLowerCase().startsWith('curl')) return;
            const parsed = parseCurl(val);
            if (parsed.url) {
              const mp = providers.find((p) => parsed.url.startsWith(p.baseUrl));
              const endpoint = mp ? parsed.url.replace(mp.baseUrl, '') : parsed.url;
              setForm((f) => ({
                ...f,
                method: (parsed.method === 'GET' ? 'GET' : 'POST') as 'GET' | 'POST',
                endpoint,
                ...(mp ? { providerId: mp.id } : {}),
              }));
              toast.success(`cURL parseado: ${parsed.method} ${endpoint}`);
              setCurlInput('');
            }
          }}
          className="w-full min-h-[3rem] p-2.5 rounded-md border border-border bg-background text-sm font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          placeholder="Cole um comando cURL aqui..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Provedor</label>
          <Select value={form.providerId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, providerId: v === '__none__' ? '' : v }))}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione</SelectItem>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Nome</label>
          <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Consulta Completa PF" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>External ID</label>
          <Input value={form.externalId || ''} onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))} placeholder="SOLLOS_FULL_PF" className={`${inputCls} font-mono`} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Endpoint</label>
          <Input value={form.endpoint || ''} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="/consulta/pf/completa" className={`${inputCls} font-mono`} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Custo (R$)</label>
          <Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) }))} className={inputCls} />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={form.method || 'POST'} onValueChange={(v) => setForm((f) => ({ ...f, method: v as 'GET' | 'POST' }))}>
          <SelectTrigger className="w-24 h-9 text-sm font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 h-9 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm font-mono text-muted-foreground truncate">
          {providers.find((p) => p.id === form.providerId)?.baseUrl || 'https://...'}
          {form.endpoint || '/...'}
        </div>
      </div>

      <div className="space-y-1.5 rounded border border-border p-2.5 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <span className={sectionLabelCls}>
            <Code2 className="w-4 h-4" /> JSON de Retorno
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowLogPicker(!showLogPicker)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> Log ({testLog.length})
            </button>
            {isValidJson && (
              <button type="button" onClick={() => setJsonCollapsed(!jsonCollapsed)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                {jsonCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {jsonCollapsed ? 'Expandir' : 'Colapsar'}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showLogPicker && testLog.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-0.5 max-h-28 overflow-y-auto border border-border rounded-md p-2 bg-background mb-2">
                {testLog.map((entry) => {
                  const prov = providers.find((p) => p.id === entry.providerId);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => loadFromLog(entry)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Code2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">{entry.consultationName}</span>
                        {prov && <span className="text-muted-foreground">{prov.name}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {new Date(entry.testedAt).toLocaleTimeString('pt-BR')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showLogPicker && testLog.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-1">Nenhum teste registrado.</p>
        )}

        {!jsonCollapsed && (
          <textarea
            value={testJson}
            onChange={(e) => {
              setTestJson(e.target.value);
              setForm((f) => ({ ...f, sampleResponse: e.target.value }));
            }}
            className="w-full h-40 p-3 rounded-md border border-border bg-background text-sm font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 scrollbar-thin placeholder:text-muted-foreground leading-relaxed"
            placeholder="Cole o JSON de retorno..."
          />
        )}
        {jsonCollapsed && isValidJson && (
          <p className="text-sm text-muted-foreground">JSON carregado · {formattedJson.split('\n').length} linhas</p>
        )}
      </div>

      {isValidJson && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Mapeamento</span>
          </div>
          <JsonFieldMapper
            key={consultation.id || 'new-consultation'}
            json={formattedJson}
            onJsonChange={(v) => {
              setTestJson(v);
              setForm((f) => ({ ...f, sampleResponse: v }));
            }}
            fieldTypes={fieldTypes}
            mappings={form.fieldMappings || []}
            onMappingsChange={(m) => setForm((f) => ({ ...f, fieldMappings: m }))}
            typeFilters={form.typeItemFilters ?? {}}
            onTypeFiltersChange={(next) => setForm((f) => ({ ...f, typeItemFilters: next }))}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
        <Button
          size="default"
          className="gradient-primary text-primary-foreground text-sm h-9"
          disabled={
            consultation.id
              ? false
              : !(form.providerId && (form.endpoint || '').trim())
          }
          onClick={async () => {
            try {
              let result: ApiProviderTestResult;
              if (consultation.id) {
                result = await onTest({ kind: 'saved', productId: consultation.id });
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
                });
              }
              applyProviderResponsePayload(result.response?.payload);
            } catch {
              /* toast em onError da mutation */
            }
          }}
        >
          <Play className="w-4 h-4 mr-1.5" />
          {testing ? 'Testando…' : 'Testar no provedor'}
        </Button>
        <Button
          size="default"
          className="gradient-primary text-primary-foreground text-sm h-9"
          onClick={() => {
            if (!form.name || !form.providerId || !form.endpoint) {
              toast.error('Preencha nome, provedor e endpoint');
              return;
            }
            void onSave({ ...form, sampleResponse: testJson });
          }}
        >
          <Save className="w-4 h-4 mr-1.5" /> Salvar
        </Button>
        <Button size="default" variant="ghost" onClick={onCancel} className="text-sm h-9">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function NewConsultationForm(props: Omit<Parameters<typeof ConsultationEditor>[0], 'consultation'> & { providerId?: string }) {
  const dummy: ProviderConsultation = {
    id: '',
    providerId: props.providerId || '',
    name: '',
    externalId: '',
    endpoint: '',
    method: 'POST',
    cost: 0,
    fieldMappings: [],
    typeItemFilters: {},
    status: 'active',
    sampleResponse: '',
  };
  return <ConsultationEditor consultation={dummy} {...props} />;
}

function LinkedConsultationCard({ consultation: pc, provider: prov, fieldTypeKey }: {
  consultation: ProviderConsultation;
  provider?: Provider;
  fieldTypeKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const maps = pc.fieldMappings.filter((m) => m.fieldTypeKey === fieldTypeKey);
  const filters = pc.typeItemFilters?.[fieldTypeKey];

  let jsonExcerpt = '';
  if (pc.sampleResponse && maps.length > 0) {
    try {
      const parsed = JSON.parse(pc.sampleResponse) as unknown;
      const parts = maps.map((m) => {
        let value = getValueAtJsonPath(parsed, m.jsonPath);
        value = applyMappingItemFilters(value, filters);
        return { trecho: m.jsonPath, dados: value };
      });
      jsonExcerpt = JSON.stringify(parts.length === 1 ? parts[0].dados : parts, null, 2) || '—';
    } catch {
      jsonExcerpt = '—';
    }
  }

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
        {expanded && jsonExcerpt && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2.5 border-t border-border pt-2">
              <pre className="text-sm font-mono text-foreground/80 bg-background rounded-md border border-border p-3 max-h-40 overflow-auto scrollbar-thin leading-relaxed">
                {jsonExcerpt}
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
      sortOrder: i,
    });
  }
}

export default function IntegrationsPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [providerModal, setProviderModal] = useState<{ open: boolean; provider?: Provider }>({ open: false });
  const [fieldTypeModal, setFieldTypeModal] = useState<{ open: boolean; ft?: ConsultationFieldType }>({ open: false });
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<string | null>(null);
  const [creatingConsultation, setCreatingConsultation] = useState<{ active: boolean; providerId?: string }>({ active: false });
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingFieldType, setSavingFieldType] = useState(false);

  const enabled = !!accessToken && user?.backendRole === 'PLATFORM_ADMIN';

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

  const testLog = useMemo(() => mapTestLogs(testLogsQuery.data ?? []), [testLogsQuery.data]);

  const findApiProvider = (id: string) => apiProviders.find((p) => p.id === id);
  const findConsultation = (id: string) => consultations.find((c) => c.id === id);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-test-logs'] });
  };

  const testMutation = useMutation({
    mutationFn: async (input: ConsultationTestInput) => {
      if (input.kind === 'saved') {
        return testProductApi(accessToken, input.productId, {});
      }
      return testProductDraftApi(accessToken, {
        providerId: input.providerId,
        endpointPath: input.endpointPath,
        method: input.method,
        context: {},
      });
    },
    onSuccess: () => {
      toast.success('Teste executado');
      void queryClient.invalidateQueries({ queryKey: ['admin-test-logs'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no teste'),
  });

  const handleSaveProvider = async (form: Partial<Provider>) => {
    setSavingProvider(true);
    try {
      const creds = pairsToCredentials(form.credentials || []);
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
        });
        toast.success('Tipo atualizado');
      } else {
        await createCanonicalFieldApi(accessToken, {
          pathKey: form.key!,
          label: form.label!,
          dataType: 'object',
          description: form.description,
        });
        toast.success('Tipo cadastrado');
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
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
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse === undefined ? undefined : sampleResponse,
      });
      await syncMappings(accessToken, existingId, fieldTypes, data.fieldMappings || [], prev);
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
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse ?? undefined,
      });
      await syncMappings(accessToken, created.id, fieldTypes, data.fieldMappings || [], undefined);
      toast.success('Consulta cadastrada');
    }
    invalidateAll();
    setEditingConsultation(null);
    setCreatingConsultation({ active: false });
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

  if (user?.backendRole !== 'PLATFORM_ADMIN') {
    return <Navigate to="/dashboard" replace />;
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

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="h-10 bg-muted/50 p-1 rounded-lg gap-1">
          <TabsTrigger value="providers" className="text-sm h-8 gap-2 px-4 rounded-md">
            <Server className="w-4 h-4" /> Provedores
          </TabsTrigger>
          <TabsTrigger value="consultations" className="text-sm h-8 gap-2 px-4 rounded-md">
            <Database className="w-4 h-4" /> Consultas
          </TabsTrigger>
          <TabsTrigger value="types" className="text-sm h-8 gap-2 px-4 rounded-md">
            <Tag className="w-4 h-4" /> Tipos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-2">
          <div className="flex justify-end">
            <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4" onClick={() => setProviderModal({ open: true })}>
              <Plus className="w-4 h-4 mr-1.5" /> Provedor
            </Button>
          </div>

          <div className="space-y-1.5">
            {filteredProviders.map((prov, i) => {
              const provConsults = consultations.filter((c) => c.providerId === prov.id);
              const isExpanded = expandedProvider === prov.id;

              return (
                <motion.div key={prov.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className="bg-card rounded-md border border-border overflow-hidden">
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedProvider(isExpanded ? null : prov.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${prov.status === 'active' ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                        <Server className={`w-4 h-4 ${prov.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cardTitleCls}>{prov.name}</span>
                          <span className={`${subtleBadgeCls} ${prov.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {prov.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className={`${metaMonoCls} truncate mt-0.5`}>{prov.baseUrl}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{provConsults.length}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-3 pb-3 border-t border-border pt-2.5 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Saldo</p>
                                <code className="text-sm font-mono text-foreground break-all">{prov.balanceEndpoint || '—'}</code>
                              </div>
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Recarga</p>
                                <code className="text-sm font-mono text-foreground break-all">{prov.rechargeEndpoint || '—'}</code>
                              </div>
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Auth</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm text-foreground capitalize">{prov.authType}</span>
                                  <span className="text-xs text-muted-foreground">({prov.credentials.length})</span>
                                </div>
                              </div>
                            </div>

                            {provConsults.length > 0 && (
                              <div className="space-y-1">
                                <p className={labelCls}>Consultas</p>
                                {provConsults.map((pc) => (
                                  <div key={pc.id} className="flex items-center justify-between px-2.5 py-2 rounded-md bg-background border border-border hover:border-primary/20 transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Database className="w-4 h-4 text-primary flex-shrink-0" />
                                      <span className="text-sm font-medium text-foreground truncate">{pc.name}</span>
                                      <code className="text-xs font-mono text-muted-foreground">{pc.externalId}</code>
                                    </div>
                                    <button
                                      type="button"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                                      onClick={async () => {
                                        try {
                                          await deleteProductApi(accessToken, pc.id);
                                          toast.success('Removida');
                                          invalidateAll();
                                        } catch {
                                          toast.error('Não foi possível remover');
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                              <button type="button" className={`${linkActionCls} text-primary hover:text-primary/80`} onClick={() => setCreatingConsultation({ active: true, providerId: prov.id })}>
                                <Plus className="w-3.5 h-3.5" /> Consulta
                              </button>
                              <span className="text-border hidden sm:inline">·</span>
                              <button type="button" className={`${linkActionCls} text-muted-foreground hover:text-foreground`} onClick={() => setProviderModal({ open: true, provider: prov })}>
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <span className="text-border hidden sm:inline">·</span>
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {!providersQuery.isLoading && filteredProviders.length === 0 && (
              <div className="text-center py-12">
                <Server className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum provedor encontrado</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-2">
          <div className="flex justify-end">
            <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4" onClick={() => setCreatingConsultation({ active: true })}>
              <Plus className="w-4 h-4 mr-1.5" /> Consulta
            </Button>
          </div>

          <AnimatePresence>
            {creatingConsultation.active && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <div className="bg-card rounded-md border-2 border-primary/30 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="text-base font-semibold text-foreground">Nova Consulta</span>
                  </div>
                  <NewConsultationForm
                    providers={providers}
                    fieldTypes={fieldTypes}
                    testLog={testLog}
                    providerId={creatingConsultation.providerId}
                    testing={testMutation.isPending}
                    onTest={(input) => testMutation.mutateAsync(input)}
                    onSave={async (data) => saveConsultation(data)}
                    onCancel={() => setCreatingConsultation({ active: false })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            {consultations.map((pc, i) => {
              const prov = providers.find((p) => p.id === pc.providerId);
              const isEditing = editingConsultation === pc.id;

              return (
                <motion.div key={pc.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className={`bg-card rounded-md border overflow-hidden ${isEditing ? 'border-primary/30 border-2' : 'border-border'}`}>
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setEditingConsultation(isEditing ? null : pc.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingConsultation(isEditing ? null : pc.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="w-9 h-9 rounded-md bg-primary/8 flex items-center justify-center">
                        <Database className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cardTitleCls}>{pc.name}</span>
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{pc.externalId}</code>
                          <span className={`${subtleBadgeCls} ${pc.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {pc.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground mt-1">
                          <span>{prov?.name || '—'}</span>
                          <span className="text-border">·</span>
                          <span className="font-mono text-xs">{pc.method} {pc.endpoint}</span>
                          <span className="text-border">·</span>
                          <span>R$ {pc.cost.toFixed(2)}</span>
                          <span className="text-border">·</span>
                          <span>{pc.fieldMappings.length} campos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteProductApi(accessToken, pc.id);
                              toast.success('Removida');
                              invalidateAll();
                            } catch {
                              toast.error('Não foi possível remover');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isEditing ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isEditing && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-3 pb-3 border-t border-border pt-2.5">
                            <ConsultationEditor
                              consultation={pc}
                              providers={providers}
                              fieldTypes={fieldTypes}
                              testLog={testLog}
                              testing={testMutation.isPending}
                              onTest={(input) => testMutation.mutateAsync(input)}
                              onSave={async (data) => saveConsultation(data, pc.id)}
                              onCancel={() => setEditingConsultation(null)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {consultations.length === 0 && !creatingConsultation.active && (
              <div className="text-center py-12">
                <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma consulta cadastrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-2">
          <div className="flex justify-end">
            <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4" onClick={() => setFieldTypeModal({ open: true })}>
              <Plus className="w-4 h-4 mr-1.5" /> Tipo
            </Button>
          </div>

          <div className="flex gap-3 min-h-[360px]">
            <div className="w-64 flex-shrink-0 space-y-1">
              {fieldTypes.map((ft, i) => {
                const linked = getLinkedConsultations(ft.key);
                const isSelected = selectedFieldType === ft.key;

                return (
                  <motion.div key={ft.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                    <div
                      onClick={() => setSelectedFieldType(isSelected ? null : ft.key)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedFieldType(isSelected ? null : ft.key)}
                      role="button"
                      tabIndex={0}
                      className={`rounded-md border p-2.5 cursor-pointer transition-all group ${
                        isSelected
                          ? `${ftColorClass(ft.color, 'bg')} ${ftColorClass(ft.color, 'border')} border-2`
                          : 'bg-card border-border hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${ftColorClass(ft.color, 'bg')}`}>
                            <Tag className={`w-3.5 h-3.5 ${ftColorClass(ft.color, 'text')}`} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">{ft.label}</span>
                            <code className="text-xs font-mono text-muted-foreground block mt-0.5">{ft.key}</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">{linked.length}</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                              onClick={(e) => { e.stopPropagation(); setFieldTypeModal({ open: true, ft }); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded"
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
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {ft.description && <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{ft.description}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex-1 min-w-0">
              {selectedFieldType ? (() => {
                const ft = fieldTypes.find((f) => f.key === selectedFieldType);
                const linked = getLinkedConsultations(selectedFieldType);
                if (!ft) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className={`w-5 h-5 ${ftColorClass(ft.color, 'text')}`} />
                      <span className="text-base font-semibold text-foreground">{ft.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{linked.length} consultas</span>
                    </div>

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
                            fieldTypeKey={selectedFieldType!}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex flex-col items-center justify-center h-full text-center bg-card rounded-md border border-border py-8">
                  <Tag className="w-10 h-10 text-muted-foreground/15 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione um tipo à esquerda</p>
                </div>
              )}
            </div>
          </div>
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
    </div>
  );
}

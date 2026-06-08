import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Send, FileText, Eye, AlertTriangle, Play, Edit, Star, Trash2, Copy,
  Sparkles, ShieldAlert, CheckCircle, Upload, X, Wallet, Lock, Info, StarOff, RotateCcw
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useConsultationStore, availableBlocks, type ConsultationBlock, type SavedTemplate } from '@/stores/consultationStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplatesApi,
  createTemplateApi,
  patchTemplateLayoutApi,
  deleteTemplateApi,
  favoriteTemplateApi,
  type ApiTemplate
} from '@/api/admin-integrations';
import { toast } from 'sonner';
import { migrateTemplateLayout, templateDocumentToSections } from '@/lib/templateDocument';


// Mapeador dinâmico de template do backend para o formato SavedTemplate do frontend
const mapApiTemplateToSavedTemplate = (apiTpl: ApiTemplate): SavedTemplate & {
  visibility: 'PRIVATE' | 'COMPANY' | 'GLOBAL';
  layout: any;
  logo: string | null;
  rawItems: any[];
} => {
  const blocks: ConsultationBlock[] = apiTpl.items.map((item) => {
    const existing = availableBlocks.find(
      (b) => b.id === item.providerProductId || b.name.toLowerCase() === item.providerProduct?.name?.toLowerCase()
    );
    if (existing) return existing;
    return {
      id: item.providerProductId,
      name: item.providerProduct?.name || item.alias || 'Bloco de Consulta',
      description: item.providerProduct?.description || 'Bloco de consulta dinâmico',
      price: Number(item.providerProduct?.consultationPrice ?? item.providerProduct?.cost ?? 0),
      category: item.providerProduct?.category || 'Consulta',
      icon: 'FileText',
    };
  });

  const totalPrice = blocks.reduce((sum, b) => sum + b.price, 0);
  const normalizedLayout = apiTpl.layout ? migrateTemplateLayout(apiTpl.layout) : null;

  return {
    id: apiTpl.id,
    name: apiTpl.name,
    blocks,
    totalPrice,
    isFavorite: apiTpl.isFavorite,
    createdAt: new Date(apiTpl.createdAt).toLocaleDateString('pt-BR'),
    updatedAt: new Date(apiTpl.updatedAt).toLocaleDateString('pt-BR'),
    visibility: apiTpl.visibility,
    layout: normalizedLayout,
    logo: apiTpl.logo,
    rawItems: apiTpl.items,
  };
};

// Perfis pré-definidos para simulação realista de relatórios
const SIMULATED_PROFILES = {
  clean: {
    clientName: 'JULIANO CAMPOS PEREIRA',
    document: '403.406.588-51',
    realData: {
      SCORE: { valor: 845, faixa: 'Ótimo', chancePagar: 96, probabilidadeInadimplencia: 4 },
      RESUMO_FINANCEIRO: { totalApontado: 0, totalDeduzido: 0, riscoBacenVencido: 0 },
      DIVIDAS_SPC: { registros: [] },
      DIVIDAS_SERASA: { registros: [] },
      BACEN: { consolidado: [] }
    }
  },
  restricted: {
    clientName: 'JULIANO CAMPOS PEREIRA',
    document: '403.406.588-51',
    realData: {
      SCORE: { valor: 185, faixa: 'Péssimo', chancePagar: 25, probabilidadeInadimplencia: 75 },
      RESUMO_FINANCEIRO: { totalApontado: 7430.50, totalDeduzido: 0, riscoBacenVencido: 3200.00 },
      DIVIDAS_SPC: {
        registros: [
          { credor: 'BANCO SANTANDER S.A.', contrato: '9421049-A', valor: 1450.00 },
          { credor: 'NET SERVIÇOS S.A.', contrato: '038291-C', valor: 380.50 }
        ]
      },
      DIVIDAS_SERASA: {
        registros: [
          { credor: 'FUNDO DE INVESTIMENTO ATIVOS', contrato: 'CTR-84920', valor: 5600.00 }
        ]
      },
      BACEN: {
        consolidado: [
          { credor: 'CRÉDITO PESSOAL VENCIDO', valor: 3200.00 }
        ]
      }
    }
  }
};

// Modal de Prévia Rápida de Templates
function TemplatePreviewModal({ template, open, onClose }: { template: any; open: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<'clean' | 'restricted'>('clean');
  const activeSim = SIMULATED_PROFILES[profile];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 bg-background border border-border">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Eye className="w-4 h-4 text-primary" />
            Prévia Interativa — {template.name}
          </DialogTitle>
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border mr-6">
            <Button
              size="sm"
              variant={profile === 'clean' ? 'default' : 'ghost'}
              className="h-6 text-[10px] px-2.5 rounded-md"
              onClick={() => setProfile('clean')}
            >
              <CheckCircle className="w-3 h-3 mr-1 text-success" /> Ficha Limpa
            </Button>
            <Button
              size="sm"
              variant={profile === 'restricted' ? 'default' : 'ghost'}
              className="h-6 text-[10px] px-2.5 rounded-md"
              onClick={() => setProfile('restricted')}
            >
              <ShieldAlert className="w-3 h-3 mr-1 text-destructive" /> Com Restrições
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4 bg-muted/20">
          <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
            <ConsultationPreview
              blocks={template.blocks}
              document={activeSim.document}
              clientName={activeSim.clientName}
              logo={template.logo}
              realData={activeSim.realData}
              mode="preview"
              layout={template.layout}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NewConsultationPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const { selectedBlocks, addBlock, removeBlock, clearBlocks } = useConsultationStore();

  // Estados locais da tela
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  
  // Estados do formulário de emissão
  const [document, setDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [reportLogo, setReportLogo] = useState<string | null>(null);
  const [simProfile, setSimProfile] = useState<'clean' | 'restricted' | null>(null);
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  // React Query: Buscar templates dinâmica e reativamente do backend
  const { data: apiTemplates = [], isLoading } = useQuery({
    queryKey: ['production-templates-integration'],
    queryFn: () => getTemplatesApi(accessToken),
    select: (data) => data.map(mapApiTemplateToSavedTemplate),
  });

  // Mutação para clonagem automática de templates padrão
  const cloneMutation = useMutation({
    mutationFn: async (tpl: any) => {
      const clonedItems = tpl.rawItems.map((item: any) => ({
        providerProductId: item.providerProductId,
        sortOrder: item.sortOrder,
        alias: item.alias || undefined,
      }));

      // Cria a nova versão PRIVATE do template vinculada à conta do usuário
      return createTemplateApi(accessToken, {
        name: `${tpl.name} (Personalizado)`,
        description: tpl.description || `Cópia pessoal de ${tpl.name}`,
        visibility: 'PRIVATE',
        layout: tpl.layout,
        logo: tpl.logo,
        items: clonedItems,
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
      toast.success('Template copiado para sua conta pessoal!');
      
      // Mapeia o novo template clonado e abre o editor imediatamente para ele
      const mapped = mapApiTemplateToSavedTemplate(data);
      setEditingTemplate(mapped);
      setEditorOpen(true);
      setActiveTab('custom');
    },
    onError: () => {
      toast.error('Erro ao personalizar template. Tente novamente.');
    }
  });

  // Mutação para duplicar templates existentes
  const duplicateMutation = useMutation({
    mutationFn: async (tpl: any) => {
      const clonedItems = tpl.rawItems.map((item: any) => ({
        providerProductId: item.providerProductId,
        sortOrder: item.sortOrder,
        alias: item.alias || undefined,
      }));

      return createTemplateApi(accessToken, {
        name: `${tpl.name} (Cópia)`,
        description: tpl.description || `Cópia de ${tpl.name}`,
        visibility: user?.role === 'ADMIN' ? tpl.visibility : 'PRIVATE',
        layout: tpl.layout,
        logo: tpl.logo,
        items: clonedItems,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
      toast.success('Template duplicado com sucesso!');
    },
    onError: () => {
      toast.error('Falha ao duplicar o template.');
    }
  });

  // Mutação para excluir templates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplateApi(accessToken, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
      toast.success('Template excluído permanentemente!');
      if (selectedTemplate?.id === editingTemplate?.id) {
        setSelectedTemplate(null);
        clearBlocks();
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Falha ao excluir o template.');
    }
  });

  // Mutação para favoritar templates
  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      favoriteTemplateApi(accessToken, id, isFavorite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
    },
    onError: () => {
      toast.error('Falha ao alterar estado de favorito.');
    }
  });

  // Separação de abas: Templates Padrão (GLOBAL/COMPANY) vs. Templates Personalizados (PRIVATE)
  const standardTemplates = useMemo(() => {
    return apiTemplates.filter((t) => t.visibility === 'GLOBAL' || t.visibility === 'COMPANY');
  }, [apiTemplates]);

  const customTemplates = useMemo(() => {
    return apiTemplates.filter((t) => t.visibility === 'PRIVATE');
  }, [apiTemplates]);

  // Sincroniza logo padrão do template quando um novo template é selecionado
  useEffect(() => {
    if (selectedTemplate) {
      setReportLogo(selectedTemplate.logo || null);
    }
  }, [selectedTemplate]);

  // Cálculo de finanças de emissão rápida
  const totalPrice = selectedBlocks.reduce((sum, b) => sum + b.price, 0);
  const insufficientBalance = totalPrice > (user?.balance || 0);

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  // Carrega e ativa um template na área de Emissão
  const loadTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    clearBlocks();
    tpl.blocks.forEach((b: ConsultationBlock) => addBlock(b));
    toast.success(`Template "${tpl.name}" carregado para emissão!`);
    
    // Rola suavemente até o container de Emissão se selecionado
    setTimeout(() => {
      document.getElementById('emission-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Lida com edição de template: se usuário comum e template padrão -> clona!
  const handleEditTemplate = (tpl: any) => {
    if (user?.role !== 'ADMIN' && (tpl.visibility === 'GLOBAL' || tpl.visibility === 'COMPANY')) {
      toast.info('Este é um template padrão. Criando uma cópia personalizada na sua conta...');
      cloneMutation.mutate(tpl);
    } else {
      setEditingTemplate(tpl);
      setEditorOpen(true);
    }
  };

  // Callback de salvamento do Construtor de Templates (TemplateBuilderEditor)
  const handleSaveTemplateBuilder = async (payload: any) => {
    try {
      const itemsPayload = payload.blocks.map((b: any, index: number) => ({
        providerProductId: b.id,
        sortOrder: index,
        alias: b.name
      }));

      if (editingTemplate) {
        // Modo Edição: Salvar alterações no template existente
        await patchTemplateLayoutApi(accessToken, editingTemplate.id, {
          name: payload.name,
          layout: payload.document,
          logo: payload.logo,
          items: itemsPayload,
        });
        toast.success('Template atualizado com sucesso!');
      } else {
        // Modo Criação: Novo Template
        await createTemplateApi(accessToken, {
          name: payload.name || 'Novo Template',
          visibility: user?.role === 'ADMIN' ? 'GLOBAL' : 'PRIVATE',
          layout: payload.document,
          logo: payload.logo,
          items: itemsPayload,
        });
        toast.success('Novo template criado com sucesso!');
      }

      setEditorOpen(false);
      setEditingTemplate(null);
      void queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
    } catch (error) {
      toast.error('Ocorreu um erro ao salvar o template.');
    }
  };

  // Injeção de perfil simulado na tela
  const handleSimulateProfile = (profileKey: 'clean' | 'restricted') => {
    const p = SIMULATED_PROFILES[profileKey];
    setClientName(p.clientName);
    setDocument(p.document);
    setSimProfile(profileKey);
    toast.success(`Simulador carregado: Perfil ${profileKey === 'clean' ? 'Ficha Limpa' : 'Com Restrições'}`);
  };

  const handleClearSimulation = () => {
    setClientName('');
    setDocument('');
    setSimProfile(null);
    toast.info('Campos de simulação limpos!');
  };

  // Varrer o layout estrutural do template para identificar inputs dinâmicos
  const templateFields = useMemo(() => {
    if (!selectedTemplate || !selectedTemplate.layout) return [];
    const layout = selectedTemplate.layout;
    const fieldsList: any[] = [];

    try {
      const sections = templateDocumentToSections(layout);
      sections.forEach((sec) => {
        if (sec.fields && Array.isArray(sec.fields)) {
          sec.fields.forEach((f) => {
            fieldsList.push({
              ...f,
              sectionTitle: sec.title
            });
          });
        }
      });
    } catch (error) {
      console.error('Erro ao processar campos do template:', error);
    }
    return fieldsList;
  }, [selectedTemplate]);

  // Seletor de dados simulados (realData) baseado no perfil ativo
  const currentSimulatedRealData = useMemo(() => {
    if (simProfile) {
      return SIMULATED_PROFILES[simProfile].realData;
    }
    return SIMULATED_PROFILES.clean.realData; // Fallback para manter o preview sempre populado de forma rica
  }, [simProfile]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Consulta"
        subtitle="Selecione um template canônico ou personalize seus relatórios para emissão instantânea"
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setEditorOpen(true);
            }}
            className="gradient-primary text-primary-foreground text-xs h-8 gap-1.5 shadow-glow"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Template
          </Button>
        </div>
      </PageHeader>

      {/* Abas Principais de Templates */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <TabsList className="bg-muted/50 p-0.5 rounded-xl border border-border/60">
            <TabsTrigger value="standard" className="text-xs px-4 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Templates Padrão ({standardTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-4 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Templates Personalizados ({customTemplates.length})
            </TabsTrigger>
          </TabsList>
          {selectedTemplate && (
            <div className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/50 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              Ativo para emissão: <strong className="text-foreground">{selectedTemplate.name}</strong>
            </div>
          )}
        </div>

        {/* Templates Padrão */}
        <TabsContent value="standard" className="pt-4 mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-[210px] rounded-xl border border-border bg-card animate-pulse p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                      <div className="h-2 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                  <div className="h-2 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded-lg w-full mt-4"></div>
                </div>
              ))}
            </div>
          ) : standardTemplates.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border p-8 flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="w-10 h-10 mb-2.5 text-muted-foreground/60" />
              <p className="text-sm font-medium">Nenhum template padrão cadastrado pelo administrador.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {standardTemplates.map((tpl, i) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-xl border transition-all duration-200 overflow-hidden flex flex-col group relative ${
                    selectedTemplate?.id === tpl.id
                      ? 'border-primary ring-2 ring-primary/20 shadow-glow'
                      : 'border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated'
                  }`}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          selectedTemplate?.id === tpl.id ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'
                        }`}>
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-foreground line-clamp-1">{tpl.name}</h3>
                          <p className="text-[10px] text-muted-foreground">{tpl.blocks.length} blocos inclusos</p>
                        </div>
                      </div>
                      <button
                        onClick={() => favoriteMutation.mutate({ id: tpl.id, isFavorite: !tpl.isFavorite })}
                        className="text-muted-foreground/60 hover:text-warning transition-colors"
                        title={tpl.isFavorite ? 'Remover favorito' : 'Favoritar'}
                      >
                        <Star className={`w-4 h-4 ${tpl.isFavorite ? 'text-warning fill-warning' : ''}`} />
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
                      {tpl.description || 'Template oficial para consultas de conformidade do sistema.'}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3.5">
                      {tpl.blocks.slice(0, 3).map((block: any) => (
                        <span key={block.id} className="px-2 py-0.5 text-[9px] font-medium rounded-md bg-muted text-muted-foreground border border-border/40">
                          {block.name}
                        </span>
                      ))}
                      {tpl.blocks.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-primary/10 text-primary font-bold">
                          +{tpl.blocks.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg mb-4 border border-border/20">
                      <span>Valor estimado</span>
                      <span className="font-bold text-foreground">R$ {tpl.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <Button
                        size="sm"
                        className="col-span-2 gradient-primary text-primary-foreground text-[10px] h-7 gap-1"
                        onClick={() => loadTemplate(tpl)}
                      >
                        <Play className="w-3 h-3" /> Usar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 px-1.5"
                        onClick={() => setPreviewTemplate(tpl)}
                        title="Prévia interativa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 px-1.5 hover:text-primary hover:border-primary/30"
                        onClick={() => handleEditTemplate(tpl)}
                        title="Personalizar/Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 border-t border-border/50 bg-muted/20 text-[9px] text-muted-foreground flex justify-between items-center select-none">
                    <span>GLOBAL/SISTEMA</span>
                    <span>Atualizado em {tpl.updatedAt}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Personalizados */}
        <TabsContent value="custom" className="pt-4 mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-[210px] rounded-xl border border-border bg-card animate-pulse p-4" />
              ))}
            </div>
          ) : customTemplates.length === 0 ? (
            <motion.button
              onClick={() => {
                setEditingTemplate(null);
                setEditorOpen(true);
              }}
              className="bg-card rounded-xl border-2 border-dashed border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated transition-all duration-200 p-8 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-primary group min-h-[190px] w-full"
            >
              <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">Crie o seu primeiro template personalizado</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Seus relatórios canônicos em um só lugar</p>
              </div>
            </motion.button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((tpl, i) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-xl border transition-all duration-200 overflow-hidden flex flex-col group relative ${
                    selectedTemplate?.id === tpl.id
                      ? 'border-primary ring-2 ring-primary/20 shadow-glow'
                      : 'border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated'
                  }`}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          selectedTemplate?.id === tpl.id ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'
                        }`}>
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-foreground line-clamp-1">{tpl.name}</h3>
                          <p className="text-[10px] text-muted-foreground">{tpl.blocks.length} blocos inclusos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => favoriteMutation.mutate({ id: tpl.id, isFavorite: !tpl.isFavorite })}
                          className="text-muted-foreground/60 hover:text-warning transition-colors"
                          title={tpl.isFavorite ? 'Remover favorito' : 'Favoritar'}
                        >
                          <Star className={`w-4 h-4 ${tpl.isFavorite ? 'text-warning fill-warning' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
                      {tpl.description || 'Sem descrição pessoal fornecida.'}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3.5">
                      {tpl.blocks.slice(0, 3).map((block: any) => (
                        <span key={block.id} className="px-2 py-0.5 text-[9px] font-medium rounded-md bg-muted text-muted-foreground border border-border/40">
                          {block.name}
                        </span>
                      ))}
                      {tpl.blocks.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-primary/10 text-primary font-bold">
                          +{tpl.blocks.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg mb-4 border border-border/20">
                      <span>Valor estimado</span>
                      <span className="font-bold text-foreground">R$ {tpl.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      <Button
                        size="sm"
                        className="col-span-2 gradient-primary text-primary-foreground text-[10px] h-7 gap-1"
                        onClick={() => loadTemplate(tpl)}
                      >
                        <Play className="w-3 h-3" /> Usar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 px-1"
                        onClick={() => setPreviewTemplate(tpl)}
                        title="Prévia"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 px-1 hover:text-primary"
                        onClick={() => handleEditTemplate(tpl)}
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 px-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir permanentemente este template?')) {
                            deleteMutation.mutate(tpl.id);
                          }
                        }}
                        title="Deletar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 border-t border-border/50 bg-muted/20 text-[9px] text-muted-foreground flex justify-between items-center select-none">
                    <span className="text-primary font-medium">CONTA PESSOAL</span>
                    <span>Atualizado em {tpl.updatedAt}</span>
                  </div>
                </motion.div>
              ))}

              {/* Botão rápido para adicionar no grid de personalizados */}
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditorOpen(true);
                }}
                className="bg-card rounded-xl border-2 border-dashed border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated transition-all duration-200 p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group min-h-[190px]"
              >
                <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span className="text-xs font-semibold">Novo Template</span>
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ÁREA DE EMISSÃO COM PREVIEW INTERATIVO LATERAL */}
      {selectedTemplate && (
        <motion.div
          id="emission-container"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-center justify-between select-none">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Painel de Emissão — {selectedTemplate.name}
            </h3>
            <button
              onClick={() => {
                setSelectedTemplate(null);
                clearBlocks();
              }}
              className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-md"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ResizablePanelGroup direction="horizontal" className="min-h-[500px]">
            {/* Coluna Esquerda: Formulário de Emissão */}
            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="p-4 space-y-5 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  {/* Simulador rápido de perfis */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3 h-3 text-primary" /> Simular Perfil de Teste
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={simProfile === 'clean' ? 'default' : 'outline'}
                        className="text-[10px] h-7 flex-1"
                        onClick={() => handleSimulateProfile('clean')}
                      >
                        <CheckCircle className="w-3 h-3 mr-1 text-success" /> Ficha Limpa
                      </Button>
                      <Button
                        size="sm"
                        variant={simProfile === 'restricted' ? 'default' : 'outline'}
                        className="text-[10px] h-7 flex-1"
                        onClick={() => handleSimulateProfile('restricted')}
                      >
                        <ShieldAlert className="w-3 h-3 mr-1 text-destructive" /> Com Restrições
                      </Button>
                      {simProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] h-7 px-2"
                          onClick={handleClearSimulation}
                          title="Limpar simulação"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Campo de Documento */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Documento (CPF/CNPJ)
                    </label>
                    <Input
                      placeholder="000.000.000-00"
                      value={document}
                      onChange={(e) => setDocument(formatDocument(e.target.value))}
                      className="h-8.5 text-xs rounded-lg"
                    />
                  </div>

                  {/* Campo de Nome do Cliente */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Nome Completo do Cliente
                    </label>
                    <Input
                      placeholder="Nome do cliente consultado"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-8.5 text-xs rounded-lg"
                    />
                  </div>

                  {/* Inputs dinâmicos varridos do layout do template */}
                  {templateFields.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Variáveis do Relatório ({templateFields.length})
                      </label>
                      <div className="grid grid-cols-1 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                        {templateFields.map((field: any, idx: number) => {
                          const isLocked = field.locked || field.style?.locked || field.binding?.locked;
                          return (
                            <div key={field.id || idx} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  {field.label || 'Campo Sem Nome'}
                                </span>
                                {isLocked && (
                                  <span className="text-[9px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 select-none font-medium">
                                    <Lock className="w-2.5 h-2.5" /> Bloqueado pelo Admin
                                  </span>
                                )}
                              </div>
                              <div className="relative flex items-center">
                                <Input
                                  placeholder={field.binding?.expression || 'Valor da variável'}
                                  disabled={isLocked}
                                  value={isLocked ? (field.binding?.expression || 'Bloqueado') : ''}
                                  className={`h-7.5 text-[11px] rounded-lg pr-8 ${isLocked ? 'bg-muted/40 cursor-not-allowed text-muted-foreground' : ''}`}
                                />
                                {isLocked && (
                                  <Lock className="w-3 h-3 absolute right-2.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resumo dos Blocos */}
                  <div className="space-y-1.5 pt-3 border-t border-border/50">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                      Produtos Acoplados ({selectedBlocks.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                      {selectedBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex items-center gap-1.5 text-[10px] bg-muted px-2.5 py-1 rounded-md border border-border/40 text-foreground"
                        >
                          <span>{block.name}</span>
                          <span className="text-primary font-semibold">R$ {block.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subtotal, Saldo e Botão de Envio */}
                <div className="border-t border-border pt-4 space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Valor Estimado:</span>
                    <span className="text-base font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground" /> Saldo em Conta:
                    </span>
                    <span className="font-semibold text-success">
                      R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {insufficientBalance && (
                    <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 select-none">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <span>Saldo insuficiente para emitir esta consulta. Faça uma recarga para continuar.</span>
                    </div>
                  )}

                  <Button
                    className="w-full h-9.5 text-xs font-semibold gap-2 shadow-glow gradient-primary text-primary-foreground rounded-lg"
                    disabled={selectedBlocks.length === 0 || insufficientBalance || !document}
                  >
                    <Send className="w-4 h-4" /> Emitir Consulta Oficial
                  </Button>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Coluna Direita: Preview do Relatório Interativo */}
            <ResizablePanel defaultSize={55} minSize={35}>
              <div className="h-full flex flex-col bg-muted/10 border-l border-border/50">
                <div className="px-4 py-2 border-b border-border/80 bg-muted/20 flex items-center justify-between select-none">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Prévia em Tempo Real
                  </span>
                  {/* Upload de Logotipo para Homologação */}
                  <div className="flex items-center">
                    {reportLogo ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-card shadow-xs">
                        <img src={reportLogo} alt="Logo" className="h-4 max-w-[60px] object-contain" />
                        <button
                          onClick={() => setReportLogo(null)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover logotipo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-dashed border-border/80 hover:border-primary/50 cursor-pointer transition-colors text-[10px] text-muted-foreground hover:text-primary bg-card/50">
                        <Upload className="w-3 h-3" />
                        <span>Carregar Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setReportLogo(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                  <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden bg-white/5 backdrop-blur-md">
                    <ConsultationPreview
                      blocks={selectedBlocks}
                      document={document || '000.000.000-00'}
                      clientName={clientName || 'JULIANO CAMPOS PEREIRA'}
                      logo={reportLogo}
                      realData={currentSimulatedRealData}
                      mode="preview"
                      layout={selectedTemplate?.layout}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </motion.div>
      )}

      {/* Editor Modal do Construtor de Templates */}
      {editorOpen && (
        <TemplateBuilderEditor
          open={editorOpen}
          builderMode={user?.role === 'ADMIN' ? 'admin' : 'user'}
          onClose={() => {
            setEditorOpen(false);
            setEditingTemplate(null);
          }}
          initialBlocks={editingTemplate?.blocks}
          templateName={editingTemplate?.name}
          initialSections={
            editingTemplate?.layout
              ? templateDocumentToSections(editingTemplate.layout)
              : undefined
          }
          initialLogo={editingTemplate?.logo}
          accessToken={accessToken}
          onSave={handleSaveTemplateBuilder}
        />
      )}

      {/* Modal de Prévia Interativa de Templates */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Send, FileText, Eye, AlertTriangle, Play, Edit, Star, Trash2, Copy,
  Sparkles, ShieldAlert, CheckCircle, Upload, X, Wallet, Lock, Info, StarOff, RotateCcw,
  Clock, RefreshCw, Building2, User2, ChevronDown, Coins
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
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
  userId?: string | null;
  companyId?: string | null;
  user?: any;
  company?: any;
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
    userId: apiTpl.userId,
    companyId: apiTpl.companyId,
    user: apiTpl.user,
    company: apiTpl.company,
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

// Modal de Carregamento Premium da Consulta Real
function ConsultationLoadingModal({
  open,
  status,
  message,
  onClose
}: {
  open: boolean;
  status: 'queued' | 'processing' | 'completed' | 'error';
  message: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && (status === 'completed' || status === 'error')) onClose(); }}>
      <DialogContent showClose={false} className="max-w-md p-6 bg-card text-foreground border border-border rounded-2xl shadow-2xl flex flex-col items-center text-center">
        <DialogHeader className="w-full flex flex-col items-center">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            Análise em Tempo Real
          </DialogTitle>
          <div className="sr-only">Aguardando processamento do relatório de consulta de crédito</div>
        </DialogHeader>
        
        <div className="my-8 relative flex items-center justify-center">
          {/* Círculo externo animado com gradiente */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-indigo-500/20 animate-ping" />
          
          <div className="absolute w-20 h-20 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin" />
          
          <div className="relative w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center">
            {status === 'queued' && <Clock className="w-8 h-8 text-indigo-400 animate-pulse" />}
            {status === 'processing' && <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />}
            {status === 'completed' && <CheckCircle className="w-8 h-8 text-emerald-400 scale-110 transition-transform duration-300" />}
            {status === 'error' && <AlertTriangle className="w-8 h-8 text-rose-500 animate-bounce" />}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold tracking-wide uppercase text-indigo-300">
            {status === 'queued' && 'Na Fila de Execução'}
            {status === 'processing' && 'Acessando Provedores'}
            {status === 'completed' && 'Relatório Gerado!'}
            {status === 'error' && 'Erro no Processamento'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Barra de progresso fofa */}
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-6 border border-border">
          <motion.div 
            className={`h-full ${status === 'completed' ? 'bg-emerald-500' : status === 'error' ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
            initial={{ width: '5%' }}
            animate={{ 
              width: status === 'completed' ? '100%' : status === 'error' ? '100%' : status === 'processing' ? '70%' : '20%' 
            }}
            transition={{ duration: 1 }}
          />
        </div>
        
        {(status === 'completed' || status === 'error') && (
          <Button 
            onClick={onClose} 
            className={`w-full mt-6 text-xs h-9 font-medium ${status === 'completed' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
          >
            {status === 'completed' ? 'Ver Relatório Completo' : 'Fechar'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Modal de Prévia Rápida de Templates
function TemplatePreviewModal({ 
  template, 
  open, 
  onClose,
  customRealData,
  customDocument,
  customClientName,
  isRealConsultation = false,
  isAdmin = false,
  onEditTemplate,
  consultationId
}: { 
  template: any; 
  open: boolean; 
  onClose: () => void;
  customRealData?: any;
  customDocument?: string;
  customClientName?: string;
  isRealConsultation?: boolean;
  isAdmin?: boolean;
  onEditTemplate?: (tpl: any) => void;
  consultationId?: string;
}) {
  const [profile, setProfile] = useState<'clean' | 'restricted'>('clean');
  const activeSim = SIMULATED_PROFILES[profile];

  const hasRealData = !!customRealData;
  const hasAdminData = !hasRealData && !!template.layout?.metadata?.lastAdminData;
  
  const realDataToUse = hasRealData 
    ? customRealData 
    : (hasAdminData ? template.layout.metadata.lastAdminData : activeSim.realData);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[64vw] w-[64vw] h-[86vh] max-h-[86vh] overflow-hidden p-0 bg-background border border-border flex flex-col">
        <DialogHeader className="px-4 py-2 border-b border-border flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Eye className="w-3.5 h-3.5 text-primary" />
            {isRealConsultation ? 'Relatório Real' : 'Prévia'} — {template.name}
          </DialogTitle>
          <div className="sr-only">
            Visualização prévia do template selecionado
          </div>
          <div className="flex items-center gap-2 mr-6">
            {isAdmin && onEditTemplate && (
              <Button
                size="sm"
                variant="outline"
                className="text-[9px] h-6 px-2.5 gap-1 hover:text-primary hover:border-primary/30"
                onClick={() => {
                  onClose();
                  onEditTemplate(template);
                }}
                title="Editar este template no editor"
              >
                <Edit className="w-3.5 h-3.5" /> Editar Template
              </Button>
            )}

            {isRealConsultation ? (
              <div className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 select-none animate-pulse">
                <Sparkles className="size-2.5 text-emerald-400" />
                Consulta Realizada (API Oficial)
              </div>
            ) : hasAdminData ? (
              <div className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 select-none animate-pulse">
                <Sparkles className="size-2.5 text-indigo-400" />
                Dados do Administrador
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                <Button
                  size="sm"
                  variant={profile === 'clean' ? 'default' : 'ghost'}
                  className="h-5 text-[9px] px-2 rounded-md"
                  onClick={() => setProfile('clean')}
                >
                  <CheckCircle className="w-2.5 h-2.5 mr-1 text-success" /> Ficha Limpa
                </Button>
                <Button
                  size="sm"
                  variant={profile === 'restricted' ? 'default' : 'ghost'}
                  className="h-5 text-[9px] px-2 rounded-md"
                  onClick={() => setProfile('restricted')}
                >
                  <ShieldAlert className="w-2.5 h-2.5 mr-1 text-destructive" /> Com Restrições
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-0 bg-background flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="overflow-hidden flex-1 flex flex-col min-h-0">
            <ConsultationPreview
              blocks={template.blocks}
              rawItems={template.rawItems}
              document={hasRealData ? (customDocument || "") : (hasAdminData ? "" : activeSim.document)}
              clientName={hasRealData ? (customClientName || "") : (hasAdminData ? "" : activeSim.clientName)}
              logo={template.logo}
              realData={realDataToUse}
              mode="preview"
              layout={template.layout}
              consultationId={consultationId}
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
  const navigate = useNavigate();
  const { selectedBlocks, addBlock, removeBlock, clearBlocks } = useConsultationStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para o fluxo de emissão real de consulta com polling
  const [pollingActive, setPollingActive] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'queued' | 'processing' | 'completed' | 'error'>('queued');
  const [pollingMessage, setPollingMessage] = useState('Enviando solicitação...');
  const [realConsultationData, setRealConsultationData] = useState<any | null>(null);
  const [realDocument, setRealDocument] = useState('');
  const [realClientName, setRealClientName] = useState('');
  const [showRealPreview, setShowRealPreview] = useState(false);
  const [selectedTemplateForRealPreview, setSelectedTemplateForRealPreview] = useState<any | null>(null);
  const [realConsultationId, setRealConsultationId] = useState<string | null>(null);

  // Executa uma consulta real e monitora o progresso via polling
  const handleExecuteRealConsultation = async (tpl: any) => {
    if (!document) {
      toast.error('Informe um CPF ou CNPJ válido para esta consulta.');
      return;
    }

    setPollingActive(true);
    setPollingStatus('queued');
    setPollingMessage('Sua consulta foi recebida e está entrando na fila de execução do servidor...');
    setSelectedTemplateForRealPreview(tpl);

    let consultationId = '';

    try {
      const providerProductIds = tpl.blocks
        .filter((b: any) => b.category !== 'Consulta Customizada')
        .map((b: any) => b.id);

      const cleanedDoc = document.replace(/\D/g, '');
      const subjectType = cleanedDoc.length === 14 ? 'CNPJ' : 'CPF';

      // 1. POST /consultations para iniciar a consulta
      const result = await apiRequest<any>('/consultations', {
        method: 'POST',
        body: JSON.stringify({
          subjectDocument: cleanedDoc,
          subjectType,
          templateId: tpl.id,
          providerProductIds: providerProductIds.length > 0 ? providerProductIds : undefined,
          externalUserId: user?.id,
        })
      });

      if (!result || !result.id) {
        throw new Error('Retorno inválido do servidor ao criar consulta.');
      }

      consultationId = result.id;
      setRealConsultationId(result.id);
      setPollingStatus('processing');
      setPollingMessage('Solicitação enviada. Acionando canais de dados parceiros e reunindo as informações oficiais...');

      // 2. Polling loop para aguardar a conclusão
      let attempts = 0;
      const maxAttempts = 30; // 30 tentativas = ~1 minuto limite
      const intervalMs = 2000; // 2 segundos entre checagens

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setPollingStatus('error');
          setPollingMessage('O tempo limite de processamento foi excedido. Verifique o histórico mais tarde.');
          toast.error('Tempo de espera excedido para a análise em lote.');
          return;
        }

        try {
          const check = await apiRequest<any>(`/consultations/${consultationId}`);
          
          if (check.status === 'COMPLETED') {
            const dataPayload = check.renderPayload || check.mergedPayload || {};
            setRealConsultationData(dataPayload);
            setRealDocument(document);
            setRealClientName(clientName || dataPayload.cliente?.nome || dataPayload.clientName || 'CLIENTE ANALISADO');
            setPollingStatus('completed');
            setPollingMessage('Todas as conexões retornaram com sucesso! Relatório compilado com dados oficiais da API.');
            toast.success('Análise oficial concluída com sucesso!');
          } else if (check.status === 'ERROR' || check.status === 'FAILED') {
            setPollingStatus('error');
            setPollingMessage(check.errorMessage || 'Falha ao processar dados com um dos provedores parceiros.');
            toast.error('Erro no processamento da consulta.');
          } else {
            // Continua processando ou em fila
            attempts++;
            if (check.status === 'PROCESSING') {
              setPollingMessage(`Processando resposta dos provedores de dados oficiais (tentativa ${attempts})...`);
            }
            setTimeout(poll, intervalMs);
          }
        } catch (pollErr: any) {
          console.error('Erro no polling da consulta:', pollErr);
          attempts++;
          setTimeout(poll, intervalMs);
        }
      };

      // Inicia polling após o primeiro intervalo
      setTimeout(poll, intervalMs);

    } catch (err: any) {
      console.error('Erro ao emitir consulta para prévia:', err);
      setPollingStatus('error');
      setPollingMessage(err.message || 'Houve uma falha interna ao contatar o servidor de dados.');
      toast.error('Ocorreu um erro ao emitir a consulta.');
    }
  };

  const handleEmitConsultation = async () => {
    if (!document || selectedBlocks.length === 0) return;
    
    // Como a emissão também fará polling real para abrir o preview, utilizamos o handleExecuteRealConsultation
    // Criamos um template virtual correspondente
    const tpl = selectedTemplate || {
      id: undefined,
      name: 'Relatório Customizado',
      blocks: selectedBlocks,
      logo: reportLogo,
      rawItems: [],
      layout: null
    };

    setIsSubmitting(true);
    try {
      // Disparamos o fluxo real com polling
      await handleExecuteRealConsultation(tpl);
      
      // Limpamos o formulário
      setDocument('');
      setClientName('');
      clearBlocks();
      setSelectedTemplate(null);
    } catch (err) {
      // tratador de erro secundário
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const isAdmin = user?.backendRole === 'PLATFORM_ADMIN' && user?.accessLevel === 0;
  const [activeTab, setActiveTab] = useState<'standard' | 'custom' | 'templates' | 'accounts'>('templates');

  // Força o ajuste do activeTab se o usuário carregar ou se seu cargo mudar
  useEffect(() => {
    if (user) {
      setActiveTab('templates');
    }
  }, [user]);

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
        visibility: user?.backendRole === 'PLATFORM_ADMIN' ? tpl.visibility : 'PRIVATE',
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
    return apiTemplates.filter((t) => {
      const isGlobalOrCompany = t.visibility === 'GLOBAL' || t.visibility === 'COMPANY';
      if (!isGlobalOrCompany) return false;
      
      // Se for admin mestre, não mostra templates padrão criados por outros parceiros/contas aqui
      if (isAdmin) {
        const isCreatedByPartner = t.userId && t.user?.role !== 'PLATFORM_ADMIN';
        return !isCreatedByPartner;
      }
      return true;
    });
  }, [apiTemplates, isAdmin]);

  const customTemplates = useMemo(() => {
    return apiTemplates.filter((t) => {
      const isPrivate = t.visibility === 'PRIVATE';
      if (!isPrivate) return false;
      
      // Se for admin mestre, não mostra templates privados criados por parceiros/contas aqui
      if (isAdmin) {
        const isCreatedByPartner = t.userId && t.user?.role !== 'PLATFORM_ADMIN';
        return !isCreatedByPartner;
      }
      return true;
    });
  }, [apiTemplates, isAdmin]);

  // Nova lista: Templates criados por outras contas (parceiros, empresas, etc.)
  const accountTemplates = useMemo(() => {
    if (!isAdmin) return [];
    return apiTemplates.filter((t) => {
      const isCreatedByPartner = t.userId && t.user?.role !== 'PLATFORM_ADMIN';
      return isCreatedByPartner;
    });
  }, [apiTemplates, isAdmin]);

  // Agrupa os templates por conta/empresa para exibição organizada
  const groupedTemplatesByAccount = useMemo(() => {
    const groups: { [key: string]: { name: string; type: 'company' | 'user'; email?: string; templates: typeof apiTemplates } } = {};
    
    accountTemplates.forEach((t) => {
      let groupKey = 'Sem Empresa';
      let groupName = 'Sem Empresa';
      let groupType: 'company' | 'user' = 'user';
      let groupEmail = '';
      
      if (t.company) {
        groupKey = `company-${t.company.id}`;
        groupName = t.company.name;
        groupType = 'company';
      } else if (t.user) {
        groupKey = `user-${t.user.id}`;
        groupName = t.user.fullName || t.user.email || 'Usuário Sem Nome';
        groupType = 'user';
        groupEmail = t.user.email;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          type: groupType,
          email: groupEmail,
          templates: [],
        };
      }
      groups[groupKey].templates.push(t);
    });
    
    return Object.values(groups);
  }, [accountTemplates]);

  // Filtra templates permitidos para o usuário comum de acordo com metadata.visibleRoles
  const userTemplates = useMemo(() => {
    return apiTemplates.filter((t) => {
      // Se for o administrador no acesso real de admin, ele vê todos os templates
      if (user?.backendRole === 'PLATFORM_ADMIN' && user?.accessLevel === 0) return true;
      
      // Determinamos a role efetiva (real ou simulada)
      const effectiveRole = user?.backendRole === 'PLATFORM_ADMIN'
        ? (user.accessLevel === 1 ? 'COMPANY_OWNER' : 'USER')
        : user?.backendRole;
        
      const visibleRoles = t.layout?.metadata?.visibleRoles;
      if (!visibleRoles || !Array.isArray(visibleRoles)) {
        // Se não houver visibleRoles configurado, fica visível por padrão
        return true;
      }
      
      if (effectiveRole === 'COMPANY_OWNER' || effectiveRole === 'COMPANY_MANAGER') {
        return visibleRoles.includes('COMPANY_OWNER') || visibleRoles.includes('COMPANY_MANAGER');
      }
      return visibleRoles.includes(effectiveRole || '');
    });
  }, [apiTemplates, user]);

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
      window.document.getElementById('emission-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Lida com edição de template: se usuário comum e template padrão -> clona!
  const handleEditTemplate = (tpl: any) => {
    if (user?.backendRole !== 'PLATFORM_ADMIN' && (tpl.visibility === 'GLOBAL' || tpl.visibility === 'COMPANY')) {
      toast.info('Este é um template padrão. Criando uma cópia personalizada na sua conta...');
      cloneMutation.mutate(tpl);
    } else {
      if (isAdmin) {
        try {
          const existingSessionStr = localStorage.getItem('report-drawer:session');
          let sessionObj: any = { state: {}, version: 0 };
          if (existingSessionStr) {
            try {
              sessionObj = JSON.parse(existingSessionStr);
            } catch (e) {}
          }
          
          sessionObj.state = {
            ...sessionObj.state,
            activeTemplateId: tpl.id,
            template: tpl.layout || {
              id: tpl.id,
              name: tpl.name,
              version: 1,
              canvas: { background: "#e2e8f0", grid: 8 },
              frames: [],
              elements: []
            },
            dirty: false,
            hasSyncedFromServer: false
          };
          
          localStorage.setItem('report-drawer:session', JSON.stringify(sessionObj));
          toast.success(`Carregando "${tpl.name}" no Editor Moderno...`);
        } catch (err) {
          console.error("Erro ao setar sessão do editor no localStorage:", err);
        }
        navigate('/admin/templates-drawer');
      } else {
        setEditingTemplate(tpl);
        setEditorOpen(true);
      }
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
          visibility: user?.backendRole === 'PLATFORM_ADMIN' ? 'GLOBAL' : 'PRIVATE',
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
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setEditorOpen(true);
              }}
              className="gradient-primary text-primary-foreground text-xs h-8 gap-1.5 shadow-glow"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Template
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Emissão rápida (Restaurado do backup v1) */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-xs font-semibold text-foreground mb-3">Emissão Rápida</h3>
        <div className="flex items-end gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documento (CPF/CNPJ)</label>
            <Input 
              placeholder="000.000.000-00" 
              value={document} 
              onChange={(e) => setDocument(formatDocument(e.target.value))} 
              className="h-8 text-xs" 
            />
          </div>
          {templateFields.length > 0 && (
             <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome Completo</label>
              <Input 
                placeholder="Nome do cliente" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                className="h-8 text-xs" 
              />
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {selectedBlocks.length > 0 && (
              <div className="flex items-center gap-2 text-xs mr-2">
                <span className="text-muted-foreground">{selectedBlocks.length} blocos</span>
                <span className="font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                {insufficientBalance && <span className="text-destructive text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Saldo insuficiente</span>}
              </div>
            )}
            <Button 
              className="gradient-primary text-primary-foreground h-8 text-xs gap-1.5 shadow-glow" 
              disabled={selectedBlocks.length === 0 || insufficientBalance || !document || isSubmitting}
              onClick={handleEmitConsultation}
            >
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? 'Emitindo...' : 'Emitir Consulta'}
            </Button>
          </div>
        </div>
        {selectedTemplate && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
             <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
               Ativo: <strong className="text-foreground">{selectedTemplate.name}</strong>
             </div>
             <button onClick={() => { setSelectedTemplate(null); clearBlocks(); }} className="text-destructive hover:underline">
               Limpar seleção
             </button>
          </div>
        )}
      </div>

      {/* Tabs and Template Cards */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-4 h-auto flex flex-wrap sm:inline-flex rounded-xl">
          {isAdmin ? (
            <>
              <TabsTrigger value="templates" className="text-xs px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Templates ({userTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="standard" className="text-xs px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Templates Padrão ({standardTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Templates Personalizados ({customTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Templates por Conta ({accountTemplates.length})
              </TabsTrigger>
            </>
          ) : (
            <TabsTrigger value="templates" className="text-xs px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              Templates ({userTemplates.length})
            </TabsTrigger>
          )}
        </TabsList>

        {(isAdmin ? ['templates', 'standard', 'custom'] : ['templates']).map((tabKey) => {
          const tabTemplates = tabKey === 'standard' 
            ? standardTemplates 
            : tabKey === 'custom' 
              ? customTemplates 
              : userTemplates;
          return (
            <TabsContent key={tabKey} value={tabKey} className="mt-0">
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tabTemplates.map((tpl, i) => (
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
                      <div className="p-4 flex-1 flex flex-col">
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
                          {tpl.description || 'Sem descrição pessoal fornecida.'}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-auto pb-3">
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

                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="flex-1 gradient-primary text-primary-foreground text-[10px] h-7 gap-1"
                            onClick={() => loadTemplate(tpl)}
                          >
                            <Play className="w-3 h-3" /> Usar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2"
                            onClick={() => {
                              if (tabKey === 'templates' && document) {
                                handleExecuteRealConsultation(tpl);
                              } else {
                                setPreviewTemplate(tpl);
                              }
                            }}
                            title={tabKey === 'templates' && document ? "Executar consulta oficial em tempo real" : "Prévia interativa"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {isAdmin && tabKey !== 'templates' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2 hover:text-primary hover:border-primary/30"
                              onClick={() => handleEditTemplate(tpl)}
                              title="Personalizar/Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdmin && (tpl.visibility === 'PRIVATE' || user?.backendRole === 'PLATFORM_ADMIN') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2 hover:text-destructive hover:border-destructive/30 text-destructive/70"
                              onClick={() => deleteMutation.mutate(tpl.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-1.5 border-t border-border/50 bg-muted/20 text-[9px] text-muted-foreground flex justify-between items-center select-none mt-auto">
                        <span className="font-medium text-primary/80 uppercase">{tpl.visibility === 'PRIVATE' ? 'CONTA PESSOAL' : 'GLOBAL/SISTEMA'}</span>
                        <span>Atualizado em {tpl.updatedAt || 'Recente'}</span>
                      </div>
                    </motion.div>
                  ))}
                  {isAdmin && tabKey === 'custom' && (
                    <motion.button
                      onClick={() => {
                        setEditingTemplate(null);
                        setEditorOpen(true);
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-card rounded-xl border-2 border-dashed border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated transition-all duration-200 p-8 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-primary group min-h-[190px] w-full"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold">Novo Template</span>
                    </motion.button>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}

        {isAdmin && (
          <TabsContent value="accounts" className="mt-0">
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
            ) : groupedTemplatesByAccount.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
                <p className="text-muted-foreground text-sm">Nenhum template criado por parceiros ou clientes ainda.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTemplatesByAccount.map((group, groupIdx) => (
                  <AccountTemplatesGroupSection
                    key={groupIdx}
                    group={group}
                    selectedTemplate={selectedTemplate}
                    onLoadTemplate={loadTemplate}
                    onEditTemplate={(tpl) => {
                      setEditingTemplate(tpl);
                      setEditorOpen(true);
                    }}
                    onDuplicateTemplate={(tpl) => duplicateMutation.mutate(tpl)}
                    onDeleteTemplate={(id) => deleteMutation.mutate(id)}
                    onFavoriteTemplate={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
                    isDeleting={deleteMutation.isPending}
                    isFavoriting={favoriteMutation.isPending}
                    isDuplicating={duplicateMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Editor Modal do Construtor de Templates */}
      {editorOpen && (
        <TemplateBuilderEditor
          open={editorOpen}
          builderMode={user?.backendRole === 'PLATFORM_ADMIN' ? 'admin' : 'user'}
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
          isAdmin={activeTab !== 'templates' && isAdmin}
          onEditTemplate={handleEditTemplate}
        />
      )}

      {showRealPreview && selectedTemplateForRealPreview && (
        <TemplatePreviewModal
          template={selectedTemplateForRealPreview}
          open={showRealPreview}
          onClose={() => {
            setShowRealPreview(false);
            setSelectedTemplateForRealPreview(null);
            setRealConsultationData(null);
            setRealConsultationId(null);
          }}
          customRealData={realConsultationData}
          customDocument={realDocument}
          customClientName={realClientName}
          isRealConsultation={true}
          isAdmin={false}
          onEditTemplate={handleEditTemplate}
          consultationId={realConsultationId || undefined}
        />
      )}

      <ConsultationLoadingModal
        open={pollingActive}
        status={pollingStatus}
        message={pollingMessage}
        onClose={() => {
          setPollingActive(false);
          if (pollingStatus === 'completed') {
            setShowRealPreview(true);
          }
        }}
      />
    </div>
  );
}

interface AccountTemplatesGroupProps {
  group: {
    name: string;
    type: 'company' | 'user';
    email?: string;
    templates: any[];
  };
  selectedTemplate: any;
  onLoadTemplate: (tpl: any) => void;
  onEditTemplate: (tpl: any) => void;
  onDuplicateTemplate: (tpl: any) => void;
  onDeleteTemplate: (id: string) => void;
  onFavoriteTemplate: (id: string, isFav: boolean) => void;
  isDeleting: boolean;
  isFavoriting: boolean;
  isDuplicating: boolean;
}

function AccountTemplatesGroupSection({
  group,
  selectedTemplate,
  onLoadTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onFavoriteTemplate,
  isDeleting,
  isFavoriting,
  isDuplicating,
}: AccountTemplatesGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-border/80 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left border-b border-border/50"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            group.type === 'company' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'
          }`}>
            {group.type === 'company' ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <User2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {group.name}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                group.type === 'company' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {group.type === 'company' ? 'Empresa' : 'Parceiro'}
              </span>
            </h3>
            {group.email && (
              <p className="text-xs text-muted-foreground mt-0.5">{group.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs bg-muted px-2 py-1 rounded-md text-foreground/80 font-mono">
            {group.templates.length} {group.templates.length === 1 ? 'template' : 'templates'}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-card/10">
              {group.templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`bg-card rounded-xl border transition-all duration-200 overflow-hidden flex flex-col group relative ${
                    selectedTemplate?.id === tpl.id
                      ? 'border-primary ring-2 ring-primary/20 shadow-glow'
                      : 'border-border/80 hover:border-primary/40 shadow-card hover:shadow-elevated'
                  }`}
                >
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {tpl.name}
                          </h4>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            Modificado em {tpl.updatedAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onFavoriteTemplate(tpl.id, !tpl.isFavorite)}
                          disabled={isFavoriting}
                          className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${
                            tpl.isFavorite ? 'text-warning' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => onDuplicateTemplate(tpl)}
                          disabled={isDuplicating}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Duplicar template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditTemplate(tpl)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar template"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTemplate(tpl.id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg hover:bg-muted text-destructive hover:text-destructive transition-colors"
                          title="Excluir template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {tpl.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                        {tpl.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-500" />
                        Custo: <strong className="text-foreground">R$ {tpl.totalPrice.toFixed(2)}</strong>
                      </span>
                      <span className="bg-muted px-2 py-0.5 rounded-full font-mono text-[9px] uppercase">
                        {tpl.blocks.length} blocos
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-8 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      onClick={() => onLoadTemplate(tpl)}
                    >
                      Carregar Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

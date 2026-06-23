import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Sparkles, 
  Users, 
  Shield, 
  Zap, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  MessageSquare, 
  Check, 
  X, 
  Loader2, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  userLimit: number;
  extraUserPrice: string;
  extraUserBlock: number;
  allowWhiteLabel: boolean;
  isActive: boolean;
  description: string;
}

interface SubscriptionRow {
  id: string;
  status: string;
  price: string;
  userLimit: number;
  extraUserPrice: string;
  extraUserBlock: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  plan: {
    name: string;
    slug: string;
  };
  company?: {
    id: string;
    name: string;
    document: string;
  } | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  activeUsersCount: number;
  extraUsersCost: number;
  totalExpectedBill: number;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  message?: string | null;
  createdAt: string;
}

interface AdminPlansTabProps {
  accessToken: string | null;
}

export function AdminPlansTab({ accessToken }: AdminPlansTabProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'plans' | 'subscriptions' | 'leads'>('plans');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields for plan editing
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editUserLimit, setEditUserLimit] = useState(0);
  const [editExtraUserPrice, setEditExtraUserPrice] = useState(0);
  const [editExtraUserBlock, setEditExtraUserBlock] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [plansData, subsData, leadsData] = await Promise.all([
        apiRequest<Plan[]>('/admin/plans'),
        apiRequest<any[]>('/admin/subscriptions'),
        apiRequest<any[]>('/admin/plans/leads'),
      ]);

      setPlans(plansData || []);
      setSubscriptions(subsData || []);
      setLeads(leadsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados administrativos de planos:', error);
      toast.error('Erro ao carregar dados de planos e faturamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPrice(Number(plan.price));
    setEditUserLimit(plan.userLimit);
    setEditExtraUserPrice(Number(plan.extraUserPrice));
    setEditExtraUserBlock(plan.extraUserBlock);
    setEditDescription(plan.description);
    setEditIsActive(plan.isActive);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setUpdating(true);
    try {
      await apiRequest<any>(`/admin/plans/${editingPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          price: editPrice,
          userLimit: editUserLimit,
          extraUserPrice: editExtraUserPrice,
          extraUserBlock: editExtraUserBlock,
          description: editDescription,
          isActive: editIsActive,
        }),
      });

      toast.success('Plano atualizado com sucesso!');
      setEditingPlan(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar plano:', error);
      toast.error(error.message || 'Erro ao atualizar plano');
    } finally {
      setUpdating(false);
    }
  };

  // Filtros de pesquisa para Assinaturas e Leads
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (sub.company?.name ?? '').toLowerCase().includes(q) ||
      (sub.user?.fullName ?? '').toLowerCase().includes(q) ||
      (sub.user?.email ?? '').toLowerCase().includes(q) ||
      sub.plan.name.toLowerCase().includes(q)
    );
  });

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.companyName ?? '').toLowerCase().includes(q)
    );
  });

  // KPI calculations
  const totalMonthlyEarning = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.totalExpectedBill, 0);

  const activeSubscriptionsCount = subscriptions.filter(s => s.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Sincronizando faturamentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4 relative overflow-hidden"
        >
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Faturamento Recorrente Mensal (MRR)</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              R$ {totalMonthlyEarning.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4"
        >
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assinaturas Ativas</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{activeSubscriptionsCount} Assinantes</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4"
        >
          <div className="p-3.5 bg-pink-500/10 text-pink-500 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Leads Parceiro (Enterprise)</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{leads.length} Contatos</p>
          </div>
        </motion.div>
      </div>

      {/* Tab Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-3">
        <div className="flex gap-2 p-1 bg-muted/30 border border-border/80 rounded-xl">
          <button
            onClick={() => { setSubTab('plans'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              subTab === 'plans' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Planos e Preços
          </button>
          <button
            onClick={() => { setSubTab('subscriptions'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              subTab === 'subscriptions' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Assinaturas Vigentes
          </button>
          <button
            onClick={() => { setSubTab('leads'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              subTab === 'leads' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Leads Comerciais
          </button>
        </div>

        {/* Search input (Hidden on plans tab) */}
        {subTab !== 'plans' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={subTab === 'subscriptions' ? 'Filtrar faturamentos...' : 'Buscar leads...'}
              className="pl-9 h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* Render subtabs */}
      <AnimatePresence mode="wait">
        
        {/* SUBTAB 1: PLANS */}
        {subTab === 'plans' && (
          <motion.div 
            key="plans"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className="bg-card border border-border/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden"
              >
                {!plan.isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Inativo</Badge>
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-1">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono mb-4">/{plan.slug}</p>
                  
                  <div className="flex items-baseline gap-0.5 mb-4">
                    <span className="text-2xl font-extrabold text-foreground">
                      R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">/mês</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-6 bg-muted/10 p-3 rounded-xl border border-border/40">
                    {plan.description}
                  </p>

                  <div className="space-y-2 text-xs border-t border-border/60 pt-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limite de Usuários:</span>
                      <span className="font-semibold text-foreground">{plan.userLimit === 0 ? 'Ilimitado' : plan.userLimit}</span>
                    </div>
                    {plan.userLimit > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tarifa Usuário Extra:</span>
                          <span className="font-semibold text-foreground">R$ {Number(plan.extraUserPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lote Usuário Extra:</span>
                          <span className="font-semibold text-foreground">{plan.extraUserBlock} users</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">White-Label:</span>
                      <span className={cn("font-semibold", plan.allowWhiteLabel ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground")}>
                        {plan.allowWhiteLabel ? 'Disponível' : 'Não incluso'}
                      </span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleEditClick(plan)}
                  variant="outline" 
                  size="sm" 
                  className="w-full h-9 hover:bg-muted font-semibold text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar Regras e Valores
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {/* SUBTAB 2: SUBSCRIPTIONS */}
        {subTab === 'subscriptions' && (
          <motion.div 
            key="subscriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border/60 rounded-xl overflow-hidden bg-card"
          >
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="text-xs">Cliente / E-mail</TableHead>
                  <TableHead className="text-xs">Plano Contratado</TableHead>
                  <TableHead className="text-xs text-center">Usuários Ativos / Limite</TableHead>
                  <TableHead className="text-xs text-right">Mensalidade Base</TableHead>
                  <TableHead className="text-xs text-right">Adicional Excedente</TableHead>
                  <TableHead className="text-xs text-right font-bold text-foreground">Total do Mês</TableHead>
                  <TableHead className="text-xs text-center">Próx. Renovação</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                      Nenhuma assinatura correspondente encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/20">
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                            {sub.company ? (
                              <><Building2 className="w-3.5 h-3.5 text-primary" /> {sub.company.name}</>
                            ) : (
                              <><Users className="w-3.5 h-3.5 text-blue-400" /> {sub.user?.fullName}</>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{sub.user?.email || 'empresa@pro.com'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[10px] uppercase font-bold tracking-wide">
                          {sub.plan.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-foreground">
                            {sub.activeUsersCount} / {sub.userLimit === 0 ? '∞' : sub.userLimit}
                          </span>
                          {sub.userLimit > 0 && sub.activeUsersCount > sub.userLimit && (
                            <span className="text-[9px] text-rose-400 font-bold font-mono">+{sub.activeUsersCount - sub.userLimit} excedentes</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        R$ {Number(sub.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={sub.extraUsersCost > 0 ? "text-rose-400 font-semibold" : "text-muted-foreground"}>
                          R$ {Number(sub.extraUsersCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-foreground">
                        R$ {Number(sub.totalExpectedBill).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR') : 'Sem data'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] uppercase font-bold tracking-wider",
                          sub.status === 'ACTIVE' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                        )}>
                          {sub.status === 'ACTIVE' ? 'Ativo' : sub.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        )}

        {/* SUBTAB 3: LEADS */}
        {subTab === 'leads' && (
          <motion.div 
            key="leads"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border/60 rounded-xl overflow-hidden bg-card"
          >
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="text-xs">Lead</TableHead>
                  <TableHead className="text-xs">Contato</TableHead>
                  <TableHead className="text-xs">Empresa</TableHead>
                  <TableHead className="text-xs">Mensagem</TableHead>
                  <TableHead className="text-xs text-center">Registrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                      Nenhum lead de orçamento comercial encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/20">
                      <TableCell className="py-3 font-semibold text-foreground text-xs">
                        {lead.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <Mail className="w-3.5 h-3.5 text-primary" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1.5 text-muted-foreground font-mono">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {lead.companyName || '—'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs text-muted-foreground leading-relaxed py-3">
                        {lead.message ? (
                          <div className="flex items-start gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{lead.message}</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')} às {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POP-UP EDIT PLAN MODAL */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-popover text-popover-foreground border border-border rounded-2xl p-6 md:p-8 relative shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setEditingPlan(null)}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition"
              >
                ✕
              </button>
              
              <div className="mb-6 flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Ajustar Regras de Plano</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Modifique precificações, limites e white-label em tempo real.</p>
                </div>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Nome do Plano</label>
                    <Input 
                      type="text" 
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Mensalidade Fixa (R$)</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="h-10 text-xs bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/45 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Limite de Users</label>
                    <Input 
                      type="number" 
                      required
                      value={editUserLimit}
                      onChange={(e) => setEditUserLimit(Number(e.target.value))}
                      className="h-10 text-xs bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Extra Tarifa (R$)</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      required
                      value={editExtraUserPrice}
                      onChange={(e) => setEditExtraUserPrice(Number(e.target.value))}
                      className="h-10 text-xs bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Extra Bloco (Qtd)</label>
                    <Input 
                      type="number" 
                      required
                      value={editExtraUserBlock}
                      onChange={(e) => setEditExtraUserBlock(Number(e.target.value))}
                      className="h-10 text-xs bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Descrição Explicativa</label>
                  <textarea 
                    rows={2}
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-4 bg-muted/20 border border-border/50 p-3 rounded-xl">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-background"
                    />
                    Plano Ativo para Novas Assinaturas
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-border/45 pt-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingPlan(null)}
                    className="h-10 text-xs font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updating}
                    size="sm"
                    className="h-10 text-xs font-semibold gradient-primary text-primary-foreground min-w-28"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Salvar Alterações</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

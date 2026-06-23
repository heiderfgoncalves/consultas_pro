import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Sparkles, 
  Users, 
  Shield, 
  Zap, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  AlertCircle, 
  HelpCircle,
  Loader2,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, accessLevelLabels } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminPlansTab } from '@/components/admin/AdminPlansTab';
import { apiRequest } from '@/lib/api';

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    price: string;
    userLimit: number;
    extraUserPrice: string;
    extraUserBlock: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    plan: {
      name: string;
      slug: string;
      description: string;
    };
  } | null;
  activeUsersCount: number;
  extraUsersCost: number;
  totalExpectedBill: number;
}

export default function SubscriptionPage() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (user?.backendRole === 'PLATFORM_ADMIN') {
      setLoading(false);
      return;
    }

    async function fetchSubscription() {
      try {
        const subData = await apiRequest<SubscriptionData>('/subscriptions/me');
        setData(subData);
      } catch (error) {
        console.error('Erro ao buscar assinatura:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando dados da assinatura...</p>
      </div>
    );
  }

  // Se o usuário logado for PLATFORM_ADMIN (Master), renderiza a visão gerencial completa de todas as assinaturas do sistema!
  if (user?.backendRole === 'PLATFORM_ADMIN') {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Gestão Geral de Assinaturas" 
          subtitle="Acompanhe o faturamento recorrente (MRR), assinaturas ativas de empresas e leads comerciais da plataforma." 
        />
        <AdminPlansTab accessToken={accessToken} />
      </div>
    );
  }

  const sub = data?.subscription;
  const isIndividual = sub?.plan?.slug === 'individual-free' || !sub;
  const activeUsers = data?.activeUsersCount ?? 0;
  const limit = sub?.userLimit ?? 1;
  const pctUsed = limit > 0 ? Math.min((activeUsers / limit) * 100, 100) : 100;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader 
        title="Minha Assinatura" 
        subtitle="Gerencie seus planos, faturamento mensal e limite de usuários." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Subscription Info */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border shadow-card overflow-hidden relative"
          >
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm uppercase tracking-wider",
                    isIndividual 
                      ? "bg-muted border-border text-muted-foreground" 
                      : "bg-primary/10 border-primary/20 text-primary"
                  )}>
                    {sub?.plan?.name || 'Individual (Grátis)'}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  {isIndividual ? 'Plano Pessoal Grátis' : 'Plano Corporativo Premium'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {sub?.plan?.description || 'Acesso avulso com recarga de saldos. Ideal para operadores individuais.'}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end justify-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Mensal</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-extrabold text-foreground">
                    R$ {sub ? Number(sub.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isIndividual ? 'Sem custos fixos' : 'Cobrança dinâmica ativa'}
                </p>
              </div>
            </div>

            {/* Additional details list */}
            <div className="border-t border-border/60 bg-muted/20 px-6 py-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground/75 uppercase font-bold">Ciclo Atual</p>
                  <p className="font-semibold text-foreground">
                    {sub?.currentPeriodEnd 
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR') 
                      : 'Renovação Contínua'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground/75 uppercase font-bold">Método de Cobrança</p>
                  <p className="font-semibold text-foreground">
                    {isIndividual ? 'Balanço de Recargas' : 'Fatura Mensal Consolidada'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground/75 uppercase font-bold">Status do Plano</p>
                  <p className="font-semibold text-foreground">Sincronizado via API</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* User Limits Card (Visible for companies or to illustrate free plan limits) */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Uso de Limite de Equipe
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Usuários ativos cadastrados contra o limite contratado.</p>
              </div>
              <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-xl">
                {activeUsers} / {limit === 0 ? '∞' : limit} Ativos
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pctUsed}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                    pctUsed > 90 
                      ? "from-rose-500 to-red-600" 
                      : pctUsed > 75 
                        ? "from-amber-500 to-amber-600" 
                        : "from-primary to-violet-500"
                  )}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% de uso</span>
                {limit > 1 && <span>{pctUsed.toFixed(0)}% ocupado</span>}
                <span>Limite: {limit === 0 ? 'Ilimitado' : limit}</span>
              </div>
            </div>

            {/* Dynamic billing notice if over limit */}
            {limit > 0 && activeUsers > limit ? (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Limite de Usuários Excedido!</p>
                  <p className="text-xs mt-1">
                    Você possui {activeUsers - limit} usuários adicionais. Uma tarifa adicional de R$ {sub?.extraUserPrice ? Number(sub.extraUserPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '99,90'} a cada {sub?.extraUserBlock || 100} novos usuários está sendo aplicada ao faturamento atual.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/10 text-muted-foreground rounded-xl p-4 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Como funciona a tarifa dinâmica?</p>
                  <p className="text-[11px] mt-0.5">
                    No plano Empresa, a mensalidade base de R$ 599,90 cobre até 500 usuários ativos. Caso exceda esse número, a plataforma acrescenta automaticamente R$ 99,90 mensais para cada lote adicional de até 100 usuários, garantindo que seu sistema continue rodando sem interrupções.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Side: Billing details & Call to Actions */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-violet-500/5 blur-2xl rounded-full" />
            
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Detalhamento Financeiro</h4>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mensalidade Base:</span>
                <span className="font-semibold text-foreground">
                  R$ {sub ? Number(sub.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Usuários Adicionais:</span>
                <span className={cn(
                  "font-semibold",
                  (data?.extraUsersCost ?? 0) > 0 ? "text-rose-400" : "text-foreground"
                )}>
                  R$ {data ? Number(data.extraUsersCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
              
              <div className="border-t border-border pt-4 flex justify-between items-baseline">
                <span className="text-base font-bold text-foreground">Total Esperado:</span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-foreground">
                    R$ {data ? Number(data.totalExpectedBill).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">/período</span>
                </div>
              </div>
            </div>

            {isIndividual ? (
              <Button 
                onClick={() => navigate('/planos')}
                className="w-full gradient-primary text-primary-foreground font-semibold hover:scale-[1.01] transition-all"
              >
                Migrar para Plano Empresa <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/planos')}
                variant="outline" 
                className="w-full border-border/80 text-foreground hover:bg-muted font-semibold"
              >
                Ver Outros Planos <Sparkles className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-4"
          >
            <h4 className="text-sm font-bold text-foreground">Regras e Benefícios</h4>
            
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="p-0.5 bg-primary/10 text-primary rounded mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  Sem taxas ocultas ou taxas de configuração inicial.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="p-0.5 bg-primary/10 text-primary rounded mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  Cancelamento ou alteração de plano instantânea sem multa contratual.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="p-0.5 bg-primary/10 text-primary rounded mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  Controle de acesso e sandboxes seguras sob conformidade com a LGPD.
                </span>
              </li>
            </ul>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

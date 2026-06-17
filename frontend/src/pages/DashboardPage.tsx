import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, History, Users, FileText, Code2, Headphones,
  ArrowUpRight, Plus, Activity, Clock, CheckCircle2, AlertTriangle, Wallet, Loader2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { openRechargeModal } from '@/stores/rechargeModalStore';
import { PageHeader, EmptyState } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function DashboardPage() {
  const { user, refreshBalance } = useAuthStore();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      await refreshBalance();
      const data = await apiRequest<any[]>('/consultations');
      setConsultations(data);
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err?.message || 'Falha ao carregar os dados reais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // KPIs
  const totalRealizadas = consultations.length;
  const completedConsultations = consultations.filter(c => c.status === 'COMPLETED');
  const successRate = totalRealizadas > 0 
    ? (completedConsultations.length / totalRealizadas) * 100 
    : 100;
  const pendingCount = consultations.filter(c => 
    ['PROCESSING', 'QUEUED', 'DRAFT'].includes(c.status)
  ).length;

  // Mini gráficos dos cartões baseados nos últimos 7 dias
  const getMiniChartData = (type: 'consultas' | 'sucesso' | 'pendencias' | 'saldo') => {
    const dates: string[] = [];
    const groups: { [key: string]: number } = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dates.push(label);
      groups[label] = 0;
    }
    
    if (type === 'consultas') {
      consultations.forEach(c => {
        const label = new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (groups[label] !== undefined) groups[label]++;
      });
      return dates.map(d => ({ val: groups[d] }));
    }
    
    if (type === 'sucesso') {
      const successGroups: { [key: string]: { completed: number, total: number } } = {};
      dates.forEach(d => { successGroups[d] = { completed: 0, total: 0 }; });
      
      consultations.forEach(c => {
        const label = new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (successGroups[label] !== undefined) {
          successGroups[label].total++;
          if (c.status === 'COMPLETED') successGroups[label].completed++;
        }
      });
      return dates.map(d => {
        const item = successGroups[d];
        const rate = item.total > 0 ? (item.completed / item.total) * 100 : 100;
        return { val: rate };
      });
    }
    
    if (type === 'pendencias') {
      consultations.forEach(c => {
        const label = new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (groups[label] !== undefined && ['PROCESSING', 'QUEUED', 'DRAFT'].includes(c.status)) {
          groups[label]++;
        }
      });
      return dates.map(d => ({ val: groups[d] }));
    }

    if (type === 'saldo') {
      // Retorna uma curva simulada amigável para o saldo com base no saldo atual
      const currentBalance = user?.balance ?? 0;
      return [
        { val: currentBalance * 0.9 },
        { val: currentBalance * 0.92 },
        { val: currentBalance * 0.91 },
        { val: currentBalance * 0.95 },
        { val: currentBalance * 0.98 },
        { val: currentBalance * 0.99 },
        { val: currentBalance }
      ];
    }
    
    return [];
  };

  // Dados do gráfico de evolução diária (Consultas por Dia - últimos 30 dias)
  const getEvolutionData = () => {
    const groups: { [key: string]: number } = {};
    const dates: string[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      dates.push(label);
      groups[label] = 0;
    }
    
    consultations.forEach(c => {
      const label = new Date(c.createdAt)
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        .replace('.', '');
      if (groups[label] !== undefined) {
        groups[label]++;
      }
    });
    
    return dates.map(date => ({
      name: date,
      valor: groups[date]
    }));
  };

  // Dados do gráfico de rosca (Consultas por Tipo)
  const getDonutData = () => {
    if (consultations.length === 0) {
      return [
        { name: 'Sem dados', value: 100, rawValue: 0, color: '#64748b' }
      ];
    }
    
    const countType: { [key: string]: number } = {
      CPF: 0,
      CNPJ: 0,
      Outros: 0
    };
    
    consultations.forEach(c => {
      const type = (c.subjectType || '').toUpperCase();
      if (type === 'CPF') countType.CPF++;
      else if (type === 'CNPJ') countType.CNPJ++;
      else countType.Outros++;
    });
    
    const total = consultations.length;
    
    return [
      { name: 'CPF', value: Math.round((countType.CPF / total) * 1000) / 10, rawValue: countType.CPF, color: 'var(--brand)' },
      { name: 'CNPJ', value: Math.round((countType.CNPJ / total) * 1000) / 10, rawValue: countType.CNPJ, color: 'color-mix(in srgb, var(--brand) 65%, transparent)' },
      { name: 'Outros', value: Math.round((countType.Outros / total) * 1000) / 10, rawValue: countType.Outros, color: 'color-mix(in srgb, var(--brand) 35%, transparent)' }
    ].filter(item => item.rawValue > 0);
  };

  const donutData = getDonutData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Carregando painel de controle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 max-w-lg mx-auto mt-12 space-y-4 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-rose-500" />
        <h3 className="text-base font-bold">Erro ao Carregar Dashboard</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchDashboardData} className="bg-rose-500 text-white hover:bg-rose-600 font-bold text-xs h-9 px-4 rounded-lg">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das operações e indicadores"
        titleClassName="text-2xl font-bold text-foreground tracking-tight"
        subtitleClassName="text-muted-foreground text-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            API Status
          </div>
          <Link to="/consulta/nova">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 flex items-center justify-center gap-1.5 px-4 rounded-lg shadow-none">
              <Plus className="w-4 h-4" /> Nova Consulta
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Cards de Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Consultas Realizadas"
          value={totalRealizadas.toLocaleString('pt-BR')}
          change="Dados atualizados em tempo real"
          isPositive={true}
          icon={Activity}
          chartColor="var(--brand)"
          chartData={getMiniChartData('consultas')}
          delay={0}
        />
        <KpiCard
          title="Taxa de Sucesso"
          value={`${successRate.toFixed(1)}%`}
          change="Consultas concluídas com sucesso"
          isPositive={true}
          icon={CheckCircle2}
          chartColor="hsl(var(--success))"
          chartData={getMiniChartData('sucesso')}
          delay={0.05}
        />
        <KpiCard
          title="Pendências"
          value={String(pendingCount)}
          change="Consultas em processamento"
          isPositive={pendingCount === 0}
          icon={AlertTriangle}
          chartColor="hsl(var(--warning))"
          chartData={getMiniChartData('pendencias')}
          delay={0.1}
        />
        <KpiCard
          title="Saldo em Carteira"
          value={`R$ ${(user?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="Saldo disponível para consultas"
          isPositive={true}
          icon={Wallet}
          chartColor="var(--brand)"
          chartData={getMiniChartData('saldo')}
          delay={0.15}
        />
      </div>

      {/* Seção Central de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução de Consultas */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-none flex flex-col justify-between"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Consultas por dia</h3>
              <p className="text-xs text-muted-foreground">Evolução do volume de consultas no período</p>
            </div>
            <select className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-primary/50 cursor-pointer">
              <option>Últimos 30 dias</option>
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getEvolutionData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="currentColor"
                  className="text-muted-foreground/60"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-muted-foreground/60"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--foreground)',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  }}
                  itemStyle={{ color: 'var(--brand)' }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="var(--brand)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gráfico de Rosca (Consultas por Tipo) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 shadow-none flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Consultas por tipo</h3>
            <p className="text-xs text-muted-foreground mb-4">Distribuição do tipo de documento consultado</p>
          </div>

          <div className="relative flex justify-center items-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--foreground)',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Texto Centralizado na Rosca */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-foreground tracking-tight">{totalRealizadas}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</span>
            </div>
          </div>

          {/* Legenda do Donut */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-foreground">
            {donutData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 justify-start">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-muted-foreground truncate">{item.name}</span>
                <span className="font-extrabold text-foreground ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Ações Rápidas & Últimas Consultas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 shadow-none"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Acesso rápido</h3>
            <p className="text-xs text-muted-foreground">Atalhos para as principais funcionalidades do sistema</p>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <Link to="/consulta/nova" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Nova Consulta</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Iniciar consulta</span>
              </div>
            </Link>

            <Link to="/consulta/historico" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform mb-2">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Histórico</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Ver consultas</span>
              </div>
            </Link>

            <Link to="/equipe" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Clientes</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Gerenciar</span>
              </div>
            </Link>

            <Link to="/financeiro" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 group-hover:scale-105 transition-transform mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Relatórios</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Ver relatórios</span>
              </div>
            </Link>

            <Link to="/documentacao/api" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-lime-500/40 hover:bg-lime-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 group-hover:scale-105 transition-transform mb-2">
                  <Code2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">API</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Documentação</span>
              </div>
            </Link>

            <button onClick={() => openRechargeModal()} className="group text-left w-full h-full">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-rose-500/40 hover:bg-rose-500/[0.03] transition-all text-center h-24 cursor-pointer">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform mb-2">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Suporte</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Abrir chamado</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Últimas Consultas */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 shadow-none flex flex-col justify-between"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Últimas Consultas</h3>
              <p className="text-xs text-muted-foreground">Atividades de consulta mais recentes da conta</p>
            </div>
            <Link to="/consulta/historico" className="text-[11px] font-bold text-primary hover:text-sky-400 flex items-center justify-center gap-1 transition-colors">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/60 flex-1 flex flex-col justify-center">
            {consultations.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Nenhuma consulta realizada.</div>
            ) : (
              consultations.slice(0, 3).map((item) => {
                const dateStr = new Date(item.createdAt).toLocaleString('pt-BR');
                const templateNameStr = item.template?.name || (item.items?.map((i: any) => i.providerProduct?.name).join(', ') || 'Consulta Personalizada');
                const totalCostNum = Number(item.totalCost);
                const statusKey = item.status === 'COMPLETED' ? 'completed' : (item.status === 'PROCESSING' || item.status === 'QUEUED' ? 'processing' : 'error');

                return (
                  <div key={item.id} className="flex items-center justify-between py-3 hover:bg-muted/10 transition-colors rounded-lg px-2 -mx-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted border border-border/60 flex items-center justify-center">
                        <Search className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground tracking-wide truncate max-w-[180px]">{templateNameStr}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.subjectDocument} · {dateStr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-foreground">R$ {totalCostNum.toFixed(2)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider flex items-center justify-center ${
                        statusKey === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : statusKey === 'processing'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {statusKey === 'completed' ? 'Sucesso' : statusKey === 'processing' ? 'Processando' : 'Erro'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

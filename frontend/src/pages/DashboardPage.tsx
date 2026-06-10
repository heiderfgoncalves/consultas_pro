import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, History, Users, FileText, Code2, Headphones,
  ArrowUpRight, Plus, Activity, Clock, CheckCircle2, AlertTriangle, Wallet
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { openRechargeModal } from '@/stores/rechargeModalStore';
import { mockHistory } from '@/stores/consultationStore';
import { PageHeader } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';

// Dados para os mini-gráficos dos cards superiores
const miniChartData1 = [
  { val: 100 }, { val: 120 }, { val: 115 }, { val: 140 }, { val: 135 }, { val: 165 }, { val: 158 }, { val: 185 }, { val: 190 }, { val: 210 }
];
const miniChartData2 = [
  { val: 95.2 }, { val: 96.1 }, { val: 95.8 }, { val: 97.4 }, { val: 97.1 }, { val: 98.2 }, { val: 98.0 }, { val: 98.5 }, { val: 98.4 }, { val: 98.7 }
];
const miniChartData3 = [
  { val: 210 }, { val: 195 }, { val: 188 }, { val: 172 }, { val: 165 }, { val: 158 }, { val: 162 }, { val: 155 }, { val: 150 }, { val: 152 }
];
const miniChartData4 = [
  { val: 28000 }, { val: 31000 }, { val: 30500 }, { val: 34000 }, { val: 36000 }, { val: 39500 }, { val: 42000 }, { val: 44800 }, { val: 46200 }, { val: 48732 }
];

// Dados do gráfico de evolução diária (Consultas por Dia - últimos 30 dias)
const evolutionData = [
  { name: '01 Mai', valor: 650 },
  { name: '05 Mai', valor: 880 },
  { name: '11 Mai', valor: 750 },
  { name: '16 Mai', valor: 1100 },
  { name: '21 Mai', valor: 980 },
  { name: '26 Mai', valor: 1250 },
  { name: '31 Mai', valor: 1284 }
];

// Dados do gráfico de rosca (Consultas por Tipo)
const donutData = [
  { name: 'CPF', value: 58.7, rawValue: 7538, color: '#00c2ff' },
  { name: 'CNPJ', value: 24.1, rawValue: 3094, color: '#00e676' },
  { name: 'Placa', value: 8.6, rawValue: 1104, color: '#ff9100' },
  { name: 'Telefone', value: 5.3, rawValue: 681, color: '#ffd600' },
  { name: 'Outros', value: 3.3, rawValue: 425, color: '#d500f9' }
];


export default function DashboardPage() {
  const { user } = useAuthStore();

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
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            API Status
          </div>
          <Link to="/consulta/nova">
            <Button className="gradient-primary text-primary-foreground hover:opacity-95 font-semibold text-xs h-9 shadow-[0_4px_20px_rgba(0,194,255,0.15)] flex items-center justify-center gap-1.5 px-4 rounded-lg">
              <Plus className="w-4 h-4" /> Nova Consulta
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Cards de Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Consultas Realizadas"
          value="12.842"
          change="+24,8% vs período anterior"
          isPositive={true}
          icon={Activity}
          chartColor="#00c2ff"
          chartData={miniChartData1}
          delay={0}
        />
        <KpiCard
          title="Taxa de Sucesso"
          value="98,7%"
          change="+1,3% vs período anterior"
          isPositive={true}
          icon={CheckCircle2}
          chartColor="#00e676"
          chartData={miniChartData2}
          delay={0.05}
        />
        <KpiCard
          title="Pendências"
          value="152"
          change="-8,2% vs período anterior"
          isPositive={false}
          icon={AlertTriangle}
          chartColor="#ffd600"
          chartData={miniChartData3}
          delay={0.1}
        />
        <KpiCard
          title="Receita Total"
          value="R$ 48.732,19"
          change="+18,6% vs período anterior"
          isPositive={true}
          icon={Wallet}
          chartColor="#d500f9"
          chartData={miniChartData4}
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
          className="lg:col-span-2 bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Consultas por dia</h3>
              <p className="text-xs text-muted-foreground">Evolução do volume de consultas no período</p>
            </div>
            <select className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-primary/50 cursor-pointer">
              <option>Últimos 30 dias</option>
              <option>Últimos 7 dias</option>
              <option>Este mês</option>
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c2ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00c2ff" stopOpacity={0.01} />
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
                  itemStyle={{ color: '#00c2ff' }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#00c2ff"
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
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between"
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
              <span className="text-2xl font-black text-foreground tracking-tight">12.842</span>
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
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Acesso rápido</h3>
            <p className="text-xs text-muted-foreground">Atalhos para as principais funcionalidades do sistema</p>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <Link to="/consulta/nova" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-inner mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Nova Consulta</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Iniciar consulta</span>
              </div>
            </Link>

            <Link to="/consulta/historico" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-inner mb-2">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Histórico</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Ver consultas</span>
              </div>
            </Link>

            <Link to="/equipe" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-inner mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Clientes</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Gerenciar</span>
              </div>
            </Link>

            <Link to="/financeiro" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 group-hover:scale-110 transition-transform shadow-inner mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">Relatórios</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Ver relatórios</span>
              </div>
            </Link>

            <Link to="/documentacao/api" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-lime-500/40 hover:bg-lime-500/[0.03] transition-all text-center h-24">
                <div className="p-2 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 group-hover:scale-110 transition-transform shadow-inner mb-2">
                  <Code2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-wide">API</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Documentação</span>
              </div>
            </Link>

            <button onClick={() => openRechargeModal()} className="group text-left w-full h-full">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-rose-500/40 hover:bg-rose-500/[0.03] transition-all text-center h-24 cursor-pointer">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shadow-inner mb-2">
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
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between"
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
            {mockHistory.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 hover:bg-muted/10 transition-colors rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border border-border/60 flex items-center justify-center">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground tracking-wide">{item.templateName}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.document} · {item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-foreground">R$ {item.totalPrice.toFixed(2)}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider flex items-center justify-center ${
                    item.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : item.status === 'processing'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}>
                    {item.status === 'completed' ? 'Sucesso' : item.status === 'processing' ? 'Processando' : 'Erro'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

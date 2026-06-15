import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, ArrowUpRight, ArrowDownRight, Users, Shield, Clock, Plus,
  ChevronRight, Calendar, Filter
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { mockFinancialEntries, mockTeamMembers } from '@/stores/consultationStore';
import { PageHeader } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';
import { openRechargeModal } from '@/stores/rechargeModalStore';

// Dados para mini-gráficos financeiros
const miniChartData1 = [{ val: 6500 }, { val: 6800 }, { val: 7100 }, { val: 7000 }, { val: 7400 }, { val: 7800 }, { val: 8350 }];
const miniChartData2 = [{ val: 10500 }, { val: 11000 }, { val: 11200 }, { val: 11500 }, { val: 11800 }, { val: 12200 }, { val: 12540 }];
const miniChartData3 = [{ val: 14000 }, { val: 15200 }, { val: 15800 }, { val: 16500 }, { val: 17200 }, { val: 18100 }, { val: 18750 }];
const miniChartData4 = [{ val: 110 }, { val: 122 }, { val: 128 }, { val: 135 }, { val: 142 }, { val: 149 }, { val: 156 }];

// Atividades recentes dos usuários
const mockActivities = [
  { id: '1', name: 'Ana P.', action: 'realizou 32 consultas', time: 'Hoje, 14:32', color: 'from-sky-400 to-blue-500' },
  { id: '2', name: 'Carlos M.', action: 'exportou relatório', time: 'Hoje, 11:07', color: 'from-emerald-400 to-teal-500' },
  { id: '3', name: 'Mariana S.', action: 'adicionou créditos', time: 'Ontem, 16:45', color: 'from-purple-400 to-fuchsia-500' },
  { id: '4', name: 'Felipe R.', action: 'alterou permissões', time: 'Ontem, 09:22', color: 'from-amber-400 to-orange-500' },
];

export default function FinancialPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <PageHeader
        title="Gestão financeira e de equipe"
        subtitle="Acompanhe as movimentações da conta e gerencie os acessos dos seus colaboradores"
        titleClassName="text-2xl font-bold text-foreground tracking-tight"
        subtitleClassName="text-muted-foreground text-sm"
      >
        <div className="flex items-center gap-3">
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 flex items-center gap-1.5 px-4 rounded-lg shadow-none"
            onClick={() => openRechargeModal()}
          >
            <Wallet className="w-4 h-4" /> Recarregar Saldo
          </Button>
        </div>
      </PageHeader>

      {/* Cards Financeiros Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo da carteira"
          value="R$ 8.350,75"
          change="+12,5% este mês"
          isPositive={true}
          icon={Wallet}
          chartColor="#00c2ff"
          chartData={miniChartData1}
          delay={0}
        />
        <KpiCard
          title="Créditos disponíveis"
          value="12.540"
          change="+8,2% este mês"
          isPositive={true}
          icon={Plus}
          chartColor="#00e676"
          chartData={miniChartData2}
          delay={0.05}
        />
        <KpiCard
          title="Consumo este mês"
          value="18.750"
          change="+15,7% este mês"
          isPositive={true}
          icon={ArrowDownRight}
          chartColor="#ffd600"
          chartData={miniChartData3}
          delay={0.1}
        />
        <KpiCard
          title="Consultas realizadas"
          value="156"
          change="+11,3% este mês"
          isPositive={true}
          icon={Clock}
          chartColor="#d500f9"
          chartData={miniChartData4}
          delay={0.15}
        />
      </div>

      {/* Conteúdo de Duas Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Extrato & Usuários */}
        <div className="lg:col-span-2 space-y-6">
          {/* Extrato de Transações */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-card border border-border rounded-xl shadow-none overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Extrato de transações</h3>
                <p className="text-[11px] text-muted-foreground">Histórico de cargas e utilizações de saldo</p>
              </div>
              <button className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Data</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Descrição</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Tipo</th>
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Valor</th>
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {mockFinancialEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{entry.date}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground font-semibold">{entry.description}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          entry.amount > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {entry.amount > 0 ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-xs text-right font-black whitespace-nowrap ${entry.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {entry.amount > 0 ? '+' : '-'} R$ {Math.abs(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-right text-muted-foreground font-semibold whitespace-nowrap">
                        R$ {entry.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Lista de Usuários */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="bg-card border border-border rounded-xl shadow-none overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Usuários</h3>
                <p className="text-[11px] text-muted-foreground">Colaboradores vinculados a essa conta</p>
              </div>
              <button className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Usuário</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">E-mail</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Role</th>
                    <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Status</th>
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Último acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {mockTeamMembers.map((member) => {
                    const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                    return (
                      <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {initials}
                            </div>
                            <span className="text-xs font-bold text-foreground">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{member.email}</td>
                        <td className="px-5 py-3.5 text-xs text-foreground font-semibold whitespace-nowrap">{member.role}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                            member.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {member.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-right text-muted-foreground font-semibold whitespace-nowrap">{member.lastActivity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Coluna Direita - Widgets Laterais */}
        <div className="space-y-6">
          {/* Usuários Ativos */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-5 shadow-none"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Usuários ativos</span>
            <div className="flex items-baseline gap-2.5 mt-2">
              <h3 className="text-4xl font-black text-foreground tracking-tight">28</h3>
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">+4 este mês</span>
            </div>

            {/* Avatares sobrepostos premium */}
            <div className="flex items-center gap-1.5 mt-4">
              <div className="flex -space-x-2 overflow-hidden text-[10px] font-bold text-foreground">
                <div className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/50">AS</div>
                <div className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-emerald-50 dark:bg-emerald-955 flex items-center justify-center border border-border/50">CM</div>
                <div className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-amber-50 dark:bg-amber-955 flex items-center justify-center border border-border/50">MS</div>
                <div className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-indigo-50 dark:bg-indigo-955 flex items-center justify-center border border-border/50">FR</div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground ml-1">E outros 24 ativos</span>
            </div>
          </motion.div>

          {/* Roles & Permissões */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-5 shadow-none"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Roles e permissões</span>
              <button className="text-[10px] font-bold text-primary hover:underline">Gerenciar</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-bold text-foreground/80">Administradores</span>
                </div>
                <span className="font-black text-foreground">6</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-bold text-foreground/80">Analistas</span>
                </div>
                <span className="font-black text-foreground">14</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="font-bold text-foreground/80">Visualizadores</span>
                </div>
                <span className="font-black text-foreground">8</span>
              </div>
            </div>
          </motion.div>

          {/* Atividade Recente */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-5 shadow-none flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atividade recente</span>
              <button className="text-[10px] font-bold text-primary hover:underline">Ver toda atividade</button>
            </div>
            <div className="space-y-4 flex-1">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                    {activity.name.slice(0, 2)}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-foreground/90">
                      <span className="font-bold text-foreground">{activity.name}</span> {activity.action}
                    </p>
                    <span className="text-[9px] text-muted-foreground font-bold block flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, ArrowDownRight, Shield, Clock, Plus,
  ChevronRight, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';
import { openRechargeModal } from '@/stores/rechargeModalStore';
import { apiRequest } from '@/lib/api';

export default function FinancialPage() {
  const { user, refreshBalance } = useAuthStore();
  
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Atualizar saldo
      await refreshBalance();
      
      // Buscar dados paralelos do backend
      const [ledgerData, usersData, consultationsData] = await Promise.all([
        apiRequest<any[]>('/finance/me/ledger'),
        apiRequest<any[]>('/companies/me/users'),
        apiRequest<any[]>('/consultations')
      ]);
      
      setLedgerEntries(ledgerData);
      setUsers(usersData);
      setConsultations(consultationsData);
    } catch (err: any) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError(err?.message || 'Falha ao carregar os dados financeiros reais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  // Consumo no mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthlyConsultations = consultations.filter(c => new Date(c.createdAt) >= startOfMonth);
  const totalMonthlySpent = monthlyConsultations.reduce((sum, c) => sum + Number(c.totalCost), 0);
  const totalMonthlyCount = monthlyConsultations.length;

  // Gerar dados de mini-gráfico baseados no ledger ou dados dinâmicos
  const getMiniChartData = (type: 'saldo' | 'consumo' | 'consultas') => {
    const currentBalance = user?.balance ?? 0;
    if (type === 'saldo') {
      return [
        { val: currentBalance * 0.9 },
        { val: currentBalance * 0.95 },
        { val: currentBalance * 0.98 },
        { val: currentBalance }
      ];
    }
    if (type === 'consumo') {
      return [
        { val: totalMonthlySpent * 0.7 },
        { val: totalMonthlySpent * 0.8 },
        { val: totalMonthlySpent * 0.9 },
        { val: totalMonthlySpent }
      ];
    }
    if (type === 'consultas') {
      return [
        { val: totalMonthlyCount * 0.6 },
        { val: totalMonthlyCount * 0.8 },
        { val: totalMonthlyCount * 0.9 },
        { val: totalMonthlyCount }
      ];
    }
    return [];
  };

  // Roles dos usuários
  const countRoles = {
    owner: users.filter(u => u.role === 'COMPANY_OWNER').length,
    manager: users.filter(u => u.role === 'COMPANY_MANAGER').length,
    user: users.filter(u => u.role === 'USER').length
  };

  // Atividade recente baseada no ledger
  const recentActivities = ledgerEntries.slice(0, 4).map(entry => {
    const usr = users.find(u => u.id === entry.userId);
    const userName = usr ? usr.fullName : 'Sistema';
    const timeStr = new Date(entry.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    return {
      id: entry.id,
      name: userName,
      action: entry.description,
      time: timeStr
    };
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'Admin Geral';
      case 'COMPANY_OWNER': return 'Proprietário';
      case 'COMPANY_MANAGER': return 'Gerente';
      case 'USER': return 'Operador';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Carregando painel financeiro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 max-w-lg mx-auto mt-12 space-y-4 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-rose-500" />
        <h3 className="text-base font-bold">Erro ao Carregar Financeiro</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchFinanceData} className="bg-rose-500 text-white hover:bg-rose-600 font-bold text-xs h-9 px-4 rounded-lg">
          Tentar Novamente
        </Button>
      </div>
    );
  }

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
          value={`R$ ${(user?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="Saldo atual compartilhado"
          isPositive={true}
          icon={Wallet}
          chartColor="#00c2ff"
          chartData={getMiniChartData('saldo')}
          delay={0}
        />
        <KpiCard
          title="Limite disponível"
          value={`R$ ${(user?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="Disponível para consultas"
          isPositive={true}
          icon={Plus}
          chartColor="#00e676"
          chartData={getMiniChartData('saldo')}
          delay={0.05}
        />
        <KpiCard
          title="Consumo este mês"
          value={`R$ ${totalMonthlySpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="Gasto acumulado no mês"
          isPositive={false}
          icon={ArrowDownRight}
          chartColor="#ffd600"
          chartData={getMiniChartData('consumo')}
          delay={0.1}
        />
        <KpiCard
          title="Consultas realizadas"
          value={String(totalMonthlyCount)}
          change="Consultas no mês atual"
          isPositive={true}
          icon={Clock}
          chartColor="#d500f9"
          chartData={getMiniChartData('consultas')}
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
            </div>
            <div className="overflow-x-auto max-h-96 scrollbar-thin">
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
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhuma movimentação financeira encontrada.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((entry) => {
                      const amountNum = Number(entry.amount);
                      const isCredit = amountNum > 0 || ['CREDIT', 'RECHARGE', 'BONUS'].includes(entry.type);
                      const formattedDate = new Date(entry.createdAt).toLocaleString('pt-BR');
                      
                      return (
                        <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{formattedDate}</td>
                          <td className="px-5 py-3.5 text-xs text-foreground font-semibold">{entry.description}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}>
                              {isCredit ? 'Crédito' : 'Débito'}
                            </span>
                          </td>
                          <td className={`px-5 py-3.5 text-xs text-right font-black whitespace-nowrap ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {isCredit ? '+' : '-'} R$ {Math.abs(amountNum).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-right text-muted-foreground font-semibold whitespace-nowrap">
                            R$ {Number(entry.balanceAfter).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
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
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Usuário</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">E-mail</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Cargo</th>
                    <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Status</th>
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Último acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhum colaborador encontrado.
                      </td>
                    </tr>
                  ) : (
                    users.map((member) => {
                      const initials = member.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                      const lastActivityStr = member.lastLoginAt 
                        ? new Date(member.lastLoginAt).toLocaleString('pt-BR') 
                        : 'Nunca acessou';
                      
                      return (
                        <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {initials}
                              </div>
                              <span className="text-xs font-bold text-foreground">{member.fullName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{member.email}</td>
                          <td className="px-5 py-3.5 text-xs text-foreground font-semibold whitespace-nowrap">{getRoleLabel(member.role)}</td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              member.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}>
                              {member.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-right text-muted-foreground font-semibold whitespace-nowrap">{lastActivityStr}</td>
                        </tr>
                      );
                    })
                  )}
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
              <h3 className="text-4xl font-black text-foreground tracking-tight">
                {users.filter(u => u.isActive).length}
              </h3>
              <span className="text-xs font-bold text-muted-foreground">de {users.length} totais</span>
            </div>

            {/* Avatares sobrepostos dinâmicos */}
            <div className="flex items-center gap-1.5 mt-4">
              <div className="flex -space-x-2 overflow-hidden text-[10px] font-bold text-foreground">
                {users.slice(0, 4).map((u, i) => {
                  const initials = u.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  return (
                    <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/50">
                      {initials}
                    </div>
                  );
                })}
              </div>
              {users.length > 4 && (
                <span className="text-[10px] font-bold text-muted-foreground ml-1">E outros {users.length - 4} ativos</span>
              )}
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
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-bold text-foreground/80">Proprietários</span>
                </div>
                <span className="font-black text-foreground">{countRoles.owner}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-bold text-foreground/80">Gerentes</span>
                </div>
                <span className="font-black text-foreground">{countRoles.manager}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="font-bold text-foreground/80">Operadores</span>
                </div>
                <span className="font-black text-foreground">{countRoles.user}</span>
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
            </div>
            <div className="space-y-4 flex-1">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma atividade recente.</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                      {activity.name.slice(0, 2).toUpperCase()}
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
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

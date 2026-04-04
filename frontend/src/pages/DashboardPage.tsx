import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet, Search, History, FileText, Users, TrendingUp,
  ArrowUpRight, Plus, Clock
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { openRechargeModal } from '@/stores/rechargeModalStore';
import { mockHistory, mockFinancialEntries } from '@/stores/consultationStore';
import StatCard, { PageHeader, StatusBadge } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const canRecharge = (user?.accessLevel ?? 2) <= 1;
  const quickActions: (
    | { label: string; icon: typeof Search; path: string; variant: string }
    | { label: string; icon: typeof Plus; action: 'recharge'; variant: string }
  )[] = [
    { label: 'Nova Consulta', icon: Search, path: '/consulta/nova', variant: 'gradient-primary text-primary-foreground' },
    ...(canRecharge
      ? [{ label: 'Recarregar', icon: Plus, action: 'recharge' as const, variant: 'bg-success/10 text-success border border-success/20' }]
      : []),
    { label: 'Histórico', icon: History, path: '/consulta/historico', variant: 'bg-card text-foreground border border-border' },
    { label: 'Equipe', icon: Users, path: '/equipe', variant: 'bg-card text-foreground border border-border' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Painel" subtitle="Visão geral da sua conta e atividades recentes" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Atual" value={`R$ ${user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Wallet} variant="success" delay={0} />
        <StatCard title="Consultas no Mês" value="23" subtitle="↑ 12% vs último mês" icon={Search} variant="primary" delay={0.05} />
        <StatCard title="Gasto no Período" value="R$ 752,40" subtitle="Março 2026" icon={TrendingUp} variant="warning" delay={0.1} />
        <StatCard title="Templates Salvos" value="3" subtitle="1 favorito" icon={FileText} variant="default" delay={0.15} />
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) =>
            'path' in action ? (
              <Link key={action.path} to={action.path}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-elevated cursor-pointer ${action.variant}`}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </div>
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={() => openRechargeModal()}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-elevated cursor-pointer ${action.variant}`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ),
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Consultas Recentes
            </h3>
            <Link to="/consulta/historico" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {mockHistory.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.templateName}</p>
                  <p className="text-xs text-muted-foreground">{item.document} · {item.date.split(' ')[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">R$ {item.totalPrice.toFixed(2)}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Financial */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" /> Últimas Movimentações
            </h3>
            <Link to="/financeiro" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver extrato <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {mockFinancialEntries.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">{entry.date}</p>
                </div>
                <span className={`text-sm font-semibold ${entry.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                  {entry.amount > 0 ? '+' : ''}R$ {Math.abs(entry.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

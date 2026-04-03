import { motion } from 'framer-motion';
import {
  Shield, Users, History, FileText, DollarSign,
  Activity, AlertTriangle, TrendingUp, Settings, Code2,
  Search, Eye
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { mockHistory, mockFinancialEntries, mockTeamMembers } from '@/stores/consultationStore';
import StatCard, { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const { user } = useAuthStore();
  if (user?.backendRole !== 'PLATFORM_ADMIN') return <Navigate to="/dashboard" replace />;

  const reportedConsultations = mockHistory.filter(h => h.reportedBy);
  const totalRevenue = mockFinancialEntries
    .filter(e => e.type === 'debit')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Painel Admin" subtitle="Gerenciamento completo do sistema">
        <Link to="/admin/canvas">
          <Button className="gradient-primary text-primary-foreground">
            <Code2 className="w-4 h-4 mr-2" /> Editor Canvas
          </Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Consultas" value={String(mockHistory.length)} icon={Search} variant="primary" delay={0} />
        <StatCard title="Reports Pendentes" value={String(reportedConsultations.filter(r => r.reportStatus === 'pending').length)} subtitle="Requer atenção" icon={AlertTriangle} variant="warning" delay={0.05} />
        <StatCard title="Receita do Mês" value={`R$ ${totalRevenue.toFixed(2)}`} icon={DollarSign} variant="success" delay={0.1} />
        <StatCard title="Usuários Ativos" value={String(mockTeamMembers.filter(m => m.status === 'active').length)} icon={Users} variant="default" delay={0.15} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Histórico Completo', desc: 'Ver todas consultas com logs JSON', icon: History, path: '/consulta/historico', color: 'text-primary' },
          { label: 'Editor de Templates', desc: 'Construir e testar templates', icon: Code2, path: '/admin/canvas', color: 'text-success' },
          { label: 'Reports Abertos', desc: `${reportedConsultations.length} consultas reportadas`, icon: AlertTriangle, path: '/consulta/historico', color: 'text-warning' },
          { label: 'Gerenciar Equipe', desc: 'Usuários e permissões', icon: Users, path: '/equipe', color: 'text-info' },
          { label: 'Financeiro', desc: 'Receitas e recargas', icon: TrendingUp, path: '/financeiro', color: 'text-success' },
          { label: 'Configurações', desc: 'Parâmetros do sistema', icon: Settings, path: '/configuracoes', color: 'text-muted-foreground' },
        ].map((action, i) => (
          <motion.div
            key={action.path + action.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Link to={action.path}>
              <div className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-200 group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Reports */}
      {reportedConsultations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Reports Recentes
          </h3>
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {reportedConsultations.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/50 transition-colors bg-warning/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.templateName} — {item.document}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">por {item.reportedBy}: "{item.reportComment}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      item.reportStatus === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                      item.reportStatus === 'reviewed' ? 'bg-info/10 text-info border-info/20' :
                      'bg-success/10 text-success border-success/20'
                    }`}>
                      {item.reportStatus === 'pending' ? 'Pendente' : item.reportStatus === 'reviewed' ? 'Analisando' : 'Resolvido'}
                    </span>
                    <Link to="/consulta/historico">
                      <Button size="sm" variant="ghost" className="h-7"><Eye className="w-3.5 h-3.5" /></Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Mail, Phone, MoreVertical, Shield, Wallet, X,
  Clock, CheckCircle2, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { mockTeamMembers } from '@/stores/consultationStore';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dados de mini-gráficos para os cards superiores
const miniChartData1 = [{ val: 8000 }, { val: 8100 }, { val: 8150 }, { val: 8200 }, { val: 8250 }, { val: 8300 }, { val: 8350.75 }];
const miniChartData2 = [{ val: 2 }, { val: 2 }, { val: 3 }, { val: 3 }, { val: 4 }, { val: 4 }, { val: 5 }];
const miniChartData3 = [{ val: 2 }, { val: 2 }, { val: 3 }, { val: 3 }, { val: 3 }, { val: 4 }, { val: 4 }];
const miniChartData4 = [{ val: 120 }, { val: 135 }, { val: 142 }, { val: 150 }, { val: 168 }, { val: 175 }, { val: 188 }];

export default function TeamPage() {
  const { user } = useAuthStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<'operator' | 'viewer'>('operator');

  const filtered = mockTeamMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalConsultations = mockTeamMembers.reduce((s, m) => s + m.consultationsThisMonth, 0);
  const totalSpent = mockTeamMembers.reduce((s, m) => s + m.spentThisMonth, 0);

  // Paleta de gradientes de avatar modernos
  const avatarGradients = [
    'from-sky-400 to-blue-500 text-sky-950',
    'from-emerald-400 to-teal-500 text-emerald-950',
    'from-purple-400 to-fuchsia-500 text-purple-950',
    'from-amber-400 to-orange-500 text-amber-950',
    'from-rose-400 to-pink-500 text-rose-950'
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <PageHeader
        title="Minha Equipe"
        subtitle="Gerencie os usuários subordinados da sua conta"
        titleClassName="text-2xl font-bold text-foreground tracking-tight"
        subtitleClassName="text-muted-foreground text-sm"
      >
        <Button
          onClick={() => setShowInviteModal(true)}
          className="gradient-primary text-primary-foreground hover:opacity-95 font-semibold text-xs h-9 shadow-[0_4px_20px_rgba(0,194,255,0.15)] flex items-center gap-1.5 px-4 rounded-lg"
        >
          <UserPlus className="w-4 h-4" /> Convidar Usuário
        </Button>
      </PageHeader>

      {/* Cards Superiores com Mini-Gráficos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Compartilhado"
          value={`R$ ${user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          chartColor="#00c2ff"
          chartData={miniChartData1}
          delay={0}
        />
        <KpiCard
          title="Total de Usuários"
          value={String(mockTeamMembers.length)}
          icon={Users}
          chartColor="#00e676"
          chartData={miniChartData2}
          delay={0.05}
        />
        <KpiCard
          title="Membros Ativos"
          value={String(mockTeamMembers.filter(m => m.status === 'active').length)}
          icon={Shield}
          chartColor="#d500f9"
          chartData={miniChartData3}
          delay={0.1}
        />
        <KpiCard
          title="Consultas da Equipe"
          value={String(totalConsultations)}
          subtitle={`R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gastos`}
          icon={Search}
          chartColor="#ffd600"
          chartData={miniChartData4}
          delay={0.15}
        />
      </div>

      {/* Info Banner Glassmorphic */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Saldo compartilhado mestre</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Todos os usuários subordinados utilizam o saldo da sua conta mestre de forma transparente. O consumo individual de cada um é detalhado no histórico de consultas e transações.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10.5 bg-card/75 backdrop-blur-md border-border focus:border-primary/50 focus:ring-primary/15 text-foreground rounded-xl placeholder:text-muted-foreground/60 transition-all text-sm w-full"
        />
      </div>

      {/* Team Table Glassmorphic */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card/75 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Usuário</th>
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Contato</th>
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Papel</th>
                <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Status</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Consultas/Mês</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Gasto/Mês</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((member, idx) => {
                const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                const avatarGradient = avatarGradients[idx % avatarGradients.length];

                return (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8.5 h-8.5 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-black shadow-inner`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{member.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            {member.lastActivity ? `Ativo em ${member.lastActivity}` : 'Nunca acessou'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground/60" /> {member.email}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground/60" /> {member.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-foreground capitalize">
                        {member.role === 'operator' ? 'Operador' : 'Visualizador'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                        member.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-muted-foreground/60'}`} />
                        {member.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-black text-foreground whitespace-nowrap">
                      {member.consultationsThisMonth}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-black text-foreground whitespace-nowrap">
                      R$ {member.spentThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite User Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-md p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Convidar Usuário
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                O usuário receberá um convite por e-mail contendo os detalhes de login e credenciais temporárias para acessar a plataforma.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Nome Completo</Label>
                  <Input className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" placeholder="Ex: João Silva" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">E-mail Corporativo</Label>
                  <Input type="email" className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" placeholder="joao@empresa.com" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Telefone de Contato</Label>
                  <Input className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" placeholder="(11) 99999-8888" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Nível de Permissão (Papel)</Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setInviteRole('operator')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        inviteRole === 'operator'
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-muted/25 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      Operador
                    </button>
                    <button
                      onClick={() => setInviteRole('viewer')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        inviteRole === 'viewer'
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-muted/25 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      Visualizador
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1 rounded-xl h-10 text-xs font-bold border-border bg-muted/30 hover:bg-muted/50 text-foreground">
                    Cancelar
                  </Button>
                  <Button onClick={() => setShowInviteModal(false)} className="flex-1 rounded-xl h-10 text-xs font-bold gradient-primary text-primary-foreground hover:opacity-95 shadow-[0_4px_15px_rgba(0,194,255,0.15)]">
                    Enviar Convite
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

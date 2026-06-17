import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Mail, Phone, Shield, Wallet, X,
  Clock, CheckCircle2, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import KpiCard from '@/components/shared/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/shared/Modal';

export default function TeamPage() {
  const { user, refreshBalance } = useAuthStore();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados do convite
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'COMPANY_MANAGER' | 'USER'>('USER');
  const [inviting, setInviting] = useState(false);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      await refreshBalance();

      const [usersData, consultationsData] = await Promise.all([
        apiRequest<any[]>('/companies/me/users'),
        apiRequest<any[]>('/consultations')
      ]);

      setUsers(usersData);
      setConsultations(consultationsData);
    } catch (err: any) {
      console.error('Erro ao buscar dados da equipe:', err);
      setError(err?.message || 'Falha ao carregar dados da equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviting(true);
      await apiRequest('/companies/me/users/invites', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          metadata: {
            name: inviteName,
            phone: invitePhone
          }
        })
      });

      toast({
        title: "Convite enviado!",
        description: `O convite foi enviado com sucesso para ${inviteEmail}.`,
      });

      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('USER');
      
      // Recarregar dados
      fetchTeamData();
    } catch (err: any) {
      console.error('Erro ao convidar usuário:', err);
      toast({
        title: "Falha ao enviar convite",
        description: err?.message || "Ocorreu um erro ao processar o convite.",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/companies/me/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      toast({
        title: "Status atualizado!",
        description: `O status do usuário foi alterado para ${!currentStatus ? 'Ativo' : 'Inativo'}.`,
      });

      fetchTeamData();
    } catch (err: any) {
      console.error('Erro ao atualizar status do usuário:', err);
      toast({
        title: "Falha ao atualizar status",
        description: err?.message || "Não foi possível alterar o status do usuário.",
        variant: "destructive"
      });
    }
  };

  // Filtrar usuários com base na busca
  const filtered = users.filter(m =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Computar estatísticas de consumo mensal por usuário
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getMemberStats = (memberId: string) => {
    const userConsultations = consultations.filter(
      c => c.requestedByUserId === memberId && new Date(c.createdAt) >= startOfMonth
    );
    const count = userConsultations.length;
    const spent = userConsultations.reduce((sum, c) => sum + Number(c.totalCost), 0);
    return { count, spent };
  };

  const totalMonthlyConsultations = consultations.filter(
    c => new Date(c.createdAt) >= startOfMonth
  ).length;

  const totalMonthlySpent = consultations.filter(
    c => new Date(c.createdAt) >= startOfMonth
  ).reduce((sum, c) => sum + Number(c.totalCost), 0);

  // Paleta de cores de avatar minimalistas e modernas
  const avatarColors = [
    'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30',
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30',
    'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30',
    'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
    'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/30'
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'Admin Geral';
      case 'COMPANY_OWNER': return 'Proprietário';
      case 'COMPANY_MANAGER': return 'Gerente';
      case 'USER': return 'Operador';
      default: return role;
    }
  };

  // Dados de mini-gráficos baseados nas métricas reais
  const getMiniChartData = (type: 'saldo' | 'usuarios' | 'ativos' | 'consultas') => {
    const currentBalance = user?.balance ?? 0;
    if (type === 'saldo') {
      return [{ val: currentBalance * 0.9 }, { val: currentBalance * 0.95 }, { val: currentBalance * 0.98 }, { val: currentBalance }];
    }
    if (type === 'usuarios') {
      return [{ val: users.length * 0.8 }, { val: users.length * 0.9 }, { val: users.length }];
    }
    if (type === 'ativos') {
      const activeCount = users.filter(u => u.isActive).length;
      return [{ val: activeCount * 0.8 }, { val: activeCount * 0.9 }, { val: activeCount }];
    }
    if (type === 'consultas') {
      return [{ val: totalMonthlyConsultations * 0.8 }, { val: totalMonthlyConsultations * 0.9 }, { val: totalMonthlyConsultations }];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Carregando dados da equipe...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 max-w-lg mx-auto mt-12 space-y-4 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-rose-500" />
        <h3 className="text-base font-bold">Erro ao Carregar Equipe</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchTeamData} className="bg-rose-500 text-white hover:bg-rose-600 font-bold text-xs h-9 px-4 rounded-lg">
          Tentar Novamente
        </Button>
      </div>
    );
  }

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
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 flex items-center gap-1.5 px-4 rounded-lg shadow-none"
        >
          <UserPlus className="w-4 h-4" /> Convidar Usuário
        </Button>
      </PageHeader>

      {/* Cards Superiores com Mini-Gráficos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Compartilhado"
          value={`R$ ${(user?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          chartColor="var(--brand)"
          chartData={getMiniChartData('saldo')}
          delay={0}
        />
        <KpiCard
          title="Total de Usuários"
          value={String(users.length)}
          icon={Users}
          chartColor="hsl(var(--success))"
          chartData={getMiniChartData('usuarios')}
          delay={0.05}
        />
        <KpiCard
          title="Membros Ativos"
          value={String(users.filter(m => m.isActive).length)}
          icon={Shield}
          chartColor="var(--brand)"
          chartData={getMiniChartData('ativos')}
          delay={0.1}
        />
        <KpiCard
          title="Consultas da Equipe"
          value={String(totalMonthlyConsultations)}
          subtitle={`R$ ${totalMonthlySpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gastos`}
          icon={Search}
          chartColor="hsl(var(--warning))"
          chartData={getMiniChartData('consultas')}
          delay={0.15}
        />
      </div>

      {/* Info Banner Glassmorphic */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 shadow-none">
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
        className="bg-card rounded-xl border border-border shadow-none overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Usuário</th>
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Contato</th>
                <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Cargo</th>
                <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Status</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Consultas/Mês</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Gasto/Mês</th>
                <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3.5 tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((member, idx) => {
                  const initials = member.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  const lastActivityStr = member.lastLoginAt 
                    ? new Date(member.lastLoginAt).toLocaleString('pt-BR') 
                    : 'Nunca acessou';
                  
                  const stats = getMemberStats(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8.5 h-8.5 rounded-full ${avatarColor} flex items-center justify-center text-xs font-bold shadow-none`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{member.fullName}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-muted-foreground/60" />
                              {member.lastLoginAt ? `Ativo em ${lastActivityStr}` : 'Nunca acessou'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground/60" /> {member.email}
                          </p>
                          {member.phone && (
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground/60" /> {member.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-foreground">
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          member.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-muted-foreground/60'}`} />
                          {member.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-black text-foreground whitespace-nowrap">
                        {stats.count}
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-black text-foreground whitespace-nowrap">
                        R$ {stats.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {user?.id !== member.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserStatus(member.id, member.isActive)}
                            className="h-8 text-[10px] font-bold rounded-lg px-2.5 border-border bg-background hover:bg-muted text-foreground transition-all shrink-0"
                          >
                            {member.isActive ? 'Desativar' : 'Ativar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Convidar Usuário"
        icon={UserPlus}
        size="md"
        description="O usuário receberá um convite por e-mail contendo os detalhes de login e credenciais temporárias para acessar a plataforma."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome Completo</Label>
            <Input 
              value={inviteName} 
              onChange={(e) => setInviteName(e.target.value)} 
              className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" 
              placeholder="Ex: João Silva" 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">E-mail Corporativo</Label>
            <Input 
              type="email" 
              value={inviteEmail} 
              onChange={(e) => setInviteEmail(e.target.value)} 
              className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" 
              placeholder="joao@empresa.com" 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Telefone de Contato</Label>
            <Input 
              value={invitePhone} 
              onChange={(e) => setInvitePhone(e.target.value)} 
              className="h-10 border-border bg-muted/20 text-xs placeholder:text-muted-foreground/50 rounded-xl" 
              placeholder="(11) 99999-8888" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Nível de Permissão (Papel)</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setInviteRole('USER')}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  inviteRole === 'USER'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/25 text-muted-foreground hover:border-border/80'
                }`}
              >
                Operador
              </button>
              <button
                type="button"
                onClick={() => setInviteRole('COMPANY_MANAGER')}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  inviteRole === 'COMPANY_MANAGER'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/25 text-muted-foreground hover:border-border/80'
                }`}
              >
                Gerente
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowInviteModal(false)} 
              className="flex-1 rounded-lg h-10 text-xs font-bold border-border bg-muted/30 hover:bg-muted/50 text-foreground"
              disabled={inviting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 rounded-lg h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
              disabled={inviting}
            >
              {inviting ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

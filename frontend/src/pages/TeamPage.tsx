import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Mail, Phone, MoreVertical, Shield, Wallet } from 'lucide-react';
import { mockTeamMembers } from '@/stores/consultationStore';
import { useAuthStore } from '@/stores/authStore';
import StatCard, { PageHeader, StatusBadge } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TeamPage() {
  const { user } = useAuthStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = mockTeamMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalConsultations = mockTeamMembers.reduce((s, m) => s + m.consultationsThisMonth, 0);
  const totalSpent = mockTeamMembers.reduce((s, m) => s + m.spentThisMonth, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Equipe" subtitle="Gerencie os usuários subordinados da sua conta">
        <Button onClick={() => setShowInviteModal(true)} className="gradient-primary text-primary-foreground">
          <UserPlus className="w-4 h-4 mr-2" /> Convidar Usuário
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Compartilhado" value={`R$ ${user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Wallet} variant="success" />
        <StatCard title="Total de Usuários" value={String(mockTeamMembers.length)} icon={Users} variant="primary" delay={0.05} />
        <StatCard title="Ativos" value={String(mockTeamMembers.filter(m => m.status === 'active').length)} icon={Shield} variant="default" delay={0.1} />
        <StatCard title="Consultas pela Equipe" value={String(totalConsultations)} subtitle={`R$ ${totalSpent.toFixed(2)} gastos`} icon={Search} variant="warning" delay={0.15} />
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Saldo compartilhado</p>
          <p className="text-xs text-muted-foreground">Todos os usuários subordinados utilizam o saldo da sua conta mestre. O consumo de cada um aparece no extrato.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
      </div>

      {/* Team table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Usuário</th>
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Contato</th>
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Papel</th>
                <th className="text-center text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Status</th>
                <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Consultas/Mês</th>
                <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Gasto/Mês</th>
                <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.lastActivity ? `Ativo em ${member.lastActivity}` : 'Nunca acessou'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-foreground capitalize">{member.role === 'operator' ? 'Operador' : 'Visualizador'}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={member.status} /></td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{member.consultationsThisMonth}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">R$ {member.spentThisMonth.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border shadow-elevated w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-1">Convidar Usuário</h3>
            <p className="text-sm text-muted-foreground mb-6">O usuário receberá um convite por e-mail para acessar a plataforma.</p>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome Completo</Label><Input className="h-10" placeholder="Nome do colaborador" /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" className="h-10" placeholder="email@empresa.com" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input className="h-10" placeholder="(11) 99999-8888" /></div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <div className="flex gap-3">
                  {['Operador', 'Visualizador'].map((r) => (
                    <button key={r} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary/30 transition-colors">{r}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1">Cancelar</Button>
                <Button onClick={() => setShowInviteModal(false)} className="flex-1 gradient-primary text-primary-foreground">Enviar Convite</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

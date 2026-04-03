import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Hash, Building2, Lock, Shield, Save } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Meu Perfil" subtitle="Dados da sua conta e configurações" />

      {/* Account info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Dados Cadastrais</h3>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><User className="w-3 h-3" /> {user?.accountType === 'master' ? 'Razão Social' : 'Nome Completo'}</Label>
              <Input value={user?.companyName || user?.name} disabled={!editing} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> E-mail</Label>
              <Input value={user?.email} disabled className="h-10 bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Telefone</Label>
              <Input value={user?.phone} disabled={!editing} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> Documento</Label>
              <Input value={user?.document} disabled className="h-10 bg-muted/50 font-mono" />
            </div>
          </div>
          {editing && (
            <div className="flex justify-end pt-2">
              <Button className="gradient-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" /> Salvar Alterações
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Account type */}
      {user?.accountType === 'master' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Conta Mestre</p>
            <p className="text-xs text-muted-foreground mt-0.5">Esta conta compartilha saldo com usuários subordinados. Gerencie sua equipe na seção "Minha Equipe".</p>
          </div>
        </motion.div>
      )}

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Segurança</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" placeholder="••••••••" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input type="password" placeholder="••••••••" className="h-10" />
            </div>
          </div>
          <Button variant="outline" size="sm"><Lock className="w-3 h-3 mr-1" /> Alterar Senha</Button>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Informações da Conta</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo de Conta</p>
              <p className="font-medium text-foreground">{user?.accountType === 'master' ? 'Conta Mestre' : 'Individual'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tabela de Preço</p>
              <p className="font-medium text-foreground">{user?.priceTable}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

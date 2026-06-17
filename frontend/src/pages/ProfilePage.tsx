import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Hash, Building2, Lock, Shield, Save, CheckCircle, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, sessionUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);

  const handleLinkGoogle = async () => {
    try {
      setLinking(true);
      // Gera um mock google id combinando o id real com o email
      const mockCredential = `mock_google_id_${Math.random().toString(36).substring(7)}_${user?.email || 'user'}`;
      const res = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ credential: mockCredential }),
      });
      if (res.ok) {
        toast.success('Sua conta do Google foi vinculada com sucesso!');
        // Atualiza a sessão para refletir a alteração instantaneamente no frontend
        void useAuthStore.getState().hydrate();
      } else {
        const err = await res.json();
        toast.error(err.error?.message || 'Erro ao vincular conta do Google');
      }
    } catch (e) {
      toast.error('Erro de conexão ao vincular.');
    } finally {
      setLinking(false);
    }
  };

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

      {/* Google Link Integration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">🔗 Contas Vinculadas</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-center font-bold text-white text-xs select-none">
                G
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Acesso Simplificado via Google</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Faça login com um clique na plataforma usando sua conta federada.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sessionUser?.googleId ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full select-none">
                  <CheckCircle className="w-3.5 h-3.5" /> Conta Vinculada
                </div>
              ) : (
                <Button 
                  onClick={handleLinkGoogle} 
                  disabled={linking}
                  variant="outline" 
                  size="sm" 
                  className="text-xs font-semibold h-9 animate-pulse"
                >
                  {linking ? 'Vinculando...' : 'Vincular Conta Google'}
                </Button>
              )}
            </div>
          </div>
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

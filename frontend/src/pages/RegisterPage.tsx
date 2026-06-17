import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.png';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<'pf' | 'pj'>('pf');
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState<string | null>(null);

  const handleGoogleRegister = async (subId: string, emailPrefix: string, registerAs: 'company' | 'user') => {
    setGoogleLoading(subId);
    try {
      const mockCredential = `mock_google_${subId}_${emailPrefix}`;
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: mockCredential, registerAs }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('cp_user_json', JSON.stringify(data.data.user));
        
        toast.success(`Conta criada com sucesso! Bem-vindo, ${data.data.user.fullName}!`);
        
        await useAuthStore.getState().hydrate();
        
        if (registerAs === 'company') {
          navigate('/painel/assinatura');
        } else {
          navigate('/dashboard');
        }
      } else {
        const err = await res.json();
        toast.error(err.error?.message || 'Erro no cadastro via Google');
      }
    } catch (e) {
      toast.error('Erro de conexão ao servidor.');
    } finally {
      setGoogleLoading(null);
      setShowGoogleModal(false);
    }
  };

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (accountType === 'pf') {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate('/login'), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>

        <img src={logo} alt="Consultas PRO" className="h-10 w-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-1">Criar sua conta</h2>
        <p className="text-sm text-muted-foreground mb-8">Preencha os dados para começar a utilizar</p>

        {/* Account type toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-6">
          {[
            { value: 'pf' as const, label: 'Pessoa Física' },
            { value: 'pj' as const, label: 'Pessoa Jurídica' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setAccountType(opt.value); setForm(f => ({ ...f, document: '' })); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                accountType === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{accountType === 'pf' ? 'Nome Completo' : 'Razão Social'}</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="h-11" placeholder={accountType === 'pf' ? 'João da Silva' : 'Empresa LTDA'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required className="h-11" placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} required className="h-11" placeholder="(11) 99999-8888" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{accountType === 'pf' ? 'CPF' : 'CNPJ'}</Label>
            <Input value={form.document} onChange={(e) => setForm(f => ({ ...f, document: formatDocument(e.target.value) }))} required className="h-11" placeholder={accountType === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required className="h-11" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required className="h-11" placeholder="••••••••" />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-medium mt-2" disabled={loading}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>Criar Conta <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/75">
          <span className="h-px flex-1 bg-border" />
          <span>OU CADASTRE-SE COM</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          variant="outline"
          className="w-full h-11 border-border bg-transparent hover:bg-accent hover:text-accent-foreground text-sm font-semibold transition-all duration-300 mt-4"
        >
          <span className="text-red-500 font-extrabold mr-1.5 font-mono">G</span> Cadastrar com o Google
        </Button>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Já tem uma conta? <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
        </p>
      </motion.div>

      {/* Google Simulation Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#070b15] border border-white/[0.08] rounded-2xl p-6 relative shadow-2xl overflow-hidden text-slate-100"
            >
              <button 
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs p-1.5 hover:bg-white/5 rounded-lg transition"
              >
                ✕
              </button>

              <h3 className="text-base font-bold text-white mb-1">Simulação Google Cadastro</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Selecione o tipo de conta que deseja criar usando seu perfil do Google.</p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleGoogleRegister('sub_new_company', 'empresa.google', 'company')}
                  disabled={!!googleLoading}
                  className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                >
                  {googleLoading === 'sub_new_company' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400 flex-shrink-0" />
                  ) : (
                    <span className="font-bold text-violet-400 font-mono text-sm flex-shrink-0">G</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] truncate text-white">Empresa Premium (PJ)</p>
                    <p className="text-[9px] text-muted-foreground font-mono truncate">Simular cadastro de empresa (R$ 599,90/mês)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleRegister('sub_new_user', 'user.google', 'user')}
                  disabled={!!googleLoading}
                  className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                >
                  {googleLoading === 'sub_new_user' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />
                  ) : (
                    <span className="font-bold text-emerald-400 font-mono text-sm flex-shrink-0">G</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] truncate text-white">Individual Grátis (PF)</p>
                    <p className="text-[9px] text-muted-foreground font-mono truncate">Simular cadastro individual (Grátis, recargas avulsas)</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

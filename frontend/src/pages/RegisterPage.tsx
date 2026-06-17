import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Building, User } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<'pf' | 'pj'>('pf');
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Conta criada com sucesso! Faça login para continuar.");
      navigate('/login');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono relative overflow-hidden">
      <PublicHeader />
      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 flex flex-col justify-center items-center p-6 z-10 mt-20 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-surface/60 backdrop-blur-xl border border-hairline rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Criar sua conta</h1>
            <p className="text-xs text-muted-foreground">Preencha os dados para começar a utilizar a plataforma.</p>
          </div>

          <div className="flex rounded-lg border border-hairline overflow-hidden mb-6 bg-background">
            <button
              type="button"
              onClick={() => { setAccountType('pf'); setForm(f => ({ ...f, document: '' })); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${accountType === 'pf' ? 'bg-brand text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <User className="w-4 h-4" /> Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => { setAccountType('pj'); setForm(f => ({ ...f, document: '' })); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${accountType === 'pj' ? 'bg-brand text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <Building className="w-4 h-4" /> Pessoa Jurídica
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{accountType === 'pf' ? 'Nome Completo' : 'Razão Social'}</label>
              <input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">E-mail</label>
                <input type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Telefone</label>
                <input required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{accountType === 'pf' ? 'CPF' : 'CNPJ'}</label>
              <input required value={form.document} onChange={(e) => setForm(f => ({ ...f, document: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Senha</label>
                <input type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Confirmar Senha</label>
                <input type="password" required value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm focus:border-brand/50 outline-none" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-brand text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-brand/90 mt-4 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CRIAR CONTA <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Já tem uma conta? <Link to="/login" className="text-brand font-bold hover:underline">Fazer login</Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

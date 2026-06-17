import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const { login, hydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [hydrated, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Não foi possível entrar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-9 w-9 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono relative overflow-hidden">
      <PublicHeader />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      
      {/* Light aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 flex flex-col justify-center items-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-surface/60 backdrop-blur-xl border border-hairline rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Bem-vindo de volta</h1>
            <p className="text-xs text-muted-foreground">Acesse sua conta para gerenciar suas consultas.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              id="email" name="email" icon={<Mail className="h-4 w-4" />} label="E-mail Corporativo" type="email"
              value={email} onChange={setEmail} placeholder="voce@empresa.com.br" required
            />
            <Field
              id="password" name="password" icon={<Lock className="h-4 w-4" />} label="Senha" type="password"
              value={password} onChange={setPassword} placeholder="••••••••" required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                <input type="checkbox" className="rounded border-hairline bg-transparent" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Manter conectado
              </label>
              <Link to="/recuperar-acesso" className="text-brand hover:underline font-bold">Esqueci a senha</Link>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-brand text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "ENTRAR"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ainda não possui acesso? <Link to="/cadastro" className="text-brand font-bold hover:underline">Começar grátis</Link>
          </p>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}

function Field({ icon, label, type, value, onChange, placeholder, id, name, required }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="mt-2 relative flex items-center rounded-xl border border-hairline bg-background focus-within:border-brand/50 transition-colors">
        <span className="pl-4 text-muted-foreground">{icon}</span>
        <input
          id={id} name={name} type={inputType} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className="w-full bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

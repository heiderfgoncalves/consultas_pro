import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, sessionUser, accessToken, hydrate } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (sessionUser && !sessionUser.mustResetPassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, sessionUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/reset-password-forced', {
        method: 'POST',
        body: JSON.stringify({ password }),
        token: accessToken,
      });

      toast.success('Senha atualizada com sucesso!');
      await hydrate();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível redefinir a senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono relative overflow-hidden">
      <PublicHeader />

      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 flex flex-col justify-center items-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-surface/60 backdrop-blur-xl border border-hairline rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Defina sua senha</h1>
            <p className="text-xs text-muted-foreground">Por questões de segurança, defina uma nova senha para continuar o acesso.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              id="new-password" name="password" icon={<Lock className="h-4 w-4" />} label="Nova Senha" type="password"
              placeholder="Mínimo 6 caracteres" value={password} onChange={setPassword} required
            />
            <Field
              id="confirm-password" name="confirmPassword" icon={<Lock className="h-4 w-4" />} label="Confirmar Senha" type="password"
              placeholder="Repita a senha" value={confirmPassword} onChange={setConfirmPassword} required
            />

            <button
              type="submit" disabled={loading}
              className="w-full bg-brand text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "SALVAR E ENTRAR"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
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

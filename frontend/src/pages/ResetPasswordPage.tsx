import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import ThemeToggle from '@/components/ThemeToggle';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, sessionUser, accessToken, hydrate } = useAuthStore();

  // Se não estiver autenticado, manda para login.
  // Se estiver autenticado e não precisar resetar a senha, manda para o painel.
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
      
      // Re-hidrata a sessão para carregar o novo perfil com mustResetPassword = false
      await hydrate();
      
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível redefinir a senha';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground select-none">
      {/* Left - Branding / Security Info */}
      <div className="hidden min-h-screen lg:flex lg:w-1/2 bg-gradient-to-br from-brand to-brand/80 relative overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.03)]">
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect
            cover
            coverPosition="top-left"
            rows={13}
            cols={10}
            cellSize={60}
            masked={false}
            className="[--cell-border-color:hsl(var(--primary-foreground)_/_0.18)] [--cell-fill-color:hsl(var(--primary-foreground)_/_0.06)] [--cell-shadow-color:hsl(var(--primary-foreground)_/_0.12)]"
            gridClassName="opacity-50"
          />
        </div>
        <div className="absolute inset-0 z-[1] opacity-10 pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full items-center justify-center px-16 py-14 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex w-full max-w-[620px] flex-col gap-6"
          >
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-mono tracking-wider uppercase text-white backdrop-blur-[4px]">
              <ShieldAlert className="h-4 w-4" />
              <span>Primeiro Acesso Requerido</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Garanta a segurança da sua conta.
            </h1>

            <p className="text-lg text-primary-foreground/80 max-w-md leading-relaxed font-light">
              Sua conta foi criada com uma senha temporária. Para continuar acessando os relatórios de crédito e consultas exclusivas, crie uma senha forte e pessoal de sua preferência.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right - Form (HUD Minimalist Card) */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-12 bg-transparent">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_20%,var(--color-brand),transparent_40%)] opacity-5 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[430px]"
        >
          {/* HUD Styled Container Card */}
          <div className="bg-surface/70 dark:bg-[#070b15]/55 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden">
            
            {/* Theme Toggle no topo direito */}
            <div className="absolute top-6 right-6 z-20">
              <ThemeToggle />
            </div>

            <div className="mb-8 flex flex-col items-center text-center">
              <img
                src="/logo.png"
                alt="Consultas PRO"
                className="mb-3.5 h-20 w-auto object-contain sm:h-22"
              />
              <div className="flex items-center gap-1.5 justify-center mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[11px] font-mono text-muted-foreground tracking-[0.12em] uppercase">
                  Ativação de Primeiro Acesso
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-surface/50 border border-hairline text-sm text-muted-foreground leading-relaxed">
              Olá, <span className="text-foreground font-semibold">{sessionUser?.fullName || 'Usuário'}</span>. Por questões de segurança corporativa, defina uma nova senha de acesso antes de continuar.
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                id="new-password"
                name="password"
                icon={<Lock className="h-4 w-4" />}
                label="Nova Senha"
                type="password"
                placeholder="No mínimo 6 caracteres"
                value={password}
                onChange={setPassword}
                required
              />

              <Field
                id="confirm-password"
                name="confirmPassword"
                icon={<Lock className="h-4 w-4" />}
                label="Confirmar Nova Senha"
                type="password"
                placeholder="Repita a senha para confirmar"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
              />

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-brand text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand/90 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/20"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ativar Conta & Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  id,
  name,
  required = true,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">
        <FieldInput
          id={id}
          name={name}
          icon={icon}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </label>
  );
}

function FieldInput({
  icon,
  type,
  value,
  onChange,
  placeholder,
  id,
  name,
  required = true,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="group relative flex items-center rounded-xl border border-hairline bg-surface/20 hover:bg-surface/40 transition-all duration-300 focus-within:border-brand/50 focus-within:bg-surface/50 focus-within:ring-4 focus-within:ring-brand/5">
      <span className="pl-3.5 text-muted-foreground group-focus-within:text-brand transition-colors">{icon}</span>
      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-transparent pl-3 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0"
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md focus:outline-none"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

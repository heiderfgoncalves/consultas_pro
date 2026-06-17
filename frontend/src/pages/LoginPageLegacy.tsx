import { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { HeroTypewriterHeading } from '@/components/branding/HeroTypewriterHeading';
import { getHeroTypewriterCursorStartMs } from '@/lib/hero-typewriter';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { PointerHighlight } from '@/components/ui/pointer-highlight';
import { useTheme } from '@/hooks/use-theme';

export default function LoginPageLegacy() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, hydrated, isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Força o tema claro ao montar e restaura o original ao desmontar
  useEffect(() => {
    const prevTheme = theme;
    setTheme('light');
    return () => {
      if (prevTheme) {
        setTheme(prevTheme);
      }
    };
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div
          className="h-9 w-9 rounded-full border-2 border-slate-300 border-t-primary animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50/50 select-none">
      {/* Left - Branding */}
      <div className="hidden min-h-screen lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.03)]">
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
            className="flex w-full max-w-[620px] flex-col"
          >
            <HeroTypewriterHeading className="text-4xl font-bold text-primary-foreground leading-tight mb-4" />
            <div className="flex flex-col gap-5">
              <div className="text-lg text-primary-foreground/75 max-w-md leading-relaxed font-light">
                Monte seu relatório{" "}
                <PointerHighlight
                  effectDelaySec={getHeroTypewriterCursorStartMs() / 1000}
                  rectangleClassName="border-primary-foreground/40"
                  pointerClassName="text-primary-foreground"
                >
                  <span className="relative z-[1] font-medium text-white">personalizado</span>
                </PointerHighlight>
                , escolha os blocos de dados que precisa e pague apenas pelo que usar.
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-2.5"
              >
                {['SPC', 'Serasa', 'Score', 'Bacen', '+8'].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-center text-xs font-mono tracking-wider uppercase text-white/95 backdrop-blur-[4px] hover:bg-white/15 transition-colors"
                  >
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right - Form (HUD Minimalist Card) */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-12">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,112,243,0.03),transparent_40%)] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[430px]"
        >
          {/* HUD Styled Container Card */}
          <div className="bg-white border border-slate-100/90 rounded-2xl p-8 md:p-10 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.06)]">
            <div className="mb-8 flex flex-col items-center text-center">
              <img
                src="/logo.png"
                alt="Consultas PRO"
                className="mb-3.5 h-20 w-auto object-contain sm:h-22"
              />
              <p className="text-[12px] font-mono text-slate-400 tracking-[0.15em] uppercase">
                Acesse sua conta para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                id="email"
                name="email"
                icon={<Mail className="h-4 w-4" />}
                label="E-mail"
                type="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={setEmail}
                autocomplete="email"
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-400">
                    Senha
                  </span>
                  <Link to="/recuperar-acesso" className="text-[11px] text-primary/90 hover:text-primary hover:underline font-mono">
                    Esqueci minha senha
                  </Link>
                </div>
                
                <FieldInput
                  id="password"
                  name="password"
                  icon={<Lock className="h-4 w-4" />}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  autocomplete="current-password"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1 select-none cursor-pointer">
                <input 
                  id="remember" 
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-200 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-[12px] text-slate-500 cursor-pointer">
                  Lembrar meu acesso neste dispositivo
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20" 
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar na plataforma</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-sm text-center text-slate-500 mt-8">
              Ainda não tem conta corporativa?{' '}
              <Link to="/cadastro" className="text-primary font-medium hover:underline">
                Falar com vendas
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link 
              to="/login?v=2" 
              className="text-[10px] font-mono tracking-wider text-slate-400 hover:text-primary transition-colors uppercase hover:underline cursor-target"
            >
              ◆ Experimentar Interface Cyberpunk ◆
            </Link>
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
  autocomplete,
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
  autocomplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-400">
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
          autocomplete={autocomplete}
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
  autocomplete,
  required = true,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  autocomplete?: string;
  required?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="group relative flex items-center rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 transition-all duration-300 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5">
      <span className="pl-3.5 text-slate-400 group-focus-within:text-primary transition-colors">{icon}</span>
      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autocomplete}
        required={required}
        className="w-full bg-transparent pl-3 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400/60 outline-none border-none focus:ring-0"
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-md focus:outline-none"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? (
            <EyeOff className="h-4.5 w-4.5" />
          ) : (
            <Eye className="h-4.5 w-4.5" />
          )}
        </button>
      )}
    </div>
  );
}

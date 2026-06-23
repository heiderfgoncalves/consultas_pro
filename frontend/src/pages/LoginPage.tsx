import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { BackgroundFX } from '@/components/layout/BackgroundFX';
import { PulseDot } from '@/components/ui/primitives';
import { PageTransition } from '@/components/layout/PageTransition';
import { useSubTheme } from '@/hooks/use-subtheme';
import ThemeToggle from '@/components/ThemeToggle';
import Particles from '@/components/ui/Particles';
import { useTheme } from '@/hooks/use-theme';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import LoginPageLegacy from "./LoginPageLegacy";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const version = searchParams.get('v');

  if (version !== '2') {
    return <LoginPageLegacy />;
  }

  const { subTheme } = useSubTheme(); // Inicializa o tema salvo
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  // Mapeamento dinâmico de cores de acordo com o subtema ativo
  const themeColors: Record<string, string> = {
    classic: "#0070f3",
    cyberpunk: "#a855f7",
    oceanic: "#0d9488",
    emerald: "#10b981",
    minimal: "#a1a1aa",
  };

  const themeColor = themeColors[subTheme] || "#0070f3";

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, hydrated, isAuthenticated } = useAuthStore();

  const handleGoogleLogin = async (subId: string, emailPrefix: string, registerAs?: 'company' | 'user') => {
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
        // Salva na autenticação local do app
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('cp_user_json', JSON.stringify(data.data.user));
        
        toast.success(`Bem-vindo, ${data.data.user.fullName}!`);
        
        // Sincroniza a store global instantaneamente
        await useAuthStore.getState().hydrate();
        navigate('/dashboard');
      } else {
        const err = await res.json();
        toast.error(err.error?.message || 'Erro no login via Google');
      }
    } catch (e) {
      toast.error('Erro de conexão ao servidor.');
    } finally {
      setGoogleLoading(null);
      setShowGoogleModal(false);
    }
  };

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
        <div
          className="h-9 w-9 rounded-full border-2 border-muted-foreground/25 border-t-primary animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen text-foreground relative isolate overflow-hidden flex flex-col md:flex-row bg-background">
      {/* Partículas flutuantes ocupando todo o fundo da página de login */}
      <Particles
        particleColors={isDark ? [themeColor] : ["#cccccc"]}
        particleCount={isDark ? 140 : 40}
        particleSpread={isDark ? 9 : 6}
        speed={isDark ? 0.12 : 0.05}
        particleBaseSize={isDark ? 85 : 45}
        moveParticlesOnHover={true}
        particleHoverFactor={0.8}
        alphaParticles={true}
        disableRotation={false}
        className="absolute inset-0 pointer-events-none -z-10 opacity-30 dark:opacity-100"
      />

      {/* BackgroundFX global por trás de toda a tela */}
      <BackgroundFX />

      {/* Divisor "Pipe" Discreto e Elegante */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-3/5 bg-gradient-to-b from-transparent via-hairline/50 dark:via-hairline/25 to-transparent z-10 pointer-events-none" />

      {/* Lado Esquerdo - Painel Institucional Premium */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-14 md:p-16 overflow-hidden md:h-screen select-none bg-[radial-gradient(circle_at_top_left,rgba(var(--color-brand-rgb),0.12),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(var(--color-brand-rgb),0.03),transparent_60%)] bg-slate-50 dark:bg-[#181818]">
        {/* Background Ripple interativo do design antigo */}
        <div className="absolute inset-0 z-0 opacity-40 dark:opacity-60 pointer-events-auto">
          <BackgroundRippleEffect
            cover
            coverPosition="top-left"
            rows={13}
            cols={10}
            cellSize={60}
            masked={false}
            className="[--cell-border-color:rgba(0,0,0,0.04)] dark:[--cell-border-color:rgba(255,255,255,0.06)] [--cell-fill-color:rgba(0,0,0,0.01)] dark:[--cell-fill-color:rgba(255,255,255,0.012)] [--cell-shadow-color:transparent]"
            gridClassName="opacity-60 dark:opacity-50"
          />
        </div>

        {/* Glows circulares de background do design antigo */}
        <div className="absolute inset-0 z-[1] opacity-30 dark:opacity-40 pointer-events-none">
          <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-brand/20 dark:bg-brand/15 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-brand/10 dark:bg-brand/10 blur-3xl" />
        </div>
        
        {/* Topo da coluna esquerda (Brand / Logo) */}
        <Link
          to="/"
          className="relative z-10 inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand text-[10px]">
            ◆
          </span>
          <span className="text-foreground">CONSULTAS</span>
          <span className="text-brand">_PRO</span>
        </Link>

        {/* Centro da coluna esquerda (Mensagem de Impacto Premium do Print Antigo no Estilo Moderno) */}
        <div className="relative z-10 my-auto max-w-[460px] space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-medium tracking-[-0.03em] leading-[1.15] text-foreground"
          >
            Consultas de crédito <span className="brand-text">inteligentes</span> e modulares.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base text-muted-foreground leading-relaxed"
          >
            Monte seu relatório personalizado, escolha os blocos de dados que precisa e pague apenas pelo que usar.
          </motion.p>

          {/* Tags em pílulas transparentes modernas (Do Print Antigo) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            {['SPC', 'Serasa', 'Score', 'Bacen', '+8'].map((tag, i) => (
              <span 
                key={i} 
                className="rounded-full border border-brand/35 bg-brand/10 px-3.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-brand"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Rodapé da coluna esquerda */}
        <div className="relative z-10 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          © {new Date().getFullYear()} Consultas PRO // Inteligência de Crédito
        </div>
      </div>

      {/* Lado Direito - Formulário de Login (HUD Frame com Alternador de Tema) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative min-h-screen md:h-screen overflow-hidden bg-transparent">
        <PageTransition>
          <div className="w-full max-w-[420px] my-auto mx-auto relative z-10">
            {/* Brand visível apenas em mobile */}
            <div className="md:hidden mb-8 flex justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.18em] uppercase text-muted-foreground"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand text-[10px]">
                  ◆
                </span>
                <span className="text-foreground">CONSULTAS</span>
                <span className="text-brand">_PRO</span>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-3xl p-8 md:p-10 bg-white/70 dark:bg-[#070b15]/55 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Brilho radial de fundo sutil na cor da marca (brand) */}
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,var(--color-brand)_0%,transparent_70%)] opacity-10 dark:opacity-15 blur-3xl pointer-events-none -z-10" />

              {/* Botão de Tema no Canto Superior Direito */}
              <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
                <PulseDot />
                <span>ACESSO SEGURO</span>
              </div>

              <h1 className="mt-4 text-3xl font-medium tracking-[-0.025em]">
                Entrar na <span className="brand-text">plataforma</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use suas credenciais corporativas para continuar.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <Field
                  id="email"
                  name="email"
                  icon={<Mail className="h-4 w-4" />}
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="voce@empresa.com.br"
                  autocomplete="username"
                  required
                />
                <Field
                  id="current-password"
                  name="password"
                  icon={<Lock className="h-4 w-4" />}
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                />

                <div className="flex items-center justify-between text-[12px]">
                  <label className="inline-flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="h-3.5 w-3.5 rounded border-hairline accent-[var(--color-brand)] focus:ring-0 cursor-pointer"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Manter conectado
                  </label>
                  <Link to="/recuperar-acesso" className="text-brand hover:text-brand/85 transition-colors font-medium hover:underline">
                    Esqueci a senha
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/25 dark:shadow-brand/20 dark:hover:shadow-brand/35 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : "Entrar"}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/75">
                <span className="h-px flex-1 bg-hairline/60" />
                <span>OU ACESSO DIRETO</span>
                <span className="h-px flex-1 bg-hairline/60" />
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hairline/60 bg-surface/10 dark:bg-surface/25 px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface/30 dark:hover:bg-surface/40 hover:border-hairline/85 backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
              >
                <span className="text-red-500 font-extrabold mr-1 font-mono">G</span> Entrar com o Google
              </button>
            </motion.div>

            {/* Google Simulation Modal */}
            <AnimatePresence>
              {showGoogleModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-[#070b15] border border-white/[0.08] rounded-2xl p-6 relative shadow-2xl overflow-hidden"
                  >
                    <button 
                      onClick={() => setShowGoogleModal(false)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs p-1.5 hover:bg-white/5 rounded-lg transition"
                    >
                      ✕
                    </button>

                    <h3 className="text-base font-bold text-white mb-1">Simulação Google Login</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Escolha uma conta do Google para simular a autenticação integrada.</p>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleGoogleLogin('sub_admin_master', 'admin.consultas.pro')}
                        disabled={!!googleLoading}
                        className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                      >
                        {googleLoading === 'sub_admin_master' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <span className="font-bold text-red-500 font-mono text-sm flex-shrink-0">G</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] truncate">Master (admin@consultas.pro)</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">Simular Admin Master</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoogleLogin('sub_standalone_operator', 'carlos.operador')}
                        disabled={!!googleLoading}
                        className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                      >
                        {googleLoading === 'sub_standalone_operator' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <span className="font-bold text-blue-400 font-mono text-sm flex-shrink-0">G</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] truncate">Carlos (Operador Individual)</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">Simular Individual Grátis</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoogleLogin('sub_company_admin', 'novas.consultas', 'company')}
                        disabled={!!googleLoading}
                        className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                      >
                        {googleLoading === 'sub_company_admin' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <span className="font-bold text-violet-400 font-mono text-sm flex-shrink-0">G</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] truncate">Criar Nova Empresa (Premium)</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">Cadastro Empresa Premium (R$ 599,90)</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoogleLogin('sub_new_user', 'ana.carla', 'user')}
                        disabled={!!googleLoading}
                        className="w-full text-left py-2.5 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 transition flex items-center gap-3 bg-white/[0.02] text-xs text-white font-semibold disabled:opacity-50"
                      >
                        {googleLoading === 'sub_new_user' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <span className="font-bold text-emerald-400 font-mono text-sm flex-shrink-0">G</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] truncate">Criar Nova Conta Individual</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">Cadastro Individual Grátis</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-brand hover:underline">
                Falar com vendas
              </Link>
            </p>

            <div className="mt-4 text-center flex flex-col gap-2">
              <Link 
                to="/?bypass=true" 
                className="text-[11px] font-mono tracking-wider text-muted-foreground hover:text-brand transition-colors uppercase hover:underline cursor-target"
              >
                ← Voltar para a Landing Page
              </Link>
              <Link 
                to="/login" 
                className="text-[10px] font-mono tracking-wider text-brand/70 hover:text-brand transition-colors uppercase hover:underline cursor-target mt-1"
              >
                ◆ Usar o Login Clássico Principal ◆
              </Link>
            </div>
          </div>
        </PageTransition>
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/80">
        {label}
      </span>
      <div className="mt-2 group relative flex items-center rounded-xl border border-hairline bg-surface/20 dark:bg-surface/30 backdrop-blur-md transition-all duration-300 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
        <span className="pl-3.5 text-muted-foreground group-focus-within:text-brand transition-colors">{icon}</span>
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autocomplete}
          required={required}
          className="w-full bg-transparent pl-3 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/45 outline-none border-none focus:ring-0"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20"
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
    </label>
  );
}

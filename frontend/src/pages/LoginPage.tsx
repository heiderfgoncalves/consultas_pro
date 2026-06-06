import { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { BackgroundFX } from '@/components/layout/BackgroundFX';
import { PulseDot } from '@/components/ui/primitives';
import { PageTransition } from '@/components/layout/PageTransition';
import { useSubTheme } from '@/hooks/use-subtheme';
import ThemeToggle from '@/components/ThemeToggle';
import Particles from '@/components/ui/Particles';
import LaserFlow from '@/components/ui/LaserFlow';
import { useTheme } from '@/hooks/use-theme';

export default function LoginPage() {
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
        particleColors={[themeColor]}
        particleCount={140}
        particleSpread={9}
        speed={0.12}
        particleBaseSize={85}
        moveParticlesOnHover={true}
        particleHoverFactor={0.8}
        alphaParticles={true}
        disableRotation={false}
        className="absolute inset-0 pointer-events-none -z-10"
      />

      {/* LaserFlow dividindo exatamente os 2 lados da tela de login */}
      <LaserFlow
        horizontalBeamOffset={0.0}
        verticalBeamOffset={-0.5}
        verticalSizing={12.0}
        color={themeColor}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* BackgroundFX global por trás de toda a tela */}
      <BackgroundFX />

      {/* Lado Esquerdo - Painel Institucional Premium */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 overflow-hidden md:h-screen select-none bg-transparent">
        
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="hud-frame hud-corners relative rounded-none p-8 bg-[color-mix(in_srgb,var(--brand)_8%,rgba(5,7,12,0.35))] backdrop-blur-md border border-brand/20 shadow-2xl"
            >
              <span className="hud-tl" />
              <span className="hud-tr" />
              <span className="hud-bl" />
              <span className="hud-br" />

              {/* Botão de Tema no Canto Superior Direito */}
              <div className="absolute top-4 right-4 z-50">
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

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="voce@empresa.com.br"
                />
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between text-[12px]">
                  <label className="inline-flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="h-3 w-3 accent-[var(--color-brand)]"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Manter conectado
                  </label>
                  <Link to="/recuperar-acesso" className="text-brand hover:underline">
                    Esqueci a senha
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_36px_-8px_var(--color-brand)] hover:shadow-[0_0_48px_-4px_var(--color-brand)] transition-shadow disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : "Entrar"}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-[11px] font-mono tracking-[0.18em] uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-hairline" />
                <span>OU</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>

              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface/60 px-4 py-2.5 text-sm text-foreground hover:bg-surface backdrop-blur transition-colors"
              >
                Acessar via SSO corporativo
              </button>
            </motion.div>

            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-brand hover:underline">
                Falar com vendas
              </Link>
            </p>
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
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 group relative flex items-center rounded-md border border-hairline bg-surface/40 backdrop-blur transition-colors focus-within:border-brand/60 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand)_18%,transparent)]">
        <span className="pl-3 text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border-none focus:ring-0"
        />
      </div>
    </label>
  );
}

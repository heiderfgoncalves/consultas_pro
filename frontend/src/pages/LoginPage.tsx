import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { HeroTypewriterHeading, getHeroTypewriterCursorStartMs } from '@/components/branding/HeroTypewriterHeading';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { PointerHighlight } from '@/components/ui/pointer-highlight';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

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

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden min-h-screen lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
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
              <div className="text-lg text-primary-foreground/70 max-w-md leading-relaxed">
                Monte seu relatório{" "}
                <PointerHighlight
                  effectDelaySec={getHeroTypewriterCursorStartMs() / 1000}
                  rectangleClassName="border-primary-foreground/40"
                  pointerClassName="text-primary-foreground"
                >
                  <span className="relative z-[1] font-medium text-primary-foreground/90">personalizado</span>
                </PointerHighlight>
                , escolha os blocos de dados que precisa e pague apenas pelo que usar.
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-3"
              >
                {['SPC', 'Serasa', 'Score', 'Bacen', '+8'].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-1.5 text-center text-sm text-primary-foreground/70 backdrop-blur-[2px]"
                  >
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="/logo.png"
              alt="Consultas PRO"
              className="mb-3 h-24 w-auto object-contain sm:h-28"
            />
            <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                spellCheck={false}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link to="/recuperar-acesso" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={showPassword ? 'current-password' : 'current-password'}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-[color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Lembrar meu acesso
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-medium" disabled={loading}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-8">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="text-primary font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

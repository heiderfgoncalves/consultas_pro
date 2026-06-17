import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Inicializando Consultas PRO...
          </span>
        </div>
      </div>
    );
  }

  const forceLanding = searchParams.get("bypass") === "true" || searchParams.get("landing") === "true";

  if (isAuthenticated && !forceLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono relative overflow-hidden">
      <PublicHeader />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-brand/10 blur-[120px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 z-10 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-bold uppercase tracking-widest text-brand mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> 
            Plataforma Inteligente de Crédito
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[1.1]">
            Consultas precisas.<br/>
            <span className="brand-text">Gestão unificada.</span>
          </h1>
          
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            A solução de alto padrão React para bureau de crédito. Templates bonitos, informações online, seguras, fiéis e revisadas. Tudo em um painel com transições suaves e design premium.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-14 px-8 bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-sm"
              onClick={() => navigate('/cadastro')}
            >
              CRIAR CONTA GRÁTIS <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto h-14 px-8 border-border hover:bg-accent font-bold text-sm"
              onClick={() => navigate('/planos')}
            >
              VER PLANOS
            </Button>
          </div>
        </motion.div>

        {/* Features minimalistas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-5xl"
        >
          <div className="bg-surface/40 backdrop-blur-sm border border-hairline p-8 rounded-2xl text-left space-y-4 hover:border-brand/30 transition-colors">
            <ShieldCheck className="w-8 h-8 text-brand" />
            <h3 className="text-lg font-bold">Segurança e Fidelidade</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Informações 100% online, revisadas e criptografadas para garantir precisão e segurança na sua tomada de decisão.</p>
          </div>
          <div className="bg-surface/40 backdrop-blur-sm border border-hairline p-8 rounded-2xl text-left space-y-4 hover:border-brand/30 transition-colors">
            <BarChart3 className="w-8 h-8 text-brand" />
            <h3 className="text-lg font-bold">Gráficos e Gestão</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Dashboard com gráficos interativos e gestão de saldo unificada para total controle das suas operações.</p>
          </div>
          <div className="bg-surface/40 backdrop-blur-sm border border-hairline p-8 rounded-2xl text-left space-y-4 hover:border-brand/30 transition-colors">
            <Zap className="w-8 h-8 text-brand" />
            <h3 className="text-lg font-bold">Templates Premium</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Dossiês e resultados apresentados nos templates mais bonitos e legíveis do mercado.</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

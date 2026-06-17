import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Lock, FileText, BarChart3, Database } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start overflow-x-hidden relative font-mono">
      <PublicHeader />

      {/* Grid de fundo opaco */}
      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[350px] bg-brand/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <main className="w-full max-w-7xl mx-auto px-6 pt-32 pb-24 z-10 flex-1 relative">
        <section className="text-center max-w-3xl mx-auto mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight mb-6"
          >
            Sobre a <span className="brand-text">Consultas PRO</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm md:text-base leading-relaxed"
          >
            Nossa missão é democratizar o acesso a dados de crédito e cadastrais de forma segura, confiável e altamente escalável para empresas e indivíduos.
          </motion.p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dados revisados, informação online e segura.</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Trabalhamos com uma infraestrutura robusta, validando e cruzando dados em tempo real. Oferecemos uma plataforma unificada que atende desde pequenas operações até grandes bureaus e integrações corporativas.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Todo o desenvolvimento é feito em alto padrão React, garantindo não apenas beleza, mas performance e segurança em todas as transações, consultas e gerenciamento de saldos.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-surface/30 backdrop-blur-md p-6 rounded-2xl border border-hairline flex flex-col items-center justify-center text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-brand" />
              <span className="font-bold text-sm">100% Seguro</span>
            </div>
            <div className="bg-surface/30 backdrop-blur-md p-6 rounded-2xl border border-hairline flex flex-col items-center justify-center text-center space-y-3">
              <Database className="w-8 h-8 text-brand" />
              <span className="font-bold text-sm">Alta Disponibilidade</span>
            </div>
            <div className="bg-surface/30 backdrop-blur-md p-6 rounded-2xl border border-hairline flex flex-col items-center justify-center text-center space-y-3">
              <BarChart3 className="w-8 h-8 text-brand" />
              <span className="font-bold text-sm">Painéis Gráficos</span>
            </div>
            <div className="bg-surface/30 backdrop-blur-md p-6 rounded-2xl border border-hairline flex flex-col items-center justify-center text-center space-y-3">
              <FileText className="w-8 h-8 text-brand" />
              <span className="font-bold text-sm">Dossiês Premium</span>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight, 
  Zap, 
  Check, 
  Sparkles, 
  Lock, 
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";

// Provedores populares para simulação
const popularQueries = [
  { label: "CPF Limpo (Simulado)", value: "542.819.330-10", type: "clean-cpf" },
  { label: "CNPJ Ativo (Simulado)", value: "14.281.990/0001-44", type: "active-cnpj" },
  { label: "Restrição Bacen", value: "819.224.310-88", type: "bacen-alert" },
  { label: "Pendência SPC", value: "310.442.890-55", type: "spc-alert" }
];

export function MobileLanding() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simType, setSimType] = useState("clean-cpf");
  const [showResults, setShowResults] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenOpenFaq] = useState<number | null>(null);

  // Efeito de Simulação com delays controlados
  useEffect(() => {
    if (!isSimulating) return;
    
    setSimStep(0);
    setShowResults(false);

    const timers = [
      setTimeout(() => setSimStep(1), 800),
      setTimeout(() => setSimStep(2), 1800),
      setTimeout(() => setSimStep(3), 2800),
      setTimeout(() => setSimStep(4), 3800),
      setTimeout(() => {
        setSimStep(5);
        setShowResults(true);
      }, 4800)
    ];

    return () => timers.forEach(clearTimeout);
  }, [isSimulating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    // Define um tipo com base no conteúdo para tornar a simulação dinâmica
    if (searchValue.includes("/") || searchValue.length > 14) {
      setSimType("active-cnpj");
    } else if (searchValue.includes("819") || searchValue.includes("9")) {
      setSimType("bacen-alert");
    } else if (searchValue.includes("310") || searchValue.includes("5")) {
      setSimType("spc-alert");
    } else {
      setSimType("clean-cpf");
    }
    
    setIsSimulating(true);
  };

  const handlePopularClick = (query: typeof popularQueries[0]) => {
    setSearchValue(query.value);
    setSimType(query.type);
    setIsSimulating(true);
  };

  return (
    <div className="bg-background text-foreground flex flex-col justify-start min-h-screen overflow-x-hidden relative font-sans">
      <PublicHeader />

      {/* Grid de fundo decorativo */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.10] pointer-events-none z-0" />
      
      {/* Glow de Destaque no Topo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-[300px] bg-brand/5 blur-[90px] rounded-full pointer-events-none z-0 animate-pulse" />

      <main className="w-full max-w-7xl mx-auto px-4 pt-28 pb-20 z-10 flex-1 relative space-y-16">
        
        {/* ================= HERO SECTION ================= */}
        <section className="flex flex-col items-center text-center space-y-6 pt-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-brand"
          >
            <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: "5s" }} /> 
            Consultas de Crédito B2B em tempo real
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-foreground px-1"
          >
            Decisões inteligentes. <br />
            <span className="brand-text italic font-serif font-normal">Dados estruturados.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xs md:text-sm max-w-md leading-relaxed px-2"
          >
            Acesse dados do SPC, Serasa, Bacen e Judiciário de forma modular, rápida e 100% online.
          </motion.p>

          {/* Input de Busca Interativo / Caixa de Consulta */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-md px-1"
          >
            <form onSubmit={handleSearchSubmit} className="relative flex flex-col p-1.5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg focus-within:border-brand/50 transition-all duration-300 gap-1.5">
              <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder="Digite o CPF ou CNPJ..." 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand text-primary-foreground font-mono font-bold text-xs py-3 rounded-xl hover:bg-brand/90 transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                Consultar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Botões rápidos abaixo da busca */}
            <div className="mt-4 flex flex-wrap gap-1.5 items-center justify-center">
              {popularQueries.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handlePopularClick(q)}
                  className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-surface border border-hairline hover:border-brand/40 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Imagem do Mockup do Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl border border-border bg-card/40 backdrop-blur-md overflow-hidden shadow-xl p-1.5 mt-4"
          >
            <img 
              src="/assets/hero_dashboard.png" 
              alt="Consultas PRO Dashboard Ilustração" 
              className="w-full h-full object-cover rounded-xl brightness-95"
            />
          </motion.div>
        </section>

        {/* ================= BANNER DE ESTATÍSTICAS ================= */}
        <section className="grid grid-cols-2 gap-4 border-y border-border/50 py-6 bg-surface/10 backdrop-blur-sm px-4 rounded-xl">
          <div className="text-center p-2">
            <h3 className="text-2xl font-black text-brand">15M+</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Consultas</p>
          </div>
          <div className="text-center p-2 border-l border-border/50">
            <h3 className="text-2xl font-black text-brand">40+</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Bureaus</p>
          </div>
          <div className="text-center p-2 border-t border-border/50 pt-4">
            <h3 className="text-2xl font-black text-brand">99.9%</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Precisão</p>
          </div>
          <div className="text-center p-2 border-l border-t border-border/50 pt-4">
            <h3 className="text-2xl font-black text-brand">4.9★</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Avaliação B2B</p>
          </div>
        </section>

        {/* ================= CORE PILLARS SECTION ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="mono text-[9px] tracking-[0.2em] text-brand uppercase font-bold">◆ Diferenciais ◆</span>
            <h2 className="text-2xl font-black tracking-tight">Vantagens Exclusivas</h2>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto">
              Desenvolvido com o mais alto padrão em React, unindo performance, beleza e total segurança de saldos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: BarChart3,
                title: "Gráficos e BI Avançados",
                desc: "Históricos de buscas, análise de inadimplência média por lote de CPFs e comportamento de score de forma visual."
              },
              {
                icon: Users,
                title: "Gestão de Saldo Unificada",
                desc: "Adicione colaboradores, operadores e filiais na mesma carteira de saldo e distribua limites com total governança."
              },
              {
                icon: TrendingUp,
                title: "Templates de Alto Padrão",
                desc: "Relatórios legíveis, organizados e fáceis de exportar para PDF com um design premium que valoriza o seu negócio."
              },
              {
                icon: ShieldCheck,
                title: "Informação Fiel e Revisada",
                desc: "Conexões oficiais criptografadas diretas aos principais bureaus de proteção ao crédito nacional com conformidade LGPD."
              }
            ].map((p, idx) => {
              const Icon = p.icon;
              return (
                <div key={idx} className="bg-card/40 backdrop-blur-md p-5 rounded-xl border border-border flex flex-col space-y-3 shadow-sm text-left">
                  <div className="p-2 bg-brand/10 text-brand border border-brand/20 rounded-lg w-fit">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{p.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= SERVICES/CATEGORIES GRID ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="mono text-[9px] tracking-[0.2em] text-brand uppercase font-bold">◆ Consultas ◆</span>
            <h2 className="text-2xl font-black tracking-tight">Nossos Módulos</h2>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto">
              Selecione apenas as tabelas que importam para o seu negócio e pague apenas pelo que consultar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { title: "Análise de Crédito & Score", desc: "Pendências comerciais, restrições bancárias, protestos nacionais e Score de Crédito consolidado oficial." },
              { title: "Localização & Cadastral", desc: "Situação na Receita Federal, histórico de endereços revisados, telefones ativos e vínculos familiares." },
              { title: "Bacen & Dívida Ativa", desc: "Verificação de restrições do Banco Central, processos judiciais ativos e débitos junto à União." }
            ].map((cat, idx) => (
              <div key={idx} className="bg-card/30 backdrop-blur-md rounded-xl border border-border p-5 flex flex-col justify-between items-start text-left space-y-3">
                <span className="font-mono text-[8px] bg-brand/15 text-brand border border-brand/20 font-bold px-2 py-0.5 rounded-full">MODULAR</span>
                <h4 className="font-bold text-sm text-foreground">{cat.title}</h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{cat.desc}</p>
                <Link to="/cadastro" className="text-[11px] font-mono font-bold text-brand hover:underline inline-flex items-center gap-1 mt-1">
                  Ver módulo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ================= DETAILED REPORT SHOWCASE ================= */}
        <section className="py-8 rounded-2xl bg-surface/5 border border-border px-5 flex flex-col space-y-6 items-center relative overflow-hidden">
          <div className="text-left space-y-3 relative z-10 w-full">
            <span className="mono text-[9px] tracking-[0.2em] text-brand uppercase font-bold">◆ Dossier Engine ◆</span>
            <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight">Dossiês modulares com layout premium</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              O construtor modular permite selecionar apenas os blocos que você quer pagar e emiti-los com saldo em carteira.
            </p>

            <ul className="space-y-2.5 font-mono text-[10px] text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                <span>Exportação para PDF com design impecável</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                <span>Integração White-Label simples com sua marca</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                <span>Armazenamento em histórico criptografado seguro</span>
              </li>
            </ul>
          </div>

          {/* Imagem */}
          <div className="relative w-full max-w-[240px] aspect-[4/5] rounded-2xl border border-border bg-card/60 overflow-hidden shadow-lg p-1">
            <img 
              src="/assets/credit_report.png" 
              alt="Credit Report Mockup" 
              className="w-full h-full object-cover rounded-xl brightness-95"
            />
          </div>
        </section>

        {/* ================= FAQ ACCORDION SECTION ================= */}
        <section className="space-y-6 max-w-md mx-auto">
          <div className="text-center space-y-2">
            <span className="mono text-[9px] tracking-[0.2em] text-brand uppercase font-bold">◆ FAQ ◆</span>
            <h2 className="text-2xl font-black tracking-tight">Dúvidas Frequentes</h2>
          </div>

          <div className="space-y-3 text-left">
            {[
              {
                q: "Como funciona o sistema de recargas?",
                a: "Na Consultas PRO você não fica preso a assinaturas obrigatórias. Você simplesmente faz uma recarga via Pix ou cartão do valor que desejar, e esse saldo fica disponível em carteira para você consumir realizando consultas conforme sua necessidade."
              },
              {
                q: "A plataforma está em conformidade com a LGPD?",
                a: "Sim, 100%. Todos os dados consultados são provenientes de fontes e bureaus oficiais com finalidade específica autorizada por lei, como proteção ao crédito, prevenção de fraudes e compliance."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="rounded-xl border border-border bg-card/35 backdrop-blur-md overflow-hidden transition-all duration-300"
                >
                  <button 
                    onClick={() => setOpenOpenFaq(isOpen ? null : idx)}
                    className="w-full px-4 py-4 flex items-center justify-between font-bold text-xs text-foreground focus:outline-none text-left cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`p-1 bg-brand/10 text-brand rounded border border-brand/20 flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= FINAL CTA SECTION ================= */}
        <section className="rounded-2xl border border-brand/25 bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-rgb),0.05),transparent_40%),linear-gradient(180deg,rgba(15,18,25,0.4),rgba(10,12,17,0.8))] p-6 text-center relative overflow-hidden shadow-lg">
          <div className="flex flex-col items-center space-y-4 relative z-10">
            <div className="p-2 bg-brand/10 text-brand border border-brand/20 rounded-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-foreground">Pronto para transformar sua análise?</h2>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
              Crie uma conta gratuita agora mesmo, ganhe saldo de simulação e desenhe seu primeiro relatório.
            </p>

            <div className="pt-2 flex flex-col gap-2.5 w-full">
              <Link 
                to="/cadastro"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-xs font-mono font-bold text-primary-foreground shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                CRIAR CONTA GRÁTIS
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to="/planos"
                className="w-full min-h-[44px] inline-flex items-center justify-center rounded-xl border border-border bg-surface/40 backdrop-blur text-xs font-mono font-bold text-foreground transition-all cursor-pointer"
              >
                VER PLANOS DISPONÍVEIS
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <Footer />

      {/* ================= SIMULATION FLOATING PORTAL OVERLAY ================= */}
      <AnimatePresence>
        {isSimulating && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center p-3 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-5 relative shadow-xl font-mono text-left my-auto"
            >
              <button 
                onClick={() => setIsSimulating(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-[10px] font-bold p-1 hover:bg-muted rounded transition"
              >
                ✕ FECHAR
              </button>

              <div className="mb-4">
                <span className="text-[8px] font-bold text-brand uppercase tracking-[0.15em] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand rounded-full animate-ping" />
                  Conexão Ativa
                </span>
                <h3 className="text-sm font-bold text-foreground mt-1.5">Simulação de Consulta</h3>
                <p className="text-muted-foreground text-[10px] mt-0.5">Alvo: <span className="text-foreground font-bold">{searchValue}</span></p>
              </div>

              {/* Console de Simulação */}
              <div className="bg-black/90 rounded-xl p-3.5 border border-border flex flex-col space-y-2.5 min-h-[140px] justify-start text-[9.5px] text-muted-foreground leading-relaxed">
                <div className={`transition-all duration-300 flex items-start gap-1.5 ${simStep >= 0 ? "opacity-100 text-brand" : "opacity-0"}`}>
                  <span>◆</span>
                  <span>[INFO] Estabelecendo conexão segura...</span>
                </div>

                <div className={`transition-all duration-300 flex items-start gap-1.5 ${simStep >= 1 ? "opacity-100 text-brand/90" : "opacity-0"}`}>
                  <span>{simStep >= 1 ? "✔" : "◇"}</span>
                  <span className={simStep === 1 ? "animate-pulse font-bold text-foreground" : ""}>[RECEITA] Verificando CPF/CNPJ ativo...</span>
                </div>

                <div className={`transition-all duration-300 flex items-start gap-1.5 ${simStep >= 2 ? "opacity-100 text-brand/80" : "opacity-0"}`}>
                  <span>{simStep >= 2 ? "✔" : "◇"}</span>
                  <span className={simStep === 2 ? "animate-pulse font-bold text-foreground" : ""}>[SPC_SERASA] Consultando pendências...</span>
                </div>

                <div className={`transition-all duration-300 flex items-start gap-1.5 ${simStep >= 3 ? "opacity-100 text-brand/70" : "opacity-0"}`}>
                  <span>{simStep >= 3 ? "✔" : "◇"}</span>
                  <span className={simStep === 3 ? "animate-pulse font-bold text-foreground" : ""}>[BACEN_JUD] Escaneando Banco Central...</span>
                </div>

                {simStep < 4 && (
                  <div className="flex items-center gap-1.5 pt-1 text-brand">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="animate-pulse">Consultando...</span>
                  </div>
                )}
              </div>

              {/* Bloco de Resultados Simulados */}
              <AnimatePresence>
                {showResults && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 border border-border bg-surface/50 rounded-xl p-4 space-y-4 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-border/50 pb-3 gap-2">
                      <div>
                        <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">CONCLUÍDO</span>
                        <h4 className="font-bold text-xs text-foreground mt-1">Dossiê Simplificado</h4>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[8px] text-muted-foreground font-bold">SCORE</p>
                          <p className="text-[10px] font-bold text-foreground leading-none">Excelente</p>
                        </div>
                        <div className="h-9 w-9 rounded-full border border-emerald-500 flex items-center justify-center bg-emerald-500/10 shadow-sm">
                          <span className="text-emerald-500 font-black text-xs">742</span>
                        </div>
                      </div>
                    </div>

                    {/* Dados */}
                    <div className="grid grid-cols-1 gap-1.5 text-[10.5px]">
                      <div className="p-2 border border-border rounded-lg bg-card flex items-center justify-between">
                        <span>Situação Cadastral</span>
                        <span className="font-bold text-emerald-500">Regular</span>
                      </div>

                      <div className="p-2 border border-border rounded-lg bg-card flex items-center justify-between">
                        <span>Restrições Financeiras</span>
                        {simType === "spc-alert" ? (
                          <span className="font-bold text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Consta Pendência</span>
                        ) : (
                          <span className="font-bold text-emerald-500">Nada Consta</span>
                        )}
                      </div>

                      <div className="p-2 border border-border rounded-lg bg-card flex items-center justify-between">
                        <span>Apontamentos Bacen</span>
                        {simType === "bacen-alert" ? (
                          <span className="font-bold text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Consta Restrição</span>
                        ) : (
                          <span className="font-bold text-emerald-500">Regularizado</span>
                        )}
                      </div>
                    </div>

                    {/* Texto comercial */}
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed bg-brand/5 border border-brand/20 rounded-lg p-3">
                      Adquira créditos ou crie uma conta gratuita para visualizar o dossiê oficial, baixar PDFs estruturados de alto padrão e habilitar pesquisas via API.
                    </p>

                    {/* Botões */}
                    <div className="flex flex-col gap-2 pt-1.5">
                      <Link 
                        to="/cadastro"
                        className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand text-[11px] font-mono font-bold text-primary-foreground shadow-sm hover:brightness-110 transition-all cursor-pointer"
                      >
                        Começar Grátis Agora
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link 
                        to="/login"
                        className="w-full min-h-[38px] inline-flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface/85 text-[11px] font-mono font-bold text-foreground transition-all cursor-pointer"
                      >
                        Acessar com minha conta
                      </Link>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

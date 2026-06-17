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
  User, 
  Building, 
  HelpCircle, 
  ChevronRight, 
  Zap, 
  Check, 
  Sparkles, 
  Scale, 
  AlertTriangle, 
  Lock, 
  Loader2,
  Users,
  TrendingUp,
  Cpu
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";

// Provedores populares para simulação
const popularQueries = [
  { label: "CPF Limpo (Simulação)", value: "542.819.330-10", type: "clean-cpf" },
  { label: "CNPJ Ativo (Simulação)", value: "14.281.990/0001-44", type: "active-cnpj" },
  { label: "Restrição Bacen (Simulação)", value: "819.224.310-88", type: "bacen-alert" },
  { label: "Pendência SPC (Simulação)", value: "310.442.890-55", type: "spc-alert" }
];

export function DesktopLanding() {
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
      setTimeout(() => setSimStep(1), 1000),
      setTimeout(() => setSimStep(2), 2200),
      setTimeout(() => setSimStep(3), 3400),
      setTimeout(() => setSimStep(4), 4600),
      setTimeout(() => {
        setSimStep(5);
        setShowResults(true);
      }, 5800)
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

      {/* Grid de fundo decorativo com máscara gradiente suave */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.12] dark:opacity-[0.22] pointer-events-none z-0" />
      
      {/* Glow de Destaque no Topo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[400px] bg-brand/5 dark:bg-brand/10 blur-[130px] rounded-full pointer-events-none z-0 animate-pulse" style={{ animationDuration: "8s" }} />

      <main className="w-full max-w-7xl mx-auto px-6 pt-32 pb-24 z-10 flex-1 relative">
        
        {/* ================= HERO SECTION ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24 min-h-[70vh]">
          {/* Coluna de Texto e Busca (Lado Esquerdo) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-brand"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} /> 
              Plataforma de Inteligência de Crédito B2B
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] text-foreground"
            >
              Decisões inteligentes. <br />
              <span className="brand-text italic font-serif font-normal">Dados estruturados.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm md:text-base max-w-xl leading-relaxed"
            >
              Acesse consultas cadastrais, de crédito, restrições financeiras e dossiês completos do SPC, Serasa, Bacen e Judiciário em tempo real. Monte seu próprio template e pague apenas pelo que consultar.
            </motion.p>

            {/* Input de Busca Interativo / Caixa de Consulta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full max-w-xl"
            >
              <form onSubmit={handleSearchSubmit} className="relative flex items-center p-1.5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg focus-within:border-brand/50 transition-all duration-300">
                <div className="flex-1 flex items-center gap-3 px-3">
                  <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Digite o CPF ou CNPJ para simular a consulta..." 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-brand text-primary-foreground font-mono font-bold text-xs px-6 py-3.5 rounded-xl hover:bg-brand/90 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  Consultar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Botões rápidos abaixo da busca */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground font-mono mr-1">Simulações:</span>
                {popularQueries.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handlePopularClick(q)}
                    className="px-2.5 py-1 rounded-md text-[10.5px] font-mono bg-surface border border-hairline hover:border-brand/40 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Coluna da Ilustração (Lado Direito) */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            {/* Círculo luminoso por trás da imagem */}
            <div className="absolute w-[400px] h-[400px] bg-brand/5 dark:bg-brand/15 blur-[80px] rounded-full pointer-events-none" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-full max-w-[420px] aspect-[4/3] rounded-3xl border border-border bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl p-2.5"
            >
              <img 
                src="/assets/hero_dashboard.png" 
                alt="Consultas PRO Dashboard Ilustração" 
                className="w-full h-full object-cover rounded-2xl brightness-95 contrast-105"
              />

              {/* Badges Flutuantes estilo Aurora Guia Médico */}
              <div className="absolute -top-4 -left-4 bg-background/80 backdrop-blur-md border border-brand/20 px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce" style={{ animationDuration: "6s" }}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-left font-mono">
                  <p className="text-[10px] text-muted-foreground font-bold leading-none">SPC & SERASA</p>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Conexão Ativa</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-background/80 backdrop-blur-md border border-brand/20 px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce" style={{ animationDuration: "5s", animationDelay: "1s" }}>
                <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <div className="text-left font-mono">
                  <p className="text-[10px] text-muted-foreground font-bold leading-none">PRECISÃO DE DADOS</p>
                  <p className="text-[9px] text-brand font-bold uppercase mt-1">99.9% Auditado</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================= BANNER DE ESTATÍSTICAS ================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-y border-border py-8 mb-24 bg-surface/10 dark:bg-surface/5 backdrop-blur-sm px-6 rounded-2xl relative">
          <div className="text-center md:text-left p-4">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-brand">15M+</h3>
            <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">Consultas Realizadas</p>
          </div>
          <div className="text-center md:text-left p-4 border-l border-border/50">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-brand">40+</h3>
            <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">Bureaus & APIs</p>
          </div>
          <div className="text-center md:text-left p-4 border-l border-border/50">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-brand">99.9%</h3>
            <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">Precisão de Dados</p>
          </div>
          <div className="text-center md:text-left p-4 border-l border-border/50">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-brand">4.9★</h3>
            <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">Avaliação B2B</p>
          </div>
        </section>

        {/* ================= CORE PILLARS SECTION ================= */}
        <section className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase font-bold">◆ Vantagens Exclusivas ◆</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">O que nos torna diferentes</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Desenvolvido com o mais alto padrão tecnológico em React, nosso sistema oferece recursos completos que reduzem o custo operacional e eliminam sistemas paralelos engessados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border flex flex-col justify-start items-start text-left space-y-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
              <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Gráficos e BI Avançados</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Painéis analíticos completos. Acompanhe a volumetria de consultas, inadimplência média por lote de CPFs e comportamento de score de forma totalmente visual.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border flex flex-col justify-start items-start text-left space-y-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
              <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Gestão de Saldo Unificada</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Adicione operadores, equipes e filiais sob a mesma carteira de saldos. Distribua cotas, defina tetos de consumo e acompanhe faturas unificadas sem burocracia.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border flex flex-col justify-start items-start text-left space-y-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
              <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Templates de Alto Padrão</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Os relatórios mais bonitos e legíveis do mercado de crédito. Formatação impecável em PDF ou tela, facilitando a tomada de decisão ou repasse para terceiros.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border flex flex-col justify-start items-start text-left space-y-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
              <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Informação Fiel e Revisada</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Sistemas conectados via conexões criptografadas diretas aos principais bureaus de restrições de crédito. Dados oficiais com conformidade estrita LGPD.
              </p>
            </div>
          </div>
        </section>

        {/* ================= PRODUCT CATEGORIES GRID ================= */}
        <section className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase font-bold">◆ Portfólio de Serviços ◆</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">O que você pode consultar?</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Oferecemos uma estrutura de dados de-para modular. Você escolhe quais seções quer integrar no seu dossiê customizado e otimiza seu consumo financeiro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Análise de Crédito & Score",
                desc: "Consultas de apontamentos, cheques sem fundo, pendências comerciais e bancárias, protestos nacionais e o Score de Crédito oficial consolidado.",
                tag: "MAIS BUSCADO"
              },
              {
                title: "Localização & Cadastral",
                desc: "Confirmação de CPF/CNPJ na Receita Federal, histórico de endereços revisados, telefones ativos, e-mails de contato e relações de parentesco.",
                tag: "CADASTRO"
              },
              {
                title: "Bacen & Judiciário",
                desc: "Verificação de restrições no Banco Central do Brasil, processos judiciais ativos (estaduais e federais), mandados de prisão e certidões negativas.",
                tag: "FINANCEIRO"
              },
              {
                title: "Grupos Societários",
                desc: "Quadro de Sócios e Administradores (QSA), participações em empresas coligadas, capital social e faturamento anual presumido de empresas.",
                tag: "CORPORATIVO"
              },
              {
                title: "Poder Aquisitivo & Renda",
                desc: "Análise de capacidade de pagamento, classe socioeconômica, renda estimada de CPFs, faturamento presumido de CNPJs e índice de solvência.",
                tag: "CRÉDITO"
              },
              {
                title: "Histórico Veicular",
                desc: "Consultas de placa, gravames, restrições financeiras e judiciais (RENAJUD), histórico de sinistros, leilão e roubos ou furtos ativos.",
                tag: "BENS"
              }
            ].map((cat, idx) => (
              <div key={idx} className="bg-card/30 backdrop-blur-md rounded-2xl border border-border p-6 flex flex-col justify-between items-start text-left space-y-4 group hover:border-brand/40 transition-all duration-300">
                <div className="w-full flex justify-between items-center">
                  <span className="font-mono text-[9px] bg-brand/15 text-brand border border-brand/20 font-bold px-2.5 py-1 rounded-full">{cat.tag}</span>
                  <span className="text-muted-foreground/30 font-mono font-bold text-xs">0{idx + 1}</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-foreground group-hover:text-brand transition-colors">{cat.title}</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">{cat.desc}</p>
                </div>
                <Link to="/cadastro" className="text-xs font-mono font-bold text-brand hover:text-brand/80 inline-flex items-center gap-1.5 transition-all">
                  Consultar modulo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ================= DETAILED REPORT SHOWCASE (MOCKUP DOSSIER) ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24 py-12 rounded-3xl bg-surface/5 border border-border px-8 md:px-12 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-[50%] bg-gradient-to-l from-brand/5 to-transparent pointer-events-none" />
          
          {/* Coluna da Imagem */}
          <div className="lg:col-span-5 flex justify-center order-2 lg:order-1 relative">
            <div className="absolute w-[350px] h-[350px] bg-brand/5 dark:bg-brand/10 blur-[70px] rounded-full pointer-events-none" />
            
            <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-3xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl p-2">
              <img 
                src="/assets/credit_report.png" 
                alt="Credit Report Premium Mockup" 
                className="w-full h-full object-cover rounded-2xl brightness-95"
              />
            </div>
          </div>

          {/* Coluna de Conteúdo */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 order-1 lg:order-2 relative z-10">
            <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase font-bold">◆ Report Engine ◆</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Dossiês modulares com layout impecável</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
              Chega de pagar caro por dezenas de informações que sua empresa não utiliza. Com nosso construtor modular, você seleciona apenas as tabelas que importam para o seu negócio e gera um relatório unificado e de alto padrão em segundos.
            </p>

            <ul className="space-y-3 font-mono text-xs text-muted-foreground w-full">
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-brand flex-shrink-0" />
                <span>Exportação instantânea para PDF com assinatura digital</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-brand flex-shrink-0" />
                <span>Integração simples de marca e cores próprias (White-Label)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-brand flex-shrink-0" />
                <span>Armazenamento em histórico criptografado e ledger imutável</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-brand flex-shrink-0" />
                <span>Pesquisa em lote segura com status de execução em fila</span>
              </li>
            </ul>

            <div className="pt-4">
              <Link 
                to="/cadastro"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-mono font-bold text-primary-foreground shadow-[0_0_24px_-4px_var(--color-brand)] hover:shadow-[0_0_36px_-2px_var(--color-brand)] transition-shadow cursor-pointer"
              >
                Desenhar Relatório Grátis
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================= FAQ ACCORDION SECTION ================= */}
        <section className="mb-24 max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase font-bold">◆ Dúvidas Comuns ◆</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4 text-left">
            {[
              {
                q: "Como funciona o sistema de recargas e saldos?",
                a: "Na Consultas PRO você não fica preso a assinaturas mensais obrigatórias ou mensalidades fixas na modalidade Individual. Você simplesmente faz uma recarga via Pix ou cartão do valor que desejar, e esse saldo fica disponível em sua carteira para você consumir realizando consultas. Cada módulo consultado tem um preço fixo, debitado na hora."
              },
              {
                q: "A plataforma está em conformidade com a LGPD?",
                a: "Sim, 100%. Todos os dados consultados são provenientes de bureaus e fontes de dados oficiais com finalidade específica autorizada por lei, como proteção ao crédito, prevenção a fraudes e compliance cadastral. Não armazenamos payloads ou dados sensíveis sem consentimento expresso e auditoria de ledger de segurança."
              },
              {
                q: "Posso adicionar operadores da minha empresa no mesmo saldo?",
                a: "Com certeza. Adquirindo a assinatura Empresa Premium, você pode adicionar até 500 ou mais operadores e colaboradores da sua empresa para utilizarem o sistema sob uma única conta. Você, como administrador, gerencia o saldo, estipula limites diários ou mensais de consultas para cada operador e acompanha tudo em tempo real."
              },
              {
                q: "O que é o recurso White-Label?",
                a: "O White-Label permite que você personalize completamente a aparência da plataforma e dos relatórios para seus clientes ou corretores. Você pode colocar sua própria logomarca, alterar as cores primárias do sistema, hospedar em um subdomínio próprio e emitir dossiês em PDF com a identidade visual da sua própria empresa."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="rounded-2xl border border-border bg-card/35 backdrop-blur-md overflow-hidden transition-all duration-300"
                >
                  <button 
                    onClick={() => setOpenOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between font-bold text-sm md:text-base text-foreground focus:outline-none text-left cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`p-1.5 bg-brand/10 text-brand rounded-lg border border-brand/20 flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
                      <ChevronRight className="w-4 h-4" />
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
                        <div className="px-6 pb-6 pt-1 border-t border-border/40 text-xs md:text-sm text-muted-foreground leading-relaxed">
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
        <section className="rounded-3xl border border-brand/25 bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-rgb),0.08),transparent_40%),linear-gradient(180deg,var(--surface-bg,rgba(15,18,25,0.4)),rgba(10,12,17,0.8))] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-brand/5 dark:bg-brand/10 blur-[60px] rounded-full pointer-events-none" />
          
          <div className="max-w-2xl mx-auto flex flex-col items-center space-y-6 relative z-10">
            <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-2xl">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-foreground">Pronto para transformar sua análise cadastral?</h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Crie uma conta gratuita agora mesmo, ganhe saldo de simulação e desenhe o seu primeiro dossiê inteligente em menos de um minuto. Sem burocracias.
            </p>

            <div className="pt-4 flex flex-wrap gap-4 items-center justify-center">
              <Link 
                to="/cadastro"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-mono font-bold text-primary-foreground shadow-[0_0_28px_rgba(var(--brand-rgb),0.35)] hover:brightness-115 transition-all cursor-pointer"
              >
                CRIAR CONTA GRÁTIS
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <Link 
                to="/planos"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 hover:bg-surface/70 backdrop-blur px-6 py-4 text-sm font-mono font-bold text-foreground transition-all cursor-pointer"
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
          <div className="fixed inset-0 bg-background/92 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 md:p-8 relative shadow-2xl overflow-hidden font-mono text-left"
            >
              <button 
                onClick={() => setIsSimulating(false)}
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-xs font-bold p-1.5 hover:bg-muted rounded transition"
              >
                ✕ FECHAR
              </button>

              <div className="mb-6">
                <span className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-brand rounded-full animate-ping" />
                  Conexão Ativa • Barramento Integrado
                </span>
                <h3 className="text-lg md:text-xl font-bold text-foreground mt-2">Simulação de Consulta em Tempo Real</h3>
                <p className="text-muted-foreground text-xs font-mono mt-1">Simulando varredura para: <span className="text-foreground font-bold">{searchValue}</span></p>
              </div>

              {/* Console de Simulação */}
              <div className="bg-black/90 dark:bg-black/60 rounded-2xl p-5 border border-border flex flex-col space-y-3.5 min-h-[220px] justify-start text-[11px] text-muted-foreground leading-relaxed overflow-y-auto">
                
                {/* Passo 1 */}
                <div className={`transition-all duration-300 flex items-start gap-2.5 ${simStep >= 0 ? "opacity-100 text-brand" : "opacity-0"}`}>
                  <span className="shrink-0">◆</span>
                  <span>[INFO] Estabelecendo conexão segura SSL com barramentos integrados...</span>
                </div>

                {/* Passo 2 */}
                <div className={`transition-all duration-300 flex items-start gap-2.5 ${simStep >= 1 ? "opacity-100 text-brand/90" : "opacity-0"}`}>
                  <span className="shrink-0">{simStep >= 1 ? "✔" : "◇"}</span>
                  <span className={simStep === 1 ? "animate-pulse font-bold text-foreground" : ""}>[PROVEDOR_RECEITA] Consultando cadastro de CPF/CNPJ e situação cadastral ativa...</span>
                </div>

                {/* Passo 3 */}
                <div className={`transition-all duration-300 flex items-start gap-2.5 ${simStep >= 2 ? "opacity-100 text-brand/80" : "opacity-0"}`}>
                  <span className="shrink-0">{simStep >= 2 ? "✔" : "◇"}</span>
                  <span className={simStep === 2 ? "animate-pulse font-bold text-foreground" : ""}>[SPC_SERASA] Varrendo banco de dados nacional para pendências comerciais, protestos e cheques...</span>
                </div>

                {/* Passo 4 */}
                <div className={`transition-all duration-300 flex items-start gap-2.5 ${simStep >= 3 ? "opacity-100 text-brand/70" : "opacity-0"}`}>
                  <span className="shrink-0">{simStep >= 3 ? "✔" : "◇"}</span>
                  <span className={simStep === 3 ? "animate-pulse font-bold text-foreground" : ""}>[BACEN_JUD] Escaneando histórico do Banco Central do Brasil e certidões negativas de processos...</span>
                </div>

                {/* Passo 5 */}
                <div className={`transition-all duration-300 flex items-start gap-2.5 ${simStep >= 4 ? "opacity-100 text-brand/60" : "opacity-0"}`}>
                  <span className="shrink-0">{simStep >= 4 ? "✔" : "◇"}</span>
                  <span className={simStep === 4 ? "animate-pulse font-bold text-foreground" : ""}>[ENGINE] Compilando payload de dados modular e calculando score de crédito...</span>
                </div>

                {/* Passo Finalizado */}
                {simStep < 5 && (
                  <div className="flex items-center gap-2 pt-2 text-brand">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="animate-pulse">Consultando bureaus...</span>
                  </div>
                )}
              </div>

              {/* Bloco de Resultados Simulados (Renderizado uma vez concluído) */}
              <AnimatePresence>
                {showResults && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-border bg-surface/50 rounded-2xl p-5 md:p-6 space-y-6"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase">DOSSIÊ DISPONÍVEL</span>
                        <h4 className="font-bold text-sm text-foreground mt-2">Dossiê Consolidado Simplificado</h4>
                      </div>

                      {/* Score Gauge Simulado */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground font-bold">SCORE DE CRÉDITO</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">Nível: Excelente</p>
                        </div>
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-500 flex flex-col items-center justify-center bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <span className="text-emerald-500 font-black text-xs">742</span>
                        </div>
                      </div>
                    </div>

                    {/* Blocos de Dados Simplificados */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 border border-border rounded-xl bg-card flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">Cadastral</p>
                          <p className="font-bold text-foreground mt-1">Situação Regular</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>

                      <div className="p-3 border border-border rounded-xl bg-card flex items-center justify-between text-xs">
                        {simType === "spc-alert" ? (
                          <>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Restrições</p>
                              <p className="font-bold text-amber-500 mt-1">2 Pendências</p>
                            </div>
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Restrições</p>
                              <p className="font-bold text-foreground mt-1">Nada Consta</p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          </>
                        )}
                      </div>

                      <div className="p-3 border border-border rounded-xl bg-card flex items-center justify-between text-xs">
                        {simType === "bacen-alert" ? (
                          <>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Bacen & Dívidas</p>
                              <p className="font-bold text-rose-500 mt-1">1 Apontamento</p>
                            </div>
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Bacen & Dívidas</p>
                              <p className="font-bold text-foreground mt-1">Regularizado</p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Caixa de Texto Comercial */}
                    <div className="text-xs text-muted-foreground leading-relaxed flex items-start gap-3 bg-brand/5 border border-brand/20 rounded-xl p-4">
                      <Lock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <p>
                        Para visualizar o dossiê detalhado oficial, fazer download do PDF estruturado, habilitar pesquisas em lote via API B2B e ter a gestão financeira unificada, adquira crédito ou crie sua conta comercial.
                      </p>
                    </div>

                    {/* Botões do final do resultado */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Link 
                        to="/cadastro"
                        className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-mono font-bold text-primary-foreground shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)] hover:brightness-110 transition-all cursor-pointer"
                      >
                        Começar Grátis Agora
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link 
                        to="/login"
                        className="flex-1 min-h-[46px] inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface/85 px-5 text-xs font-mono font-bold text-foreground transition-all cursor-pointer"
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

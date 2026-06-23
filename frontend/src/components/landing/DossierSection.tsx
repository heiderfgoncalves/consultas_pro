import React, { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Folder from "@/components/ui/Folder";
import { FadeUp, SectionHeader } from "./primitives";
import { FileDown, Eye, ShieldAlert, Award, X, ChevronLeft, ChevronRight } from "lucide-react";

export function DossierSection() {
  // Estado para controlar a imagem expandida no Lightbox modal
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Estado para controlar a escala física da pasta 3D de forma responsiva
  const [folderSize, setFolderSize] = useState(1.3);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth >= 1024) {
        setFolderSize(1.75); // Muito maior para desktops!
      } else if (window.innerWidth >= 768) {
        setFolderSize(1.5);
      } else {
        setFolderSize(1.2); // Seguro para celulares
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Inicializando Embla Carousel para visualização de relatórios maiores
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false
  });

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  // Array estruturado das 5 capturas reais de relatórios legítimos do sistema
  const dossierImages = [
    {
      src: "/assets/Image_1.jpg",
      title: "ESTRATO FINANCEIRO DA CARTEIRA MULTIEMPRESA",
      category: "RELATÓRIO FINANCEIRO • V4.1",
      desc: "Auditoria consolidada de faturamento unificado para transações B2B com controle de saldos, limites de crédito corporativos e conciliação em lote.",
      status: "CONSOLIDADO",
      origin: "LEDGER_LED_88X"
    },
    {
      src: "/assets/Image_2.jpg",
      title: "CONSTRUTOR VISUAL DE TEMPLATES DE RELATÓRIO",
      category: "NORMALIZAÇÃO PAYLOAD • V2.0",
      desc: "Interface interativa drag-and-drop para mapeamento estrito de-para de dados de bureaus de crédito e renderização determinística white-label.",
      status: "ESTÁVEL",
      origin: "WEB_WIDGET_WHITE"
    },
    {
      src: "/assets/Image_3.jpg",
      title: "CENTRAL DE PROVEDORES E INTEGRAÇÕES MULTI-API",
      category: "ORQUESTRADOR DE CONEXÕES • V1.8",
      desc: "Fila de emissão assíncrona acionando múltiplos bureaus em paralelo com balanceamento de carga, monitoramento de latência e queda suave para fallbacks.",
      status: "AUDITADO",
      origin: "BULLMQ_WORKER"
    },
    {
      src: "/assets/image_4.jpg", // Nota: arquivo em minúsculo no sistema
      title: "SISTEMA DE PIPELINES E FILAS DE AGENDAMENTO",
      category: "MONITORAMENTO DE EVENTOS • V3.2",
      desc: "Painel de controle técnico de pipelines assíncronos e processamento massivo de lotes (bulk check) via infraestrutura Redis de alta vazão.",
      status: "EM SEGUNDO PLANO",
      origin: "REDIS_QUEUE_PROV"
    },
    {
      src: "/assets/Image_5.jpg", // Nota: arquivo em maiúsculo no sistema
      title: "MÉTRICAS DE PERFORMANCE E SAÚDE DO MOTOR",
      category: "MÉTRICAS & LATÊNCIA • V2.5",
      desc: "Painel analítico de tempo de resposta por provedor, taxas de sucesso de requisições de crédito e controle de cotas das APIs integradas.",
      status: "OPERACIONAL",
      origin: "PROMETHEUS_METRICS"
    }
  ];

  const handlePrev = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev !== null ? (prev - 1 + dossierImages.length) % dossierImages.length : 0));
  };

  const handleNext = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev !== null ? (prev + 1) % dossierImages.length : 0));
  };

  const handleClose = () => {
    setActiveImageIndex(null);
  };

  // Suporte a navegação por teclado (A11y e UX premium)
  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex]);

  // Construímos os 3 relatórios de alta fidelidade que ficarão inseridos dentro da pasta física 3D <Folder />
  // Eles ganham cliques interativos para abrir o Lightbox
  const reports = [
    (
      <div 
        onClick={() => setActiveImageIndex(0)}
        className="flex flex-col h-full w-full bg-card dark:bg-muted border border-brand/20 p-4 text-left select-none relative overflow-hidden group cursor-target"
      >
        {/* Marca d'água de fundo */}
        <div className="absolute right-2 bottom-2 opacity-5 text-brand pointer-events-none">
          <Award size={120} />
        </div>
        <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
          <span className="mono text-[8px] tracking-[0.2em] text-brand uppercase font-bold">Relatório Executivo v4.1</span>
          <span className="mono text-[7px] text-muted-foreground">CONFIDENCIAL</span>
        </div>
        <h5 className="mono text-[11px] font-bold text-foreground mb-1 group-hover:text-brand transition-colors duration-300">
          ESTRATO FINANCEIRO DA CARTEIRA MULTIEMPRESA
        </h5>
        <p className="text-[9px] text-muted-foreground leading-relaxed mb-3">
          Auditoria de transações de consulta com faturamento unificado B2B e controle estrito de saldo.
        </p>
        <div className="flex-1 rounded border border-hairline overflow-hidden bg-black/40 relative group-hover:border-brand/40 transition-all duration-300">
          <img 
            src="/assets/Image_1.jpg" 
            alt="Dashboard Financeiro" 
            className="w-full h-full object-cover object-top filter grayscale-[25%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" 
          />
          {/* Matiz dinâmica de acordo com a cor do tema */}
          <div className="absolute inset-0 bg-brand/20 mix-blend-color group-hover:opacity-0 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <span className="bg-brand text-primary-foreground font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg font-bold">
              <Eye className="h-3 w-3" /> Ampliar Relatório
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between mono text-[7.5px] text-muted-foreground">
          <span>ORIGEM: LEDGER_LED_88X</span>
          <span className="text-brand font-bold">STATUS: CONSOLIDADO</span>
        </div>
      </div>
    ),
    (
      <div 
        onClick={() => setActiveImageIndex(1)}
        className="flex flex-col h-full w-full bg-card dark:bg-card border border-brand/20 p-4 text-left select-none relative overflow-hidden group cursor-target"
      >
        <div className="absolute right-2 bottom-2 opacity-5 text-brand pointer-events-none">
          <ShieldAlert size={120} />
        </div>
        <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
          <span className="mono text-[8px] tracking-[0.2em] text-brand uppercase font-bold">Normalização Payload</span>
          <span className="mono text-[7px] text-muted-foreground">PROTÓTIPO_V2</span>
        </div>
        <h5 className="mono text-[11px] font-bold text-foreground mb-1 group-hover:text-brand transition-colors duration-300">
          CONSTRUTOR VISUAL DE TEMPLATES DE RELATÓRIO
        </h5>
        <p className="text-[9px] text-muted-foreground leading-relaxed mb-3">
          Mapeamento estrito de-para e renderização determinística via editor drag-and-drop e variáveis seguras.
        </p>
        <div className="flex-1 rounded border border-hairline overflow-hidden bg-black/40 relative group-hover:border-brand/40 transition-all duration-300">
          <img 
            src="/assets/Image_2.jpg" 
            alt="Editor de Relatórios" 
            className="w-full h-full object-cover object-top filter grayscale-[25%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" 
          />
          {/* Matiz dinâmica de acordo com a cor do tema */}
          <div className="absolute inset-0 bg-brand/20 mix-blend-color group-hover:opacity-0 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <span className="bg-brand text-primary-foreground font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg font-bold">
              <Eye className="h-3 w-3" /> Ampliar Relatório
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between mono text-[7.5px] text-muted-foreground">
          <span>MÉTODO: WEB_WIDGET_WHITE</span>
          <span className="text-brand font-bold">ESTADO: COMPILADO</span>
        </div>
      </div>
    ),
    (
      <div 
        onClick={() => setActiveImageIndex(2)}
        className="flex flex-col h-full w-full bg-card dark:bg-muted border border-brand/20 p-4 text-left select-none relative overflow-hidden group cursor-target"
      >
        <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
          <span className="mono text-[8px] tracking-[0.2em] text-brand uppercase font-bold">Orquestração Multi-API</span>
          <span className="mono text-[7px] text-muted-foreground">PROV_NORMALIZED</span>
        </div>
        <h5 className="mono text-[11px] font-bold text-foreground mb-1 group-hover:text-brand transition-colors duration-300">
          CENTRAL DE PROVEDORES E INTEGRAÇÕES
        </h5>
        <p className="text-[9px] text-muted-foreground leading-relaxed mb-3">
          Fila assíncrona de emissão robusta acionando múltiplos fornecedores com balanceamento inteligente e fallback.
        </p>
        <div className="flex-1 rounded border border-hairline overflow-hidden bg-black/40 relative group-hover:border-brand/40 transition-all duration-300">
          <img 
            src="/assets/Image_3.jpg" 
            alt="Provedores e Configuração" 
            className="w-full h-full object-cover object-top filter grayscale-[25%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" 
          />
          {/* Matiz dinâmica de acordo com a cor do tema */}
          <div className="absolute inset-0 bg-brand/20 mix-blend-color group-hover:opacity-0 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <span className="bg-brand text-primary-foreground font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg font-bold">
              <Eye className="h-3 w-3" /> Ampliar Relatório
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between mono text-[7.5px] text-muted-foreground">
          <span>GATEWAY: BULLMQ_WORKER</span>
          <span className="text-brand font-bold">AUDITORIA: ATIVA</span>
        </div>
      </div>
    )
  ];

  return (
    <section id="dossie" className="relative py-6 border-t border-hairline bg-surface/45 dark:bg-[#070b13]/45 overflow-hidden">
      {/* Luz difusa de fundo para dar profundidade premium */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-brand/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="05 — DOSSIÊ COMERCIAL"
            title={
              <>
                Explore relatórios <span className="brand-text">reais e auditáveis</span>.
              </>
            }
            sub="Abra a pasta interativa 3D abaixo para folhear e ampliar as capturas legítimas extraídas do painel de controle do sistema do Consultas PRO."
          />
        </div>

        <div className="mt-10 flex flex-col items-center">
          <FadeUp delay={0.15} className="flex justify-center w-full min-h-[360px] md:min-h-[420px] items-center">
            {/* Folder gigante interativo */}
            <div className="cursor-pointer select-none">
              <Folder 
                color="#1e293b" 
                size={folderSize} 
                items={reports} 
                className="mx-auto"
              />
            </div>
          </FadeUp>

          {/* Dicas de usabilidade e instruções técnicas */}
          <FadeUp delay={0.25} className="mt-10 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.03] px-3.5 py-1 text-[11px] font-medium text-brand/90 tracking-wide">
              <Eye className="h-3 w-3 animate-pulse text-brand" />
              <span>DICA: Clique na pasta para abri-la e clique em qualquer relatório para expandir</span>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Carrossel Técnico de Miniaturas (Meio-termo: 1440px de largura) */}
      <FadeUp delay={0.3} className="mt-16 max-w-[1440px] mx-auto w-full relative group/carousel px-6">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="h-px w-10 bg-brand/35" />
          <span className="mono text-[10px] tracking-[0.25em] text-brand uppercase font-bold">
            PAINEL DE DOCUMENTOS • CAPTURAS AUDITÁVEIS
          </span>
          <div className="h-px w-10 bg-brand/35" />
        </div>

        <div className="relative px-8 md:px-12">
              {/* Viewport do Embla */}
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-4">
                  {dossierImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex-[0_0_100%] sm:flex-[0_0_60%] md:flex-[0_0_50%] pl-6 min-w-0"
                    >
                      <div
                        onClick={() => setActiveImageIndex(idx)}
                        className="group relative bg-card/85 dark:bg-card/85 border border-hairline hover:border-brand/40 rounded-lg p-5 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer cursor-target shadow-lg shadow-black/10 select-none h-[420px] md:h-[530px]"
                      >
                        {/* Glow interno sutil na cor do tema */}
                        <div className="absolute inset-0 bg-brand/[0.01] group-hover:bg-brand/[0.04] transition-colors duration-300 rounded-lg" />
                        
                        <div className="flex-1 flex flex-col min-h-0">
                          {/* ID e Status */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[8.5px] tracking-wider text-muted-foreground group-hover:text-brand transition-colors duration-300">
                              EVIDÊNCIA #0{idx + 1}
                            </span>
                            <span className="font-mono text-[7px] text-brand/80 border border-brand/20 bg-brand/5 px-1.5 py-0.5 rounded font-bold">
                              {img.status}
                            </span>
                          </div>

                          {/* Foto da Miniatura (Inicialmente menor, cresce e perde matiz no hover) */}
                          <div className="relative flex-1 w-full rounded border border-hairline overflow-hidden bg-black/40 mb-3 min-h-[250px] md:min-h-[350px]">
                            <img
                              src={img.src}
                              alt={img.title}
                              className="w-full h-full object-cover object-top filter grayscale-[25%] group-hover:grayscale-0 group-hover:scale-112 transition-all duration-500"
                            />
                            {/* Matiz dinâmica baseada na cor da página */}
                            <div className="absolute inset-0 bg-brand/20 mix-blend-color group-hover:opacity-0 transition-opacity duration-500 pointer-events-none" />
                            {/* Overlay com Lente de Lupa */}
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                              <div className="bg-brand text-primary-foreground p-1.5 rounded-full shadow">
                                <Eye className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nome e Categoria */}
                        <div className="mt-1">
                          <h6 className="font-semibold text-[11px] leading-tight tracking-tight text-foreground group-hover:text-brand transition-colors duration-300 truncate">
                            {img.title}
                          </h6>
                          <p className="font-mono text-[8.5px] text-muted-foreground truncate mt-1">
                            {img.category}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Carrossel (Setas de Navegação) */}
              <button
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-brand/20 bg-card/75 dark:bg-black/55 hover:bg-brand/15 text-brand/90 hover:text-brand hover:scale-110 transition-all duration-300 cursor-target focus:outline-none shadow-md"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-brand/20 bg-card/75 dark:bg-black/55 hover:bg-brand/15 text-brand/90 hover:text-brand hover:scale-110 transition-all duration-300 cursor-target focus:outline-none shadow-md"
                title="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
        </FadeUp>

        {/* Nota de rodapé da arquitetura White-Label */}
      <FadeUp delay={0.35} className="mt-10 max-w-2xl mx-auto px-6 text-center">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground/80">
          A arquitetura white-label do <strong>Consultas PRO</strong> entrega a mesma experiência de folha física de auditoria digitalizada aos seus clientes. Todos os dados são consolidados em tempo de execução com de-para agnóstico de fornecedor, gerando PDFs assinados digitalmente.
        </p>
      </FadeUp>

      {/* Lightbox Modal Premium HUD */}
      {activeImageIndex !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/98 backdrop-blur-2xl transition-all duration-300 p-2 md:p-4">
          {/* Fundo clicável para fechar */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={handleClose} />

          {/* Bloco Central HUD (Expandido para 95vw/95vh) */}
          <div className="relative w-full max-w-[95vw] h-full max-h-[95vh] bg-card/98 dark:bg-[#060a12]/98 border border-brand/40 rounded-xl overflow-hidden shadow-2xl z-10 flex flex-col md:grid md:grid-cols-12 animate-scale-in hud-corners">
            {/* HUD corners nas bordas (herdam var(--brand) reativamente) */}
            <div className="hud-tl" />
            <div className="hud-tr" />
            <div className="hud-bl" />
            <div className="hud-br" />

            {/* Botão de Fechar */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full border border-brand/20 bg-brand/5 hover:bg-brand/15 text-brand/90 hover:text-brand hover:scale-105 transition-all duration-300 cursor-target focus:outline-none"
              title="Fechar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Visualizador de Imagem (Preenchimento Total do Modal) */}
            <div className="col-span-12 md:col-span-10 bg-background/40 dark:bg-black/60 relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-hairline min-h-[500px] md:min-h-0 h-full select-none">
              <img
                src={dossierImages[activeImageIndex].src}
                alt={dossierImages[activeImageIndex].title}
                className="w-full h-full object-contain transition-all duration-500 hover:scale-[1.02]"
              />

              {/* Botão Anterior */}
              <button
                onClick={handlePrev}
                className="absolute left-4 p-2.5 rounded-full border border-brand/20 bg-black/50 hover:bg-brand/15 text-brand/90 hover:text-brand hover:scale-110 transition-all duration-300 cursor-target focus:outline-none"
                title="Imagem Anterior (Seta Esquerda)"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Botão Próximo */}
              <button
                onClick={handleNext}
                className="absolute right-4 p-2.5 rounded-full border border-brand/20 bg-black/50 hover:bg-brand/15 text-brand/90 hover:text-brand hover:scale-110 transition-all duration-300 cursor-target focus:outline-none"
                title="Próxima Imagem (Seta Direita)"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Paginação Mono */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.2em] bg-black/80 border border-brand/20 text-brand px-3 py-1 rounded-full font-bold">
                EVIDÊNCIA {activeImageIndex + 1} DE {dossierImages.length}
              </div>
            </div>

            {/* Painel de Metadados Técnicos (Lado Direito) */}
            <div className="col-span-12 md:col-span-2 p-5 md:p-6 flex flex-col justify-between overflow-y-auto h-full bg-surface/90 dark:bg-[#05070c]/90 border-t md:border-t-0 border-hairline">
              <div className="space-y-5">
                {/* Badge Categoria */}
                <div className="flex">
                  <span className="font-mono text-[9px] font-bold text-brand tracking-widest uppercase border border-brand/20 bg-brand/5 px-2.5 py-1 rounded">
                    {dossierImages[activeImageIndex].category}
                  </span>
                </div>

                {/* Título Principal */}
                <h4 className="text-base md:text-md font-bold tracking-tight text-foreground leading-snug">
                  {dossierImages[activeImageIndex].title}
                </h4>

                {/* Parágrafo de descrição técnica */}
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  {dossierImages[activeImageIndex].desc}
                </p>

                <div className="h-px bg-hairline" />

                {/* Metadados HUD */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-[9.5px]">
                    <span className="text-muted-foreground">STATUS DO MÓDULO:</span>
                    <span className="text-brand font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                      {dossierImages[activeImageIndex].status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9.5px]">
                    <span className="text-muted-foreground">ORIGEM DOS DADOS:</span>
                    <span className="text-foreground font-semibold">{dossierImages[activeImageIndex].origin}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9.5px]">
                    <span className="text-muted-foreground">TIPO DE AUDITORIA:</span>
                    <span className="text-foreground/90 font-semibold">Dossiê Criptográfico</span>
                  </div>
                </div>
              </div>

              {/* Botões de Exportação */}
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => window.location.href = '/cadastro'}
                  className="w-full flex items-center justify-center gap-2 bg-brand text-primary-foreground font-mono text-[10px] uppercase tracking-wider font-bold py-3 px-4 rounded border border-brand/20 hover:brightness-110 active:scale-[0.98] transition-all duration-300 cursor-target shadow-lg shadow-brand/10"
                >
                  <Eye className="h-3.5 w-3.5" /> Iniciar Teste Gratuito
                </button>
                
                <p className="font-mono text-[7px] text-muted-foreground/60 text-center uppercase tracking-wide">
                  Criptografia de ponta a ponta ◆ Chave hash sha256 ativa
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

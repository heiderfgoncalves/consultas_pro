import { newId } from "../utils/ids";
import type { TemplateElement } from "../schema/template";

export interface LegacyBlock {
  id: string;
  name: string;
  description: string;
  category: "header" | "footer" | "content";
  color: string;
  elements: Omit<TemplateElement, "id" | "zIndex" | "frameId">[];
}

export const LEGACY_BLOCKS: LegacyBlock[] = [
  {
    id: "block-header",
    name: "Cabeçalho Premium",
    description: "Cabeçalho com logo, título e metadados da consulta",
    category: "header",
    color: "#3b82f6",
    elements: [
      {
        type: "container",
        name: "Fundo Cabeçalho",
        x: 0,
        y: 0,
        width: 790,
        height: 80,
        style: {
          background: "#0f172a",
          padding: 12,
        },
      },
      {
        type: "image",
        name: "Logo Marca",
        x: 20,
        y: 15,
        width: 140,
        height: 50,
        style: {
          borderRadius: 4,
        },
        data: {
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=140&h=50&fit=crop",
          fit: "contain",
        },
      },
      {
        type: "text",
        name: "Título do Relatório",
        x: 180,
        y: 15,
        width: 400,
        height: 28,
        style: {
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 700,
        },
        data: {
          text: "RELATÓRIO DE ANÁLISE CADASTRAL COMPLETA",
        },
      },
      {
        type: "text",
        name: "Subtítulo Geração",
        x: 180,
        y: 43,
        width: 400,
        height: 18,
        style: {
          color: "#94a3b8",
          fontSize: 10,
          fontWeight: 400,
        },
        data: {
          text: "Documento gerado em {{dataGeracao}} · Protocolo #{{protocolo}}",
        },
      },
    ],
  },
  {
    id: "block-customer-data",
    name: "Dados do Cliente",
    description: "Grid completo com os dados cadastrais do cliente consultado",
    category: "content",
    color: "#10b981",
    elements: [
      {
        type: "card",
        name: "Painel Dados Cadastrais",
        x: 0,
        y: 0,
        width: 790,
        height: 160,
        style: {
          background: "#ffffff",
          borderColor: "#cbd5e1",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "DADOS CADASTRAIS PRINCIPAIS",
          body: "Nome / Razão Social: {{cliente.nome}}\nCPF / CNPJ: {{cliente.documento}}\nSituação Cadastral: {{cliente.situacao}}\nData de Nascimento / Fundação: {{cliente.dataNascimento}}\nNome da Mãe / Nome Fantasia: {{cliente.nomeMae}}",
        },
      },
    ],
  },
  {
    id: "block-financial-summary",
    name: "Resumo Financeiro",
    description: "Quadro consolidado de faturamento, limites e restrições",
    category: "content",
    color: "#ef4444",
    elements: [
      {
        type: "card",
        name: "Painel Resumo Financeiro",
        x: 0,
        y: 0,
        width: 790,
        height: 150,
        style: {
          background: "#fffef0",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "RESUMO FINANCEIRO E DE CRÉDITO",
          body: "Renda / Faturamento Presumido: R$ {{financeiro.rendaPresumida}}\nLimite de Crédito Recomendado: R$ {{financeiro.limiteSugerido}}\nTotal de Pendências Financeiras: R$ {{financeiro.totalPendencias}}\nComprometimento de Renda: {{financeiro.comprometimento}}%\nÍndice de Liquidez: {{financeiro.liquidez}}",
        },
      },
    ],
  },
  {
    id: "block-credit-score",
    name: "Score de Crédito",
    description: "Indicador visual de probabilidade de inadimplência",
    category: "content",
    color: "#f59e0b",
    elements: [
      {
        type: "container",
        name: "Fundo Score",
        x: 0,
        y: 0,
        width: 790,
        height: 140,
        style: {
          background: "#fafafa",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
      },
      {
        type: "text",
        name: "Título Score",
        x: 20,
        y: 15,
        width: 300,
        height: 20,
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "#475569",
        },
        data: {
          text: "SCORE DE CRÉDITO",
        },
      },
      {
        type: "text",
        name: "Número Score",
        x: 20,
        y: 40,
        width: 250,
        height: 60,
        style: {
          fontSize: 48,
          fontWeight: 900,
          color: "#ea580c",
        },
        data: {
          text: "{{score.pontuacao}}",
        },
      },
      {
        type: "text",
        name: "Classificação Score",
        x: 20,
        y: 100,
        width: 250,
        height: 20,
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#16a34a",
        },
        data: {
          text: "Risco: {{score.classificacao}}",
        },
      },
      {
        type: "text",
        name: "Descrição Score",
        x: 320,
        y: 45,
        width: 440,
        height: 70,
        style: {
          fontSize: 11,
          color: "#64748b",
        },
        data: {
          text: "A pontuação do cliente é de {{score.pontuacao}} pontos, indicando um perfil de risco {{score.classificacao}}. A probabilidade de pagamento nos próximos 12 meses é estimada em {{score.probabilidadePagamento}}% com base nas bases de dados comportamentais compiladas.",
        },
      },
    ],
  },
  {
    id: "block-serasa",
    name: "Consultas Serasa",
    description: "Pendências financeiras, anotações de inadimplência e histórico",
    category: "content",
    color: "#3b82f6",
    elements: [
      {
        type: "card",
        name: "Painel Serasa",
        x: 0,
        y: 0,
        width: 790,
        height: 150,
        style: {
          background: "#ffffff",
          borderColor: "#3b82f6",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "OCORRÊNCIAS SERASA (ANOTAÇÕES E NEGATIVAÇÕES)",
          body: "Total de Pendências Bancárias: {{serasa.qtdPendenciasBancarias}} ocorrência(s)\nValor Total Negativado: R$ {{serasa.valorPendenciasBancarias}}\nAnotações de Inadimplência: {{serasa.anotacoesInadimplencia}}\nÚltima Ocorrência Registrada: {{serasa.dataUltimaOcorrencia}} · Credor: {{serasa.credorUltimo}}",
        },
      },
    ],
  },
  {
    id: "block-spc",
    name: "Consultas SPC",
    description: "Restrições de lojistas, cheques sem fundo e registros SPC",
    category: "content",
    color: "#a855f7",
    elements: [
      {
        type: "card",
        name: "Painel SPC",
        x: 0,
        y: 0,
        width: 790,
        height: 150,
        style: {
          background: "#ffffff",
          borderColor: "#a855f7",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "DADOS DO BANCO DE DADOS SPC BRASIL",
          body: "Registros de Débito SPC: {{spc.totalRegistros}} registro(s) ativo(s)\nValor Acumulado no SPC: R$ {{spc.valorTotal}}\nCheques Devolvidos / Sem Fundo: {{spc.chequesSemFundo}} registro(s)\nÚltima Atualização Cadastral SPC: {{spc.dataAtualizacao}}",
        },
      },
    ],
  },
  {
    id: "block-bacen",
    name: "Bacen / SCR",
    description: "Endividamento global e relacionamento com o Banco Central",
    category: "content",
    color: "#0284c7",
    elements: [
      {
        type: "card",
        name: "Painel Bacen",
        x: 0,
        y: 0,
        width: 790,
        height: 150,
        style: {
          background: "#f0f9ff",
          borderColor: "#0284c7",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "SISTEMA DE INFORMAÇÕES DE CRÉDITO DO BANCO CENTRAL (SCR / BACEN)",
          body: "Operações de Crédito Ativas: R$ {{bacen.creditoAberto}}\nCrédito Vencido / Prejuízo: R$ {{bacen.creditoVencido}}\nLimites de Crédito pré-aprovados: R$ {{bacen.limiteCredito}}\nQuantidade de Instituições Financeiras Parceiras: {{bacen.qtdInstituicoes}}\nRisco Cambial / Cambial Ativo: R$ {{bacen.riscoCambial}}",
        },
      },
    ],
  },
  {
    id: "block-protestos",
    name: "Protestos de Títulos",
    description: "Pesquisa de protestos em cartórios estaduais e nacionais",
    category: "content",
    color: "#db2777",
    elements: [
      {
        type: "card",
        name: "Painel Protestos",
        x: 0,
        y: 0,
        width: 790,
        height: 150,
        style: {
          background: "#fff1f2",
          borderColor: "#db2777",
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
        },
        data: {
          title: "PESQUISA DE PROTESTOS DE TÍTULOS (CARTÓRIOS DE PROTESTO)",
          body: "Total de Protestos Ativos: {{protestos.total}} protesto(s) encontrado(s)\nValor Total de Títulos Protestados: R$ {{protestos.valorTotal}}\nCidade/Estado com Maior Incidência: {{protestos.localidadePrincipal}}\nData do Protesto Mais Recente: {{protestos.dataRecente}}",
        },
      },
    ],
  },
  {
    id: "block-footer",
    name: "Rodapé Institucional",
    description: "Rodapé com número de página, data, hora e termos de uso",
    category: "footer",
    color: "#64748b",
    elements: [
      {
        type: "divider",
        name: "Linha Divisória Rodapé",
        x: 0,
        y: 0,
        width: 790,
        height: 1,
        style: {
          background: "#cbd5e1",
        },
      },
      {
        type: "text",
        name: "Texto de Copyright e Avisos",
        x: 20,
        y: 12,
        width: 550,
        height: 30,
        style: {
          fontSize: 9,
          color: "#94a3b8",
        },
        data: {
          text: "Este documento contém informações estritamente confidenciais e de uso exclusivo do destinatário autorizado.\nCopyright © Consultas PRO. Todos os direitos reservados. Suporte: suporte@consultaspro.com.br",
        },
      },
      {
        type: "text",
        name: "Numeração Página",
        x: 650,
        y: 12,
        width: 120,
        height: 15,
        style: {
          fontSize: 10,
          textAlign: "right",
          color: "#64748b",
          fontWeight: 600,
        },
        data: {
          text: "Página 1 de 1",
        },
      },
    ],
  },
  {
    id: "block-classic-score",
    name: "Score Clássico (Velocímetro)",
    description: "Score clássico com velocímetro SVG interativo, métricas de probabilidade e recomendação",
    category: "content",
    color: "#16a34a",
    elements: [
      {
        type: "container",
        name: "Score Clássico SVG",
        x: 0,
        y: 0,
        width: 790,
        height: 320,
        style: {
          padding: 0,
        },
        data: {
          customHtml: `<style>
.classic-score-card {
  font-family: 'Inter', sans-serif;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px 20px;
  box-sizing: border-box;
  color: #1e293b;
  width: 100%;
  height: 100%;
}
.classic-score-hero {
  margin-bottom: 8px;
}
.classic-score-headline {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px 0;
}
.classic-score-subtitulo {
  font-size: 10px;
  color: #64748b;
  margin: 0;
}
.classic-score-content-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}
.classic-score-visual {
  position: relative;
  width: 170px;
  flex-shrink: 0;
  text-align: center;
}
.classic-score-svg {
  width: 100%;
  height: 95px;
  display: block;
}
.classic-score-number {
  font-size: 26px;
  font-weight: 800;
  color: #1e293b;
  margin-top: -15px;
}
.classic-score-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #65a30d;
}
.classic-score-metrics-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
.classic-score-metric-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
}
.classic-score-metric-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.classic-score-metric-value {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}
.classic-score-metric-desc {
  font-size: 9px;
  color: #64748b;
  margin-top: 1px;
  line-height: 1.2;
}
.classic-score-bands-legend {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 10px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 8px;
}
.classic-score-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: #475569;
}
.classic-score-legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.classic-score-frase-interpretacao {
  font-size: 10px;
  color: #334155;
  background: #f0fdf4;
  border-left: 3px solid #16a34a;
  border-radius: 0 6px 6px 0;
  padding: 6px 10px;
  margin: 10px 0 0 0;
  line-height: 1.4;
}
.classic-score-influencia-block {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}
.classic-score-block-title {
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.classic-score-influencia-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.classic-score-influencia-list li {
  font-size: 9px;
  color: #475569;
  position: relative;
  padding-left: 10px;
}
.classic-score-influencia-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #3b82f6;
  font-weight: bold;
}
</style>
<div class="classic-score-card">
  <div class="classic-score-hero">
    <h2 class="classic-score-headline">{{scoreHeadline}}</h2>
    <p class="classic-score-subtitulo">{{scoreSubtitulo}}</p>
  </div>
  <div class="classic-score-content-row">
    <div class="classic-score-visual">
      <svg viewBox="0 0 200 110" class="classic-score-svg">
        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round" />
        <path d="M 20 90 A 80 80 0 0 1 35.28 42.98" fill="none" stroke="#ef4444" stroke-width="14" stroke-linecap="round" />
        <path d="M 35.28 42.98 A 80 80 0 0 1 75.28 13.91" fill="none" stroke="#f97316" stroke-width="14" stroke-linecap="round" />
        <path d="M 75.28 13.91 A 80 80 0 0 1 124.72 13.91" fill="none" stroke="#eab308" stroke-width="14" stroke-linecap="round" />
        <path d="M 124.72 13.91 A 80 80 0 0 1 164.72 42.98" fill="none" stroke="#84cc16" stroke-width="14" stroke-linecap="round" />
        <path d="M 164.72 42.98 A 80 80 0 0 1 180 90" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round" />
        <circle cx="{{scorePointer.x}}" cy="{{scorePointer.y}}" r="7" fill="{{scoreBandColor}}" stroke="#fff" stroke-width="2" />
        <circle cx="{{scorePointer.x}}" cy="{{scorePointer.y}}" r="3" fill="#fff" />
        <line x1="100" y1="90" x2="{{scorePointer.x}}" y2="{{scorePointer.y}}" stroke="{{scoreBandColor}}" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="100" cy="90" r="6" fill="#fff" stroke="#e2e8f0" stroke-width="1" />
        <circle cx="100" cy="90" r="2" fill="#94a3b8" />
        <text x="15" y="105" font-size="10" fill="#94a3b8" font-weight="700">0</text>
        <text x="165" y="105" font-size="10" fill="#94a3b8" font-weight="700">1000</text>
      </svg>
      <div class="classic-score-number">{{score}}</div>
      <div class="classic-score-label" style="color: {{scoreBandColor}}">{{scoreBandLabel}}</div>
    </div>
    <div class="classic-score-metrics-row">
      <div class="classic-score-metric-box">
        <span class="classic-score-metric-label">Faixa</span>
        <span class="classic-score-metric-value" style="color: {{scoreBandColor}}">{{scoreBandRange}}</span>
        <span class="classic-score-metric-desc">{{scoreFaixaDescription}}</span>
      </div>
      <div class="classic-score-metric-box">
        <span class="classic-score-metric-label">Adimplência (6m)</span>
        <span class="classic-score-metric-value">{{scoreProbabilityPayment}}%</span>
        <span class="classic-score-metric-desc">{{scoreProbPaymentDescription}}</span>
      </div>
      <div class="classic-score-metric-box">
        <span class="classic-score-metric-label">Inadimplência</span>
        <span class="classic-score-metric-value" style="color: #ef4444">{{scoreProbabilityDefault}}%</span>
        <span class="classic-score-metric-desc">{{scoreProbDefaultDescription}}</span>
      </div>
    </div>
  </div>
  <div class="classic-score-bands-legend">
    <div class="classic-score-legend-item">
      <span class="classic-score-legend-dot" style="background:#dc2626;"></span>
      <span>Péssimo (0-200)</span>
    </div>
    <div class="classic-score-legend-item">
      <span class="classic-score-legend-dot" style="background:#ea580c;"></span>
      <span>Ruim (201-400)</span>
    </div>
    <div class="classic-score-legend-item">
      <span class="classic-score-legend-dot" style="background:#ca8a04;"></span>
      <span>Regular (401-600)</span>
    </div>
    <div class="classic-score-legend-item">
      <span class="classic-score-legend-dot" style="background:#65a30d;"></span>
      <span>Bom (601-800)</span>
    </div>
    <div class="classic-score-legend-item">
      <span class="classic-score-legend-dot" style="background:#16a34a;"></span>
      <span>Ótimo (801-1000)</span>
    </div>
  </div>
  <p class="classic-score-frase-interpretacao"><strong>Análise:</strong> {{scoreFraseInterpretacao}}</p>
  <div class="classic-score-influencia-block">
    <div class="classic-score-block-title">{{scoreInfluenciaTitulo}}</div>
    <ul class="classic-score-influencia-list">
      <li>{{scoreInfluencia1}}</li>
      <li>{{scoreInfluencia2}}</li>
      <li>{{scoreInfluencia3}}</li>
    </ul>
  </div>
</div>`,
        },
      },
    ],
  },
];

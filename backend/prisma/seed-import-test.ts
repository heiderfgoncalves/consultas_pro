import 'dotenv/config';
import { PrismaClient, TemplateVisibility } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do template canônico 'Import_test_1'...");

  // Definição das 3 páginas do relatório (Frames A4 Verticais)
  const frames = [
    {
      id: "frame_page_1",
      name: "Página 1 (Resumo & Score)",
      preset: "a4-p",
      x: 10,
      y: 10,
      width: 794,
      height: 1123,
      background: "#ffffff"
    },
    {
      id: "frame_page_2",
      name: "Página 2 (Serasa & SPC)",
      preset: "a4-p",
      x: 10,
      y: 1153, // 10 + 1123 + 20px gap
      width: 794,
      height: 1123,
      background: "#ffffff"
    },
    {
      id: "frame_page_3",
      name: "Página 3 (SCPC & Protestos)",
      preset: "a4-p",
      x: 10,
      y: 2296, // 1153 + 1123 + 20px gap
      width: 794,
      height: 1123,
      background: "#ffffff"
    }
  ];

  // Definição de todos os elementos canônicos do template, posicionados de forma impecável
  const elements = [
    // ==========================================
    // PÁGINA 1: CABEÇALHO E METADADOS
    // ==========================================
    {
      id: "el_logo_p1",
      type: "image",
      frameId: "frame_page_1",
      x: 40,
      y: 30,
      width: 150,
      height: 50,
      zIndex: 1,
      style: {},
      data: {
        src: "{{logoDataUrl}}",
        fit: "contain"
      }
    },
    {
      id: "el_title_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 460,
      y: 30,
      width: 310,
      height: 25,
      zIndex: 2,
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#4f46e5",
        textAlign: "right"
      },
      data: {
        text: "Relatório Analítico de Crédito"
      }
    },
    {
      id: "el_meta_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 460,
      y: 55,
      width: 310,
      height: 35,
      zIndex: 3,
      style: {
        fontSize: 10,
        color: "#64748b",
        textAlign: "right"
      },
      data: {
        text: "{{consultationDate}}\nPROT: {{protocol}}"
      }
    },
    {
      id: "el_div_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 40,
      y: 95,
      width: 734,
      height: 3,
      zIndex: 4,
      style: {
        background: "#6366f1"
      },
      data: {}
    },

    // ==========================================
    // PÁGINA 1: CARD DO CLIENTE ANALISADO (100% NATIVO)
    // ==========================================
    {
      id: "el_client_card_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 40,
      y: 110,
      width: 734,
      height: 70,
      zIndex: 5,
      style: {
        background: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12
      },
      data: {}
    },
    // Seção Cliente
    {
      id: "el_client_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 55,
      y: 127,
      width: 36,
      height: 36,
      zIndex: 6,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "User",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_client_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 102,
      y: 124,
      width: 170,
      height: 15,
      zIndex: 7,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "CLIENTE ANALISADO"
      }
    },
    {
      id: "el_client_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 102,
      y: 140,
      width: 170,
      height: 20,
      zIndex: 8,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0f172a"
      },
      data: {
        text: "{{clientName}}"
      }
    },
    // Seção Documento
    {
      id: "el_doc_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 300,
      y: 127,
      width: 36,
      height: 36,
      zIndex: 9,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "CreditCard",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_doc_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 347,
      y: 124,
      width: 170,
      height: 15,
      zIndex: 10,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "DOCUMENTO"
      }
    },
    {
      id: "el_doc_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 347,
      y: 140,
      width: 170,
      height: 20,
      zIndex: 11,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0f172a",
        fontFamily: "monospace"
      },
      data: {
        text: "{{formatCpfCnpj clientCpf}}"
      }
    },
    // Seção Tipo de Relatório
    {
      id: "el_rep_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 545,
      y: 127,
      width: 36,
      height: 36,
      zIndex: 12,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "FileText",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_rep_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 592,
      y: 124,
      width: 170,
      height: 15,
      zIndex: 13,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "TIPO DE RELATÓRIO"
      }
    },
    {
      id: "el_rep_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 592,
      y: 140,
      width: 170,
      height: 20,
      zIndex: 14,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0f172a"
      },
      data: {
        text: "{{#if Bacen}}Premium (Completa){{else}}Padrão{{/if}}"
      }
    },

    // ==========================================
    // PÁGINA 1: SEÇÃO RESUMO FINANCEIRO (HEADER & DIVIDERS NATIVOS)
    // ==========================================
    {
      id: "el_resumo_header_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 40,
      y: 195,
      width: 28,
      height: 28,
      zIndex: 15,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "TrendingUp",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_resumo_header_text_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 78,
      y: 201,
      width: 150,
      height: 20,
      zIndex: 16,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "RESUMO FINANCEIRO"
      }
    },
    {
      id: "el_resumo_header_div_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 232,
      y: 209,
      width: 542,
      height: 2,
      zIndex: 17,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },

    // ==========================================
    // PÁGINA 1: KPIS (100% DESENHADOS NATIVAMENTE)
    // ==========================================
    // KPI 1: Total Apontado (Red Strip)
    {
      id: "el_kpi1_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 40,
      y: 235,
      width: 230,
      height: 75,
      zIndex: 18,
      style: {
        background: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12
      },
      data: {}
    },
    {
      id: "el_kpi1_strip_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 40,
      y: 235,
      width: 4,
      height: 75,
      zIndex: 19,
      style: {
        background: "#dc2626"
      },
      data: {}
    },
    {
      id: "el_kpi1_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 54,
      y: 242,
      width: 210,
      height: 15,
      zIndex: 20,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "TOTAL APONTADO"
      }
    },
    {
      id: "el_kpi1_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 54,
      y: 258,
      width: 210,
      height: 25,
      zIndex: 21,
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#dc2626"
      },
      data: {
        text: "{{calc \"sum(scpc, 'Vr Dívida') + sum(serasaPremium, 'Vr Dívida') + sum(refinPefin, 'Vr Dívida') + sum(protesto, 'Valor Protesto')\"}}"
      }
    },
    {
      id: "el_kpi1_sub_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 54,
      y: 286,
      width: 210,
      height: 15,
      zIndex: 22,
      style: {
        fontSize: 9,
        color: "#94a3b8"
      },
      data: {
        text: "Soma bruta de apontamentos"
      }
    },

    // KPI 2: Total Deduzido (Green Strip)
    {
      id: "el_kpi2_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 292,
      y: 235,
      width: 230,
      height: 75,
      zIndex: 23,
      style: {
        background: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12
      },
      data: {}
    },
    {
      id: "el_kpi2_strip_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 292,
      y: 235,
      width: 4,
      height: 75,
      zIndex: 24,
      style: {
        background: "#16a34a"
      },
      data: {}
    },
    {
      id: "el_kpi2_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 306,
      y: 242,
      width: 210,
      height: 15,
      zIndex: 25,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "TOTAL DEDUZIDO"
      }
    },
    {
      id: "el_kpi2_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 306,
      y: 258,
      width: 210,
      height: 25,
      zIndex: 26,
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#16a34a"
      },
      data: {
        text: "{{calc \"sum(scpc, 'Vr Dívida') + sum(serasaPremium, 'Vr Dívida') + sum(refinPefin, 'Vr Dívida') + sum(protesto, 'Valor Protesto')\"}}"
      }
    },
    {
      id: "el_kpi2_sub_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 306,
      y: 286,
      width: 210,
      height: 15,
      zIndex: 27,
      style: {
        fontSize: 9,
        color: "#94a3b8"
      },
      data: {
        text: "Sem duplicidades"
      }
    },

    // KPI 3: Risco Bacen (Amber Strip)
    {
      id: "el_kpi3_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 544,
      y: 235,
      width: 230,
      height: 75,
      zIndex: 28,
      style: {
        background: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12
      },
      data: {}
    },
    {
      id: "el_kpi3_strip_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 544,
      y: 235,
      width: 4,
      height: 75,
      zIndex: 29,
      style: {
        background: "#ca8a04"
      },
      data: {}
    },
    {
      id: "el_kpi3_lbl_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 558,
      y: 242,
      width: 210,
      height: 15,
      zIndex: 30,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b"
      },
      data: {
        text: "RISCO BACEN (VENCIDO)"
      }
    },
    {
      id: "el_kpi3_val_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 558,
      y: 258,
      width: 210,
      height: 25,
      zIndex: 31,
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#b45309"
      },
      data: {
        text: "{{#if Bacen}}R$ {{formatBacenCurrency Bacen.valorVencido}}{{else}}R$ 0,00{{/if}}"
      }
    },
    {
      id: "el_kpi3_sub_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 558,
      y: 286,
      width: 210,
      height: 15,
      zIndex: 32,
      style: {
        fontSize: 9,
        color: "#94a3b8"
      },
      data: {
        text: "Prejuízo + Vencido"
      }
    },

    // ==========================================
    // PÁGINA 1: SEÇÃO SCORE DE CRÉDITO (HEADER NATIVO)
    // ==========================================
    {
      id: "el_score_header_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 40,
      y: 330,
      width: 28,
      height: 28,
      zIndex: 33,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "Activity",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_header_text_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 78,
      y: 336,
      width: 150,
      height: 20,
      zIndex: 34,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "SCORE DE CRÉDITO"
      }
    },
    {
      id: "el_score_header_div_p1",
      type: "divider",
      frameId: "frame_page_1",
      x: 212,
      y: 344,
      width: 562,
      height: 2,
      zIndex: 35,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },

    // ==========================================
    // PÁGINA 1: COMPOSITE CARD SCORE (CANÔNICO)
    // ==========================================
    // Fundo do Card
    {
      id: "el_score_card_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 40,
      y: 365,
      width: 734,
      height: 680,
      zIndex: 36,
      style: {
        background: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12
      },
      data: {}
    },
    // Manchete do Score
    {
      id: "el_score_headline_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 60,
      y: 385,
      width: 694,
      height: 22,
      zIndex: 37,
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#0f172a"
      },
      data: {
        text: "{{scoreHeadline}}"
      }
    },
    {
      id: "el_score_subtitle_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 60,
      y: 407,
      width: 694,
      height: 18,
      zIndex: 38,
      style: {
        fontSize: 10,
        color: "#64748b"
      },
      data: {
        text: "{{scoreSubtitulo}}"
      }
    },
    // Velocímetro SVG Dinâmico (Componente de Alta Qualidade)
    {
      id: "el_score_speedometer_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 60,
      y: 435,
      width: 175,
      height: 160,
      zIndex: 39,
      style: {},
      data: {
        text: "html:<div style='position:relative;width:100%;text-align:center;'><svg viewBox='0 0 200 110' style='width:100%;height:105px;display:block;'><path d='M 20 90 A 80 80 0 0 1 180 90' fill='none' stroke='#e5e7eb' stroke-width='14' stroke-linecap='round' /><path d='M 20 90 A 80 80 0 0 1 35.28 42.98' fill='none' stroke='#ef4444' stroke-width='14' stroke-linecap='round' /><path d='M 35.28 42.98 A 80 80 0 0 1 75.28 13.91' fill='none' stroke='#f97316' stroke-width='14' stroke-linecap='round' /><path d='M 75.28 13.91 A 80 80 0 0 1 124.72 13.91' fill='none' stroke='#eab308' stroke-width='14' stroke-linecap='round' /><path d='M 124.72 13.91 A 80 80 0 0 1 164.72 42.98' fill='none' stroke='#84cc16' stroke-width='14' stroke-linecap='round' /><path d='M 164.72 42.98 A 80 80 0 0 1 180 90' fill='none' stroke='#22c55e' stroke-width='14' stroke-linecap='round' /><circle cx='{{scorePointer.x}}' cy='{{scorePointer.y}}' r='7' fill='{{scoreBandColor}}' stroke='#fff' stroke-width='2' /><circle cx='{{scorePointer.x}}' cy='{{scorePointer.y}}' r='3' fill='#fff' /><line x1='100' y1='90' x2='{{scorePointer.x}}' y2='{{scorePointer.y}}' stroke='{{scoreBandColor}}' stroke-width='2.5' stroke-linecap='round' /><circle cx='100' cy='90' r='6' fill='#fff' stroke='#e2e8f0' stroke-width='1' /><circle cx='100' cy='90' r='2' fill='#94a3b8' /><text x='15' y='110' font-size='10' fill='#94a3b8' font-weight='700'>0</text><text x='165' y='110' font-size='10' fill='#94a3b8' font-weight='700'>1000</text></svg><div style='font-size:28px;font-weight:700;color:{{scoreBandColor}};margin-top:5px;font-family:sans-serif;'>{{score}}</div><div style='font-size:10px;font-weight:700;text-transform:uppercase;color:{{scoreBandColor}};margin-top:2px;font-family:sans-serif;'>{{scoreBandLabel}}</div></div>"
      }
    },
    // Painel de Detalhes do Score (Lado Direito)
    // 1. Faixa
    {
      id: "el_score_det_icon1_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 260,
      y: 440,
      width: 28,
      height: 28,
      zIndex: 40,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "Compass",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_det_text1_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 298,
      y: 438,
      width: 440,
      height: 35,
      zIndex: 41,
      style: {
        fontSize: 10,
        lineHeight: 1.4
      },
      data: {
        text: "html:<span style='font-size:11px;font-weight:600;color:#1e293b;font-family:sans-serif;'>Faixa: <span style='color:{{scoreBandColor}};'>{{scoreBandRange}}</span></span><br/><span style='color:#64748b;font-family:sans-serif;'>{{scoreFaixaDescription}}</span>"
      }
    },
    // 2. Chance de pagar
    {
      id: "el_score_det_icon2_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 260,
      y: 485,
      width: 28,
      height: 28,
      zIndex: 42,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "CheckCircle2",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_det_text2_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 298,
      y: 483,
      width: 440,
      height: 35,
      zIndex: 43,
      style: {
        fontSize: 10,
        lineHeight: 1.4
      },
      data: {
        text: "html:<span style='font-size:11px;font-weight:600;color:#1e293b;font-family:sans-serif;'>Chance de pagar (6 meses): {{scoreProbabilityPayment}}%</span><br/><span style='color:#64748b;font-family:sans-serif;'>{{scoreProbPaymentDescription}}</span>"
      }
    },
    // 3. Inadimplência
    {
      id: "el_score_det_icon3_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 260,
      y: 530,
      width: 28,
      height: 28,
      zIndex: 44,
      style: {
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "AlertTriangle",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_det_text3_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 298,
      y: 528,
      width: 440,
      height: 35,
      zIndex: 45,
      style: {
        fontSize: 10,
        lineHeight: 1.4
      },
      data: {
        text: "html:<span style='font-size:11px;font-weight:600;color:#1e293b;font-family:sans-serif;'>Probabilidade de inadimplência: {{scoreProbabilityDefault}}%</span><br/><span style='color:#64748b;font-family:sans-serif;'>{{scoreProbDefaultDescription}}</span>"
      }
    },
    // Faixas de Legenda Inferior
    {
      id: "el_score_ribbon_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 60,
      y: 585,
      width: 694,
      height: 25,
      zIndex: 46,
      style: {},
      data: {
        text: "html:<div style='display:flex;justify-content:space-between;margin:0;padding:6px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;font-size:9px;font-family:sans-serif;box-sizing:border-box;'><div style='display:flex;align-items:center;gap:4px;'><span style='width:6px;height:6px;border-radius:50%;background:#dc2626;'></span><span style='font-weight:600;color:#1e293b;'>Péssimo</span> <span style='color:#64748b;'>0-200</span></div><div style='display:flex;align-items:center;gap:4px;'><span style='width:6px;height:6px;border-radius:50%;background:#ea580c;'></span><span style='font-weight:600;color:#1e293b;'>Ruim</span> <span style='color:#64748b;'>201-400</span></div><div style='display:flex;align-items:center;gap:4px;'><span style='width:6px;height:6px;border-radius:50%;background:#ca8a04;'></span><span style='font-weight:600;color:#1e293b;'>Regular</span> <span style='color:#64748b;'>401-600</span></div><div style='display:flex;align-items:center;gap:4px;'><span style='width:6px;height:6px;border-radius:50%;background:#65a30d;'></span><span style='font-weight:600;color:#1e293b;'>Bom</span> <span style='color:#64748b;'>601-800</span></div><div style='display:flex;align-items:center;gap:4px;'><span style='width:6px;height:6px;border-radius:50%;background:#16a34a;'></span><span style='font-weight:600;color:#1e293b;'>Ótimo</span> <span style='color:#64748b;'>801-1000</span></div></div>"
      }
    },
    // Frase de Interpretação
    {
      id: "el_score_interpret_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 60,
      y: 622,
      width: 694,
      height: 38,
      zIndex: 47,
      style: {
        fontSize: 10,
        color: "#334155",
        lineHeight: 1.4
      },
      data: {
        text: "html:<span style='font-style:italic;font-family:sans-serif;'>{{scoreFraseInterpretacao}}</span>"
      }
    },
    // Box de Influência (Container Nativizado)
    {
      id: "el_score_influ_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 60,
      y: 672,
      width: 694,
      height: 140,
      zIndex: 48,
      style: {
        background: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8
      },
      data: {}
    },
    {
      id: "el_score_influ_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 75,
      y: 687,
      width: 22,
      height: 22,
      zIndex: 49,
      style: {
        color: "#475569"
      },
      data: {
        name: "Activity",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_influ_body_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 105,
      y: 685,
      width: 634,
      height: 115,
      zIndex: 50,
      style: {
        fontSize: 9,
        color: "#475569",
        lineHeight: 1.4
      },
      data: {
        text: "html:<div style='font-weight:700;color:#1e293b;margin-bottom:3px;font-family:sans-serif;'>{{scoreInfluenciaTitulo}}</div><p style='margin:0 0 4px 0;font-family:sans-serif;'>{{scoreInfluenciaTexto}}</p><ul style='margin:0;padding-left:15px;list-style-type:disc;font-family:sans-serif;'>{{#each scoreInfluenciaLista}}<li>{{this}}</li>{{/each}}</ul>"
      }
    },
    // Box de Diagnóstico (Green Container Nativizado)
    {
      id: "el_score_diag_bg_p1",
      type: "container",
      frameId: "frame_page_1",
      x: 60,
      y: 825,
      width: 694,
      height: 100,
      zIndex: 51,
      style: {
        background: "#ecfdf5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        borderRadius: 8
      },
      data: {}
    },
    {
      id: "el_score_diag_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 75,
      y: 840,
      width: 22,
      height: 22,
      zIndex: 52,
      style: {
        color: "#065f46"
      },
      data: {
        name: "ShieldCheck",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_score_diag_body_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 105,
      y: 838,
      width: 634,
      height: 75,
      zIndex: 53,
      style: {
        fontSize: 9,
        color: "#065f46",
        lineHeight: 1.4
      },
      data: {
        text: "html:<div style='font-weight:700;margin-bottom:3px;font-family:sans-serif;'>{{scoreDiagnosticoTitulo}}</div><p style='margin:0;font-family:sans-serif;'>{{scoreDiagnosticoTexto}}</p>"
      }
    },
    // Aviso de Atenção Inferior
    {
      id: "el_score_warn_icon_p1",
      type: "icon",
      frameId: "frame_page_1",
      x: 60,
      y: 938,
      width: 14,
      height: 14,
      zIndex: 54,
      style: {
        color: "#94a3b8"
      },
      data: {
        name: "AlertCircle"
      }
    },
    {
      id: "el_score_warn_text_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 80,
      y: 935,
      width: 674,
      height: 35,
      zIndex: 55,
      style: {
        fontSize: 8,
        color: "#94a3b8",
        lineHeight: 1.3
      },
      data: {
        text: "html:<span style='font-family:sans-serif;'><b>Atenção:</b> score e faixas são indicadores estatísticos e não garantem aprovação de crédito. A decisão final é do credor. O objetivo deste relatório é analisar os motivos de negativa e identificar o que está impactando no seu crédito.</span>"
      }
    },
    // Rodapé Página 1
    {
      id: "el_footer_p1",
      type: "text",
      frameId: "frame_page_1",
      x: 40,
      y: 1070,
      width: 734,
      height: 30,
      zIndex: 56,
      style: {
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center"
      },
      data: {
        text: "Consultas PRO — Relatório de Crédito • Página 1"
      }
    },


    // ==========================================
    // PÁGINA 2: CABEÇALHO E DIVIDERS
    // ==========================================
    {
      id: "el_logo_p2",
      type: "image",
      frameId: "frame_page_2",
      x: 40,
      y: 1173,
      width: 120,
      height: 40,
      zIndex: 1,
      style: {},
      data: {
        src: "{{logoDataUrl}}",
        fit: "contain"
      }
    },
    {
      id: "el_title_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 460,
      y: 1173,
      width: 310,
      height: 25,
      zIndex: 2,
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#4f46e5",
        textAlign: "right"
      },
      data: {
        text: "Relatório Analítico de Crédito"
      }
    },
    {
      id: "el_meta_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 460,
      y: 1193,
      width: 310,
      height: 25,
      zIndex: 3,
      style: {
        fontSize: 8,
        color: "#64748b",
        textAlign: "right"
      },
      data: {
        text: "{{consultationDate}} • PROT: {{protocol}}"
      }
    },
    {
      id: "el_div_p2",
      type: "divider",
      frameId: "frame_page_2",
      x: 40,
      y: 1218,
      width: 734,
      height: 2,
      zIndex: 4,
      style: {
        background: "#6366f1"
      },
      data: {}
    },

    // ==========================================
    // PÁGINA 2: SERASA - BASE I (HEADER & TABELA NATIVOS)
    // ==========================================
    {
      id: "el_serasa_header_icon_p2",
      type: "icon",
      frameId: "frame_page_2",
      x: 40,
      y: 1233,
      width: 24,
      height: 24,
      zIndex: 5,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "Database",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_serasa_header_text_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 72,
      y: 1236,
      width: 150,
      height: 20,
      zIndex: 6,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "Serasa - Base I"
      }
    },
    {
      id: "el_serasa_header_div_p2",
      type: "divider",
      frameId: "frame_page_2",
      x: 232,
      y: 1244,
      width: 440,
      height: 2,
      zIndex: 7,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },
    {
      id: "el_serasa_badge_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 682,
      y: 1234,
      width: 92,
      height: 22,
      zIndex: 8,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
        background: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 999,
        textAlign: "center",
        padding: 4
      },
      data: {
        text: "{{count serasaPremium}} registros"
      }
    },
    {
      id: "el_serasa_table_p2",
      type: "table",
      frameId: "frame_page_2",
      x: 40,
      y: 1273,
      width: 734,
      height: 360,
      zIndex: 9,
      style: {
        background: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 12
      },
      data: {
        arrayPath: "serasaPremium",
        columns: [
          { label: "Inclusão", path: "Data Inclusão" },
          { label: "Vencimento", path: "Data Vencimento" },
          { label: "Natureza / Tipo", path: "Tp Devedor" },
          { label: "Origem / Credor", path: "Origem" },
          { label: "Contrato", path: "Contrato" },
          { label: "Valor (R$)", path: "Vr Dívida", format: "currency" }
        ]
      }
    },

    // ==========================================
    // PÁGINA 2: SPC BRASIL - BASE II (HEADER & TABELA NATIVOS)
    // ==========================================
    {
      id: "el_spc_header_icon_p2",
      type: "icon",
      frameId: "frame_page_2",
      x: 40,
      y: 1663,
      width: 24,
      height: 24,
      zIndex: 10,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "Database",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_spc_header_text_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 72,
      y: 1666,
      width: 150,
      height: 20,
      zIndex: 11,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "SPC Brasil - Base II"
      }
    },
    {
      id: "el_spc_header_div_p2",
      type: "divider",
      frameId: "frame_page_2",
      x: 232,
      y: 1674,
      width: 440,
      height: 2,
      zIndex: 12,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },
    {
      id: "el_spc_badge_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 682,
      y: 1664,
      width: 92,
      height: 22,
      zIndex: 13,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
        background: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 999,
        textAlign: "center",
        padding: 4
      },
      data: {
        text: "{{count spc}} registros"
      }
    },
    {
      id: "el_spc_table_p2",
      type: "table",
      frameId: "frame_page_2",
      x: 40,
      y: 1703,
      width: 734,
      height: 320,
      zIndex: 14,
      style: {
        background: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 12
      },
      data: {
        arrayPath: "spc",
        columns: [
          { label: "Inclusão", path: "Data Inclusão" },
          { label: "Vencimento", path: "Data Vencimento" },
          { label: "Origem", path: "Origem" },
          { label: "Contrato", path: "Contrato" },
          { label: "Valor (R$)", path: "Vr Dívida", format: "currency" }
        ]
      }
    },
    // Rodapé Página 2
    {
      id: "el_footer_p2",
      type: "text",
      frameId: "frame_page_2",
      x: 40,
      y: 2213,
      width: 734,
      height: 30,
      zIndex: 15,
      style: {
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center"
      },
      data: {
        text: "Consultas PRO — Relatório de Crédito • Página 2"
      }
    },


    // ==========================================
    // PÁGINA 3: CABEÇALHO E DIVIDERS
    // ==========================================
    {
      id: "el_logo_p3",
      type: "image",
      frameId: "frame_page_3",
      x: 40,
      y: 2316,
      width: 120,
      height: 40,
      zIndex: 1,
      style: {},
      data: {
        src: "{{logoDataUrl}}",
        fit: "contain"
      }
    },
    {
      id: "el_title_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 460,
      y: 2316,
      width: 310,
      height: 25,
      zIndex: 2,
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#4f46e5",
        textAlign: "right"
      },
      data: {
        text: "Relatório Analítico de Crédito"
      }
    },
    {
      id: "el_meta_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 460,
      y: 2336,
      width: 310,
      height: 25,
      zIndex: 3,
      style: {
        fontSize: 8,
        color: "#64748b",
        textAlign: "right"
      },
      data: {
        text: "{{consultationDate}} • PROT: {{protocol}}"
      }
    },
    {
      id: "el_div_p3",
      type: "divider",
      frameId: "frame_page_3",
      x: 40,
      y: 2361,
      width: 734,
      height: 2,
      zIndex: 4,
      style: {
        background: "#6366f1"
      },
      data: {}
    },

    // ==========================================
    // PÁGINA 3: BOA VISTA SCPC - BASE III (HEADER & TABELA NATIVOS)
    // ==========================================
    {
      id: "el_scpc_header_icon_p3",
      type: "icon",
      frameId: "frame_page_3",
      x: 40,
      y: 2376,
      width: 24,
      height: 24,
      zIndex: 5,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "Database",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_scpc_header_text_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 72,
      y: 2379,
      width: 180,
      height: 20,
      zIndex: 6,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "Boa Vista SCPC - Base III"
      }
    },
    {
      id: "el_scpc_header_div_p3",
      type: "divider",
      frameId: "frame_page_3",
      x: 262,
      y: 2387,
      width: 410,
      height: 2,
      zIndex: 7,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },
    {
      id: "el_scpc_badge_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 682,
      y: 2377,
      width: 92,
      height: 22,
      zIndex: 8,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
        background: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 999,
        textAlign: "center",
        padding: 4
      },
      data: {
        text: "{{count scpc}} registros"
      }
    },
    {
      id: "el_scpc_table_p3",
      type: "table",
      frameId: "frame_page_3",
      x: 40,
      y: 2416,
      width: 734,
      height: 360,
      zIndex: 9,
      style: {
        background: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 12
      },
      data: {
        arrayPath: "scpc",
        columns: [
          { label: "Ocorrência", path: "Dt Ocorr" },
          { label: "Credor", path: "Nome" },
          { label: "Cidade", path: "Cidade" },
          { label: "Contrato", path: "Contrato" },
          { label: "Valor (R$)", path: "Vr Dívida", format: "currency" }
        ]
      }
    },

    // ==========================================
    // PÁGINA 3: PROTESTOS EM CARTÓRIO (HEADER & TABELA NATIVOS)
    // ==========================================
    {
      id: "el_protesto_header_icon_p3",
      type: "icon",
      frameId: "frame_page_3",
      x: 40,
      y: 2806,
      width: 24,
      height: 24,
      zIndex: 10,
      style: {
        color: "#334155",
        background: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      },
      data: {
        name: "AlertTriangle",
        strokeWidth: 1.5
      }
    },
    {
      id: "el_protesto_header_text_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 72,
      y: 2809,
      width: 180,
      height: 20,
      zIndex: 11,
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#334155"
      },
      data: {
        text: "Protestos em Cartório"
      }
    },
    {
      id: "el_protesto_header_div_p3",
      type: "divider",
      frameId: "frame_page_3",
      x: 262,
      y: 2817,
      width: 410,
      height: 2,
      zIndex: 12,
      style: {
        background: "#e2e8f0"
      },
      data: {}
    },
    {
      id: "el_protesto_badge_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 682,
      y: 2807,
      width: 92,
      height: 22,
      zIndex: 13,
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
        background: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 999,
        textAlign: "center",
        padding: 4
      },
      data: {
        text: "{{count protesto}} registros"
      }
    },
    {
      id: "el_protesto_table_p3",
      type: "table",
      frameId: "frame_page_3",
      x: 40,
      y: 2846,
      width: 734,
      height: 320,
      zIndex: 14,
      style: {
        background: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 12
      },
      data: {
        arrayPath: "protesto",
        columns: [
          { label: "Data", path: "Data" },
          { label: "Cartório", path: "Cartório" },
          { label: "Local", path: "Cidade" },
          { label: "Valor (R$)", path: "Valor Protesto", format: "currency" }
        ]
      }
    },
    // Rodapé Página 3
    {
      id: "el_footer_p3",
      type: "text",
      frameId: "frame_page_3",
      x: 40,
      y: 3356,
      width: 734,
      height: 30,
      zIndex: 15,
      style: {
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center"
      },
      data: {
        text: "Consultas PRO — Relatório de Crédito • Página 3"
      }
    }
  ];

  // Montagem do ReportTemplate canônico
  const layout = {
    id: "import_test_1",
    name: "Import_test_1",
    version: 3,
    canvas: { background: "#f1f5f9", grid: 10 },
    frames: frames,
    elements: elements,
    metadata: {
      isImported: true,
      canonical: true,
      importedAt: new Date().toISOString()
    }
  };

  // Upsert do template global "Import_test_1" no banco de dados local
  const existing = await prisma.template.findFirst({
    where: { name: "Import_test_1", visibility: TemplateVisibility.GLOBAL }
  });

  if (existing) {
    await prisma.template.update({
      where: { id: existing.id },
      data: {
        layout: layout,
        description: "Template de análise de crédito de alto padrão (Import_test_1) totalmente integrado e canônico",
        visibility: TemplateVisibility.GLOBAL,
        updatedAt: new Date()
      }
    });
    console.log(`Template canônico 'Import_test_1' atualizado com sucesso! (ID: ${existing.id})`);
  } else {
    const created = await prisma.template.create({
      data: {
        name: "Import_test_1",
        description: "Template de análise de crédito de alto padrão (Import_test_1) totalmente integrado e canônico",
        visibility: TemplateVisibility.GLOBAL,
        layout: layout
      }
    });
    console.log(`Template canônico 'Import_test_1' criado com sucesso! (ID: ${created.id})`);
  }
}

main()
  .catch((e) => {
    console.error("Erro durante o seed canônico:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

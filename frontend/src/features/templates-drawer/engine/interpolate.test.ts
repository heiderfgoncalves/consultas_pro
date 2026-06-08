import { describe, it, expect } from "vitest";
import { interpolate } from "./interpolate";

describe("interpolate - dedup and engine tests", () => {
  const mockData = {
    // Tabela estruturada (com .linhas)
    DIVIDAS_SPC: {
      totaisCalculados: {
        valor: 1500.50,
        quantidade: 2
      },
      linhas: [
        { credor: "Banco A", valor: 500.50, data_ocorrencia: "01/10/2025" },
        { credor: "Banco A", valor: 500.50, data_ocorrencia: "01/10/2025" }, // Duplicado
        { credor: "Lojista B", valor: 1000.00, data_ocorrencia: "05/10/2025" }
      ]
    },
    // Array simples
    DIVIDAS_BOA_VISTA: [
      { credor: "SCPC SAO PAULO", valor: 700.00, data_ocorrencia: "25/12/2025" },
      { credor: "SCPC SAO PAULO", valor: 700.00, data_ocorrencia: "25/12/2025" } // Duplicado
    ]
  };

  it("deve deduplicar corretamente em uma tabela estruturada com propriedade .linhas", () => {
    // Dedup por credor e data_ocorrencia, depois faz a soma de valor.
    // O item duplicado (Banco A, 500.50) deve ser removido, restando um de 500.50 e outro de 1000.00 = 1500.00
    const result = interpolate("{{dedup(sum(DIVIDAS_SPC.valor), 'credor', 'data_ocorrencia')}}", mockData);
    expect(result).toBe("R$ 1.500,50");
  });

  it("deve deduplicar corretamente em um array direto", () => {
    // O item duplicado de 700.00 deve ser removido, restando apenas um = 700.00
    const result = interpolate("{{dedup(sum(DIVIDAS_BOA_VISTA.valor), 'credor', 'data_ocorrencia')}}", mockData);
    expect(result).toBe("R$ 700,00");
  });

  it("deve somar todas as ocorrências de $[*].valor cumulativamente", () => {
    // DIVIDAS_SPC.valor resolve para: [1500.50, 500.50, 500.50, 1000.00]
    // DIVIDAS_BOA_VISTA.valor resolve para: [700.00, 700.00]
    // Soma cumulativa total: 1500.50 + 500.50 + 500.50 + 1000.00 + 700.00 + 700.00 = 4901.50
    const result = interpolate("{{sum($[*].valor)}}", mockData);
    expect(result).toBe("R$ 4.901,50");
  });

  it("deve avaliar expressões lógicas IF, AND, OR com engine AST", () => {
    const dataScore = { SCORE_CREDITO: { score: 350 } };
    
    // Teste 1: Simples
    expect(interpolate("{{if($SCORE_CREDITO.score > 200, 'Ok', 'Ruim')}}", dataScore)).toBe("Ok");
    
    // Teste 2: if aninhado como no painel
    const formulaScore = "if($SCORE_CREDITO.score <= 200, 'Péssimo', if($SCORE_CREDITO.score <= 400, 'Ruim', if($SCORE_CREDITO.score <= 600, 'Regular', if($SCORE_CREDITO.score <= 800, 'Bom', 'Ótimo'))))";
    expect(interpolate("{{" + formulaScore + "}}", dataScore)).toBe("Ruim");
    expect(interpolate("{{" + formulaScore + "}}", { SCORE_CREDITO: { score: 100 } })).toBe("Péssimo");
    expect(interpolate("{{" + formulaScore + "}}", { SCORE_CREDITO: { score: 550 } })).toBe("Regular");
    expect(interpolate("{{" + formulaScore + "}}", { SCORE_CREDITO: { score: 950 } })).toBe("Ótimo");

    // Teste 3: AND e OR
    expect(interpolate("{{if(and($SCORE_CREDITO.score >= 0, $SCORE_CREDITO.score <= 200), 'Sim', 'Nao')}}", { SCORE_CREDITO: { score: 150 } })).toBe("Sim");
    expect(interpolate("{{if(and($SCORE_CREDITO.score >= 0, $SCORE_CREDITO.score <= 200), 'Sim', 'Nao')}}", { SCORE_CREDITO: { score: 250 } })).toBe("Nao");
    expect(interpolate("{{if(or($SCORE_CREDITO.score == 350, $SCORE_CREDITO.score == 400), 'Exato', 'Nao')}}", { SCORE_CREDITO: { score: 350 } })).toBe("Exato");
  });
});


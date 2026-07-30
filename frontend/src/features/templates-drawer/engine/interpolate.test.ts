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

    // Teste 4: Tratamento de nulos em operações lógicas e matemáticas (como 0)
    const dataNulls = {
      VAL_A: null,
      VAL_B: undefined,
      VAL_C: 15,
      // Array com valores nulos
      DIVIDAS: [
        { valor: 100 },
        { valor: null },
        { valor: 200 }
      ]
    };
    
    // sum de array com nulo deve resultar em 300 e formatar como R$ 300,00
    expect(interpolate("{{sum(DIVIDAS.valor)}}", dataNulls)).toBe("R$ 300,00");
    // min de array com nulo deve ser 0
    expect(interpolate("{{min(DIVIDAS.valor)}}", dataNulls)).toBe("R$ 0,00");
    // max de array com nulo deve ser 200
    expect(interpolate("{{max(DIVIDAS.valor)}}", dataNulls)).toBe("R$ 200,00");

    // operações binárias com nulos/indefinidos devem coagir para 0
    expect(interpolate("{{math($VAL_A + $VAL_C)}}", dataNulls)).toBe("15");
    expect(interpolate("{{math($VAL_A - $VAL_C)}}", dataNulls)).toBe("-15");
    expect(interpolate("{{math($VAL_B * $VAL_C)}}", dataNulls)).toBe("0");
    expect(interpolate("{{if($VAL_A >= 0, 'MaiorIgualZero', 'Menor')}}", dataNulls)).toBe("MaiorIgualZero");
    expect(interpolate("{{if($VAL_B == 0, 'Zero', 'NaoZero')}}", dataNulls)).toBe("Zero");
  });

  it("deve tratar o helper round sem lançar RangeError com decimais inválidos", () => {
    const data = { VAL: 123.4567, DEC_NEG: -1, DEC_NAN: "abc", DEC_HUGE: 50 };

    // Teste de toLocaleString no resolveVal
    expect(interpolate("{{round(VAL, 2)}}", data)).toBe("123,46");
    expect(interpolate("{{round(VAL, DEC_NEG)}}", data)).toBe("123");
    expect(interpolate("{{round(VAL, DEC_NAN)}}", data)).toBe("123");
    expect(interpolate("{{round(VAL)}}", data)).toBe("123");

    // Teste de toFixed no evaluateLogicAST (como na expressão do logic engine)
    expect(interpolate("{{calc(round(VAL, 1))}}", data)).toBe("123.5");
    expect(interpolate("{{calc(round(VAL, DEC_NEG))}}", data)).toBe("123");
    expect(interpolate("{{calc(round(VAL, DEC_NAN))}}", data)).toBe("123");
  });

  it("deve proteger textos dinâmicos e resumir imagens em base64", () => {
    const imagePayload = "A".repeat(2004);
    expect(
      interpolate("{{safeText NOME}}", {
        NOME: '<img src=x onerror=alert(1)>',
      }),
    ).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(
      interpolate("{{safeText FOTO}}", {
        FOTO: imagePayload,
      }),
    ).toBe("[Imagem preservada no retorno original da consulta]");
  });

  it("deve avaliar expressões CASE WHEN corretamente", () => {
    const dataScore = { SCORE_CREDITO: { score: 350 } };
    const formula = "case when $SCORE_CREDITO.score <= 200 then 'Péssimo' when $SCORE_CREDITO.score <= 400 then 'Ruim' else 'Bom' end";
    expect(interpolate("{{" + formula + "}}", dataScore)).toBe("Ruim");
    expect(interpolate("{{" + formula + "}}", { SCORE_CREDITO: { score: 100 } })).toBe("Péssimo");
    expect(interpolate("{{" + formula + "}}", { SCORE_CREDITO: { score: 500 } })).toBe("Bom");
  });

  it("deve avaliar declarações VAR / RETURN com variáveis locais no estilo PowerBI", () => {
    const dataScore = { SCORE_CREDITO: { score: 350 } };
    const formula = "VAR score = $SCORE_CREDITO.score VAR categoria = case when score <= 200 then 'Péssimo' when score <= 400 then 'Ruim' else 'Bom' end RETURN categoria";
    expect(interpolate("{{" + formula + "}}", dataScore)).toBe("Ruim");
    expect(interpolate("{{" + formula + "}}", { SCORE_CREDITO: { score: 500 } })).toBe("Bom");
  });

  it("deve avaliar declarações VAR / RETURN com variáveis e expressões complexas que começam com letras (incluindo trigonométricas)", () => {
    const dataScore = { SCORE_CREDITO: { score: 600 } };
    
    // Teste 1: Expressão matemática intermediária que começa com letra (score * 0.00314159)
    const formulaMath = "VAR score = $SCORE_CREDITO.score VAR rad = score * 0.00314159265 RETURN rad";
    expect(interpolate("{{" + formulaMath + "}}", dataScore)).toBe("1.88495559");

    // Teste 2: Expressão matemática com cos/sin
    const formulaTrig = "VAR score = $SCORE_CREDITO.score VAR rad = score * 0.00314159265 VAR cx = 100 - 80 * cos(rad) RETURN round(cx, 2)";
    expect(interpolate("{{" + formulaTrig + "}}", dataScore)).toBe("124,72");
  });

  it("deve avaliar corretamente as novas funções lógicas e de string (concatenate, upper, lower, switch, divide, coalesce, len, ifempty)", () => {
    const data = {
      NOME: "Victor",
      SOBRENOME: "Brunno",
      VAL_NULO: null,
      VAL_DEF: "Sim",
      DIV_NUM: 10,
      DIV_DEN: 2,
      DIV_DEN_ZERO: 0
    };

    // Teste CONCATENATE
    expect(interpolate("{{concatenate(NOME, ' ', SOBRENOME)}}", data)).toBe("Victor Brunno");
    expect(interpolate("{{concatenate('Olá ', NOME)}}", data)).toBe("Olá Victor");

    // Teste UPPER e LOWER
    expect(interpolate("{{upper(NOME)}}", data)).toBe("VICTOR");
    expect(interpolate("{{lower(SOBRENOME)}}", data)).toBe("brunno");

    // Teste SWITCH
    expect(interpolate("{{switch(NOME, 'Victor', 'Encontrado', 'Outro', 'Não', 'Nenhum')}}", data)).toBe("Encontrado");
    expect(interpolate("{{switch('Outro', 'Victor', 'Encontrado', 'Outro', 'Não', 'Nenhum')}}", data)).toBe("Não");
    expect(interpolate("{{switch('Aleatorio', 'Victor', 'Encontrado', 'Outro', 'Não', 'Nenhum')}}", data)).toBe("Nenhum");

    // Teste DIVIDE
    expect(interpolate("{{divide(DIV_NUM, DIV_DEN)}}", data)).toBe("5");
    expect(interpolate("{{divide(DIV_NUM, DIV_DEN_ZERO, 99)}}", data)).toBe("99");

    // Teste COALESCE
    expect(interpolate("{{coalesce(VAL_NULO, VAL_DEF, 'Fallback')}}", data)).toBe("Sim");
    expect(interpolate("{{coalesce(VAL_NULO, null, undefined, 'Fallback')}}", data)).toBe("Fallback");

    // Teste LEN
    expect(interpolate("{{len(NOME)}}", data)).toBe("6");
    expect(interpolate("{{len(VAL_NULO)}}", data)).toBe("0");

    // Teste IFEMPTY
    expect(interpolate("{{ifempty(VAL_NULO, 'Preenchido')}}", data)).toBe("Preenchido");
    expect(interpolate("{{ifempty(NOME, 'Preenchido')}}", data)).toBe("Victor");
    expect(interpolate("{{ifempty('', 'Vazio')}}", data)).toBe("Vazio");
  });
});

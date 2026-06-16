import { describe, it, expect } from "vitest";
import { resolveExpression, registerCanonicalTypesMetadata } from "./resolveExpression";
import fs from "fs";
import path from "path";

describe("resolveExpression - Core engine tests", () => {
  const mockData = {
    cliente: {
      nome: "Victor Brunno",
      documento: "123.456.789-00",
      endereco: {
        cidade: "São Paulo",
        uf: "SP"
      }
    },
    // Exemplo de tipo mapeado (De-Para) estruturado
    DIVIDAS_SPC: {
      totaisCalculados: {
        valor: 1500.50,
        quantidade: 2
      },
      linhas: [
        { credor: "Banco A", valor: 500.50, status: "Aberto" },
        { credor: "Lojista B", valor: 1000.00, status: "Aberto" }
      ]
    },
    // Outro tipo mapeado estruturado
    DIVIDAS_SERASA: {
      totaisCalculados: {
        valor: 2400.00,
        quantidade: 1
      },
      linhas: [
        { credor: "Cartão C", valor: 2400.00, status: "Aberto" }
      ]
    },
    outros_dados: {
      ativo: true
    }
  };

  it("deve resolver caminhos básicos pontuados", () => {
    expect(resolveExpression("cliente.nome", mockData)).toBe("Victor Brunno");
    expect(resolveExpression("cliente.endereco.cidade", mockData)).toBe("São Paulo");
  });

  it("deve retornar o próprio contexto ao usar 'this'", () => {
    expect(resolveExpression("this", mockData.outros_dados)).toEqual({ ativo: true });
    expect(resolveExpression("this.ativo", mockData.outros_dados)).toBe(true);
  });

  it("deve suportar remoção opcional do prefixo '$'", () => {
    expect(resolveExpression("$cliente.nome", mockData)).toBe("Victor Brunno");
    expect(resolveExpression("$cliente.endereco.uf", mockData)).toBe("SP");
  });

  it("deve resolver propriedades de forma case-insensitive", () => {
    expect(resolveExpression("CLIENTE.nOmE", mockData)).toBe("Victor Brunno");
  });

  it("deve resolver de forma nativa e inteligente caminhos com o curinga [*] para arrays", () => {
    // Busca dentro de DIVIDAS_SPC.linhas[*].valor usando fallback e curinga
    // 'DIVIDAS_SPC.linhas' é um array. 'DIVIDAS_SPC[*].valor' ou 'DIVIDAS_SPC.linhas[*].valor'
    const resultLines = resolveExpression("DIVIDAS_SPC.linhas[*].valor", mockData);
    expect(resultLines).toEqual([500.50, 1000.00]);

    const resultCredores = resolveExpression("DIVIDAS_SPC.linhas[*].credor", mockData);
    expect(resultCredores).toEqual(["Banco A", "Lojista B"]);
  });

  it("deve realizar varredura global recursiva quando usar o curinga [*] na raiz", () => {
    // $[*].valor deve varrer DIVIDAS_SPC e DIVIDAS_SERASA, retornando TODOS os valores encontrados (tanto totaisCalculados quanto linhas)
    const resultGlobais = resolveExpression("$[*].valor", mockData);
    
    // DIVIDAS_SPC.valor resolve para [1500.50, 500.50, 1000.00]
    // DIVIDAS_SERASA.valor resolve para [2400.00, 2400.00]
    expect(resultGlobais).toEqual([1500.50, 500.50, 1000.00, 2400.00, 2400.00]);
  });

  it("deve aplicar fallback inteligente para índices numéricos específicos em objetos estruturados", () => {
    // DIVIDAS_SPC[0].valor -> deve pegar a primeira linha (Banco A) e retornar o valor 500.50
    expect(resolveExpression("DIVIDAS_SPC[0].valor", mockData)).toBe(500.50);
    expect(resolveExpression("DIVIDAS_SPC[0].credor", mockData)).toBe("Banco A");

    // DIVIDAS_SPC[1].valor -> segunda linha (Lojista B) -> 1000.00
    expect(resolveExpression("DIVIDAS_SPC[1].valor", mockData)).toBe(1000.00);

    // DIVIDAS_SERASA[0].credor -> primeira linha (Cartão C) -> "Cartão C"
    expect(resolveExpression("DIVIDAS_SERASA[0].credor", mockData)).toBe("Cartão C");

    // Índice fora do limite deve retornar undefined de forma segura
    expect(resolveExpression("DIVIDAS_SPC[9].valor", mockData)).toBeUndefined();
  });

  it("deve manter fallback clássico para totaisCalculados e linhas em propriedades gerais", () => {
    // DIVIDAS_SPC.valor resolve para o total via fallback inteligente
    expect(resolveExpression("DIVIDAS_SPC.valor", mockData)).toBe(1500.50);

    // Se a propriedade não estiver nos totaisCalculados mas estiver em cada linha, retorna array
    // DIVIDAS_SPC.credor resolve para ["Banco A", "Lojista B"]
    expect(resolveExpression("DIVIDAS_SPC.credor", mockData)).toEqual(["Banco A", "Lojista B"]);
  });

  it("deve reproduzir o cálculo de sum($[*].totaldeduzido) com dados simulados do log", () => {
    // 1. Caso com o JSON real direto (como exportado/salvo no log)
    const rawJson = fs.readFileSync("/consultas-pro-app/logs/complata_brasil_preview_1.json", "utf-8");
    const logData = JSON.parse(rawJson);
    console.log("LOG DATA DIRECT [*].totaldeduzido:", resolveExpression("$[*].totaldeduzido", logData));

    // 2. Caso simulando a estrutura em tempo de execução (Zustand store no frontend)
    // onde todos os Tipos Canônicos mapeados (SPC, Serasa, Boa Vista) possuem { linhas, totaisCalculados }
    const storeData = {
      DIVIDAS_SPC: {
        totaisCalculados: {
          totalapontado: "R$ 14.877,35",
          totaldeduzido: "R$ 14.877,35"
        },
        linhas: [
          { valor: "R$ 231,19" }
        ]
      },
      DIVIDAS_SERASA: {
        totaisCalculados: {
          totalapontado: "R$ 14.877,35",
          totaldeduzido: "R$ 14.877,35"
        },
        linhas: [
          { valor: "R$ 231,19" }
        ]
      },
      DIVIDAS_BOA_VISTA: {
        totaisCalculados: {
          totaldeduzido: "R$ 93.319,36"
        },
        linhas: [
          { valor: "R$ 79.591,37" }
        ]
      },
      PROTESTO_CARTORIO: [
        { valor: "R$ 8.567,96" }
      ]
    };

    console.log("STORE DATA [*].totaldeduzido:", resolveExpression("$[*].totaldeduzido", storeData));
  });

  it("deve permitir busca por aproximação/índice no objeto raiz de dados (ex: $[0].valor)", () => {
    // $[0].valor deve resolver para DIVIDAS_SPC.valor (pois cliente é filtrado como metadado), retornando 1500.50
    expect(resolveExpression("$[0].valor", mockData)).toBe(1500.50);
    // $[1].valor deve resolver para DIVIDAS_SERASA.valor, retornando 2400.00
    expect(resolveExpression("$[1].valor", mockData)).toBe(2400.00);

    // Testar com dados onde SCORE_CREDITO (que NÃO tem valor) é colocado no início
    const scrambledData = {
      SCORE_CREDITO: {
        totaisCalculados: { score: 100 },
        linhas: [{ tipo_score: "A" }]
      },
      DIVIDAS_SERASA: {
        totaisCalculados: { valor: 300 },
        linhas: [{ valor: 300 }]
      }
    };
    // $[0].valor deve pular SCORE_CREDITO e resolver para DIVIDAS_SERASA.valor (300)
    expect(resolveExpression("$[0].valor", scrambledData)).toBe(300);
  });

  it("deve resolver metadados virtuais de tipos canônicos cadastrados", () => {
    // Registrar metadados fictícios
    registerCanonicalTypesMetadata({
      DIVIDAS_SPC: {
        chave: "DIVIDAS_SPC",
        label: "Dívidas SPC",
        title: "Restrições Financeiras SPC"
      },
      DIVIDAS_SERASA: {
        chave: "DIVIDAS_SERASA",
        label: "Dívidas Serasa"
        // sem title para testar fallback para label
      }
    });

    // Testar resolução direta
    expect(resolveExpression("DIVIDAS_SPC.chave", mockData)).toBe("DIVIDAS_SPC");
    expect(resolveExpression("DIVIDAS_SPC.label", mockData)).toBe("Dívidas SPC");
    expect(resolveExpression("DIVIDAS_SPC.title", mockData)).toBe("Restrições Financeiras SPC");
    expect(resolveExpression("DIVIDAS_SPC.titulo", mockData)).toBe("Restrições Financeiras SPC");

    // Testar com o prefixo "$"
    expect(resolveExpression("$DIVIDAS_SPC.chave", mockData)).toBe("DIVIDAS_SPC");
    expect(resolveExpression("$DIVIDAS_SPC.label", mockData)).toBe("Dívidas SPC");

    // Testar fallback de title para label quando title não é definido
    expect(resolveExpression("DIVIDAS_SERASA.title", mockData)).toBe("Dívidas Serasa");

    // Testar caminhos normais que continuam resolvendo mesmo com metadados registrados
    expect(resolveExpression("DIVIDAS_SPC.valor", mockData)).toBe(1500.50);
  });

  it("deve retornar o array de linhas diretamente se o objeto for um envelopador de preview contendo 'linhas' e nenhum subcaminho subsequente for solicitado", () => {
    // Quando chamar o envelopador diretamente, deve interceptar e retornar as linhas
    expect(resolveExpression("DIVIDAS_SPC", mockData)).toEqual([
      { credor: "Banco A", valor: 500.50, status: "Aberto" },
      { credor: "Lojista B", valor: 1000.00, status: "Aberto" }
    ]);

    // Chamar com cifrão
    expect(resolveExpression("$DIVIDAS_SERASA", mockData)).toEqual([
      { credor: "Cartão C", valor: 2400.00, status: "Aberto" }
    ]);
  });

  it("deve resolver variáveis de sistema virtuais template.date, template.protocol e template.company", () => {
    const dataComTemplate = {
      template: {
        date: "10/10/2026 12:00",
        protocol: "REQ-999999",
        company: "EMPRESA DE TESTE"
      }
    };

    const dataComCamposRaiz = {
      consultationDate: "12/12/2026 15:30",
      protocol: "REQ-888888",
      companyName: "EMPRESA RAIZ"
    };

    const dataVazia = {};

    // Caso 1: Dados explícitos dentro de objeto 'template'
    expect(resolveExpression("template.date", dataComTemplate)).toBe("10/10/2026 12:00");
    expect(resolveExpression("template.protocol", dataComTemplate)).toBe("REQ-999999");
    expect(resolveExpression("template.company", dataComTemplate)).toBe("EMPRESA DE TESTE");

    // Caso 2: Resolução a partir de campos alternativos na raiz
    expect(resolveExpression("template.date", dataComCamposRaiz)).toBe("12/12/2026 15:30");
    expect(resolveExpression("template.protocol", dataComCamposRaiz)).toBe("REQ-888888");
    expect(resolveExpression("template.company", dataComCamposRaiz)).toBe("EMPRESA RAIZ");

    // Caso 3: Fallbacks dinâmicos caso os campos não existam de forma alguma
    expect(resolveExpression("template.date", dataVazia)).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    
    const firstCall = resolveExpression("template.protocol", dataVazia);
    expect(firstCall).toMatch(/^REQ-\d{8}$/);
    
    const secondCall = resolveExpression("template.protocol", dataVazia);
    expect(firstCall).toBe(secondCall); // Deve ser estável pela referência do objeto
    
    expect(resolveExpression("template.company", dataVazia)).toBe("CONSULTAS PRO");

    // Caso 4: Suporte a prefixos '$'
    expect(resolveExpression("$template.date", dataComTemplate)).toBe("10/10/2026 12:00");
  });
});

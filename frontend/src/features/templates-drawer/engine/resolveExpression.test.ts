import { describe, it, expect } from "vitest";
import { resolveExpression } from "./resolveExpression";
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
    // $[*].valor deve varrer DIVIDAS_SPC e DIVIDAS_SERASA, ignorando chaves não-objetos ou sem 'valor'
    // Como DIVIDAS_SPC e DIVIDAS_SERASA têm 'totaisCalculados.valor', elas caem no fallback de 'valor'
    const resultGlobais = resolveExpression("$[*].valor", mockData);
    
    // DIVIDAS_SPC.valor resolve para 1500.50 (via totaisCalculados.valor)
    // DIVIDAS_SERASA.valor resolve para 2400.00 (via totaisCalculados.valor)
    // Então results deve conter esses valores ou as linhas se o fallback de linhas fosse priorizado.
    // Como totaisCalculados.valor é avaliado primeiro no fallback:
    expect(resultGlobais).toContain(1500.50);
    expect(resultGlobais).toContain(2400.00);
    expect(resultGlobais).toHaveLength(2);
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
});

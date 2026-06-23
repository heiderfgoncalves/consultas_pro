# 📖 Guia Operacional de Instanciação e Criação de Templates (Canvas Dinâmico)

Este guia prático foi projetado para instruir agentes autônomos e desenvolvedores sobre como criar novos templates de alta fidelidade visual no motor de **Canvas Dinâmico** do sistema de relatórios. Ele documenta o padrão arquitetural de posicionamento absoluto, as melhores práticas de reutilização, a criação de velocímetros matematicamente precisos e o uso avançado de HTML Rico.

---

## 📐 1. O Padrão de Layout do Canvas

O motor de exibição utiliza coordenadas físicas estruturadas sobre uma folha virtual de tamanho **A4 Retrato** padrão.
* **Largura Padrão (Width)**: `794px`
* **Altura Padrão (Height)**: `1123px`
* **Grids de Posicionamento**: Recomenda-se manter múltiplos de `10` ou `5` nas coordenadas `(x, y)` para manter o alinhamento impecável.
* **Margens de Segurança**: Evite colocar elementos nas coordenadas `x < 40` ou `x > 754` para impedir cortes físicos na impressão ou na exportação de PDF.
* **Camadas (zIndex)**: Elementos de fundo, como cartões e backgrounds (`type: "container"`), devem possuir `zIndex: 1`, enquanto textos, ícones e tabelas sobrepostos devem possuir `zIndex: 2` ou superior.

---

## 🔄 2. Workflow para Criar um Novo Template

Quando houver a necessidade de gerar um novo template (ex: para uma nova integração de API ou relatório customizado), o processo mais eficiente e seguro é a **reutilização e adaptação de um template base homologado**.

O **Template de Referência Homologado** (geralmente salvo como `template-base.json` ou similar no repositório de banco de dados) deve ser utilizado como modelo de maior padrão estético. Ele possui múltiplos elementos estruturados em páginas (frames), contendo layouts de score, KPIs e tabelas de ocorrências com alto nível de polimento visual.

### Fluxo de Trabalho Recomendado:
1. **Exportar a Base**: Obtenha o layout JSON completo do template de referência (uma cópia do template base homologado costuma ficar salva em `backend/prisma/template-base.json`).
2. **Criar o Script de Semente**: Desenvolva um script de semente dedicado sob a pasta de sementes com o nome `backend/prisma/seed-[nome-do-layout]-template.ts`.
3. **Modificar os Metadados Primários**: Defina um novo ID único (ex: `template_layout_customizado`) e o nome de exibição do template.
4. **Mapear e Substituir Elementos**: Varra o array de elementos (`elements`) adaptando os textos, bindings de dados, ícones e tabelas dinâmicas.
5. **Realizar o Upsert no Prisma**: Grave as alterações no banco de dados e associe o template ao produto correspondente na tabela de acoplamento `TemplateItem`.

---

## 🎨 3. Padrão de Estilização e HTML Rico (`html:<div...`)

Embora o Canvas Dinâmico suporte elementos geométricos estáticos independentes (retângulos, bordas, textos individuais), a criação de dezenas desses elementos para formar uma única tabela complexa sobrecarrega o motor e dificulta a manutenção de coordenadas.

### A Regra de Ouro: Blocos de HTML Rico
Sempre que precisar renderizar painéis de dados altamente customizados (como cartões agrupados, resumos cadastrais ricos ou tabelas estilizadas de provedores específicos), altere o `type` do elemento canvas para `text` e defina seu conteúdo com o prefixo **`html:`** seguido de tags HTML/CSS inline estruturadas.

#### Exemplo Prático de Painel de Restritivos (Exposição Financeira):
```html
html:<div style='font-family:sans-serif;'>
  <div style='font-size:12px;font-weight:700;color:#1e293b;margin-bottom:8px;text-transform:uppercase;'>Exposição Financeira e Endividamento</div>
  <div style='display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:12px;'>
    <div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center;'>
      <div style='font-size:8px;text-transform:uppercase;color:#64748b;font-weight:600;'>Limite de Crédito</div>
      <div style='font-size:11.5px;font-weight:700;color:#0f172a;margin-top:2px;'>R$ {{formatBacenCurrency $EXPOSICAO_FINANCEIRA.limite}}</div>
    </div>
    <!-- ... outros cartões com cores harmoniosas ... -->
  </div>
</div>
```

### Vantagens desse Padrão:
* **Responsividade Local**: O uso de CSS Grid (`display: grid; grid-template-columns: repeat(N, 1fr)`) garante que os cartões fiquem alinhados automaticamente sem precisar de cálculos manuais de coordenadas `x` para cada retângulo.
* **Visual Premium**: Permite aplicar facilmente `border-radius`, `box-shadow` suave, fontes consistentes (`font-family: sans-serif;`), paddings exatos e variações tipográficas em um único elemento do Canvas.

---

## 📊 4. Engenharia de Velocímetros e Scores (SVG Dinâmico)

Os relatórios visuais utilizam velocímetros baseados em arcos de círculo desenhados com a tag `<svg>`. O ponteiro do velocímetro deve girar de forma dinâmica com base no score da consulta (normalizado de 0 a 1000).

### 4.1. Matemática de Rotação do Ponteiro (De 0 a 1000 para Graus)
Um velocímetro semicircular começa em **-90 graus** (0 pontos - extrema esquerda) e termina em **+90 graus** (1000 pontos - extrema direita), totalizando um arco de **180 graus** de amplitude.

La equação linear para calcular o ângulo de rotação com base no score é:
$$\theta = (\text{Score} \times 0.18) - 90$$

No layout JSON, implementamos essa rotação dinamicamente no elemento `<line>` do SVG utilizando o interpretador de expressões matemáticas:
```svg
<!-- Ponteiro dinâmico rotacionando baseado na pontuação de score -->
<line x1="100" y1="92" x2="100" y2="36" stroke="#334155" stroke-width="4" stroke-linecap="round" transform="rotate({{calc($SINTESE_ANALITICA.score * 0.18 - 90)}} 100 92)"/>
```
* **`100 92`**: São as coordenadas `(cx, cy)` do centro de rotação do ponteiro (a base da agulha).

### 4.2. Definindo Faixas de Risco de Forma Legível
Substitua as tabelas de faixas estáticas por legendas horizontais e blocos de texto inteligentes que utilizam a sintaxe de variáveis lógicas `VAR` e condicionais `case when` do nosso motor:

```html
html:<div style='font-size:28px;font-weight:700;color:{{VAR score = $SINTESE_ANALITICA.score VAR cor = case when score <= 250 then "#ef4444" when score <= 500 then "#f97316" when score <= 750 then "#eab308" else "#22c55e" end RETURN cor}};font-family:sans-serif;'>{{$SINTESE_ANALITICA.score}}</div>
```

#### Paleta de Cores de Risco Recomendada:
* 🔴 **Alto Risco / Péssimo**: `#ef4444` (Vermelho)
* 🟠 **Atenção / Ruim**: `#f97316` (Laranja)
* 🟡 **Moderado / Regular**: `#eab308` (Amarelo)
* 🟢 **Favorável / Excelente**: `#22c55e` (Verde)

---

## 📝 5. Modelo (Boilerplate) de Script de Semente de Template

Toda IA ou desenvolvedor que for criar um novo template deve seguir rigorosamente a estrutura do boilerplate abaixo. Ele assegura **idempotência**, carregamento correto do JSON base e vinculação referencial segura através do Prisma Client:

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Iniciando Criação do Template [NOME_DO_LAYOUT] ===');

  // 1. Carregar o template base de referência
  const basePath = path.join(__dirname, 'template-base.json');
  if (!fs.existsSync(basePath)) {
    throw new Error(`Arquivo template-base.json não encontrado em: ${basePath}`);
  }

  const baseContent = fs.readFileSync(basePath, 'utf-8');
  const baseTemplate = JSON.parse(baseContent);

  // 2. Modificar metadados de identificação
  baseTemplate.id = 'template_id_unico_em_snake_case';
  baseTemplate.name = 'Nome de Exibição do Template';

  // 3. Processar e remapear elementos dinamicamente
  if (baseTemplate.elements && Array.isArray(baseTemplate.elements)) {
    baseTemplate.elements = baseTemplate.elements.map((el: any) => {
      
      // Adaptar textos, títulos e subtítulos
      if (el.type === 'text' && el.data && el.data.text) {
        let text = el.data.text;

        // Exemplo: Substituir cabeçalho principal
        if (text === 'Relatório Analítico de Exemplo') {
          text = 'Relatório Analítico de [NOME_DO_LAYOUT]';
        }

        // Exemplo: Substituir binding do score
        if (text.includes('$SINTESE_ANALITICA.score')) {
          // Substituir pelas expressões matemáticas de score personalizadas do produto
        }

        el.data.text = text;
      }

      // Adaptar tabelas nativas de listagem
      if (el.type === 'table' && el.data) {
        if (el.data.arrayPath === '$RESTRICOES_COMPLEMENTARES') {
          // Redefinir para a nova coleção de array e colunas do produto
          el.data.arrayPath = '$NOVO_ARRAY_CANONICO';
          el.data.columns = [
            { path: 'campo_1', label: 'Cabeçalho 1' },
            { path: 'campo_2', label: 'Cabeçalho 2', format: 'currency' }
          ];
        }
      }

      return el;
    });
  }

  // 4. Salvar o Template no Banco de Dados (Idempotente)
  const template = await prisma.template.upsert({
    where: { id: baseTemplate.id },
    update: {
      name: baseTemplate.name,
      description: 'Template visual analítico avançado para [NOME_DO_LAYOUT]',
      layout: baseTemplate,
    },
    create: {
      id: baseTemplate.id,
      name: baseTemplate.name,
      description: 'Template visual analítico avançado para [NOME_DO_LAYOUT]',
      layout: baseTemplate,
    }
  });

  console.log(`✅ Template registrado no banco! ID: ${template.id}`);

  // 5. Vincular ao ProviderProduct correspondente
  const productCode = 'CODIGO_PRODUTO_ALVO';
  const product = await prisma.providerProduct.findFirst({
    where: { code: productCode }
  });

  if (!product) {
    throw new Error(`Produto com o código ${productCode} não foi encontrado.`);
  }

  // 5.1. Limpar associações anteriores para evitar duplicidade de templates ativos
  await prisma.templateItem.deleteMany({
    where: { providerProductId: product.id }
  });

  // 5.2. Criar a relação física com o alias de contexto correto
  const templateItem = await prisma.templateItem.create({
    data: {
      templateId: template.id,
      providerProductId: product.id,
      alias: 'AliasDeContextoLógico', // ex: "Cadastro", "Faturamento"
      sortOrder: 0
    }
  });

  console.log(`✅ Associação criada com sucesso em TemplateItem! ID: ${templateItem.id}`);
  console.log('=== Processo concluído com sucesso! ===');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal durante a semente do template:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🧠 6. Diretrizes de Ouro para IAs de Codificação

Se você é uma Inteligência Artificial encarregada de projetar ou modificar um template no motor de exibição, siga estritamente estas instruções de projeto:

1. **NUNCA use Dados Falsos ou Placeholders**: Certifique-se de que os bindings lógicos correspondem a chaves de dados canônicos reais do banco de dados (ex: `$QUADRO_SOCIETARIO`, `$EXPOSICAO_FINANCEIRA`).
2. **Preserve a Integridade de Coordenadas**: Ao modificar elementos no loop de map, se o elemento for alterado de `table` para `text (html)`, preserve suas coordenadas originais `x, y, width, height` para que o novo elemento HTML Rico se encaixe exatamente no mesmo "buraco" estético que a tabela anterior ocupava.
3. **Estilize com Elegância**: Utilize a tipografia sans-serif nativa do sistema e cores harmoniosas. Não use cores primárias saturadas simples. Utilize tons de HSL ou a paleta de tons cinzas, ardósia, esmeralda para sucesso, âmbar para atenção e vermelho suave para perigo.
4. **Valide Imediatamente**: Após gerar e executar seu script de semente, crie ou execute um script de query de banco de dados (como `query-templates.ts`) para certificar-se de que os modelos `Template` e `TemplateItem` foram salvos e associados perfeitamente.

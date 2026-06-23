# 🤖 Guia de Automação para IA — Importação de Layouts, Geração de Canvas e Integrações

Este documento serve de manual de instruções de engenharia definitivo para **futuras Inteligências Artificiais** e sistemas de automação que assumam a responsabilidade de criar, editar, ou importar novos layouts, relatórios e integrações de birôs de crédito dentro do ecossistema **Consultas PRO**.

---

## 🧭 1. Entendendo o Modelo de Canvas de Apresentação

Diferente de sistemas tradicionais que geram relatórios baseados em fluxo de blocos HTML responsivos de navegador (que quebram layouts, sofrem de desalinhamento de fontes e estouram as margens físicas na hora de imprimir), o Consultas PRO adota o modelo de **Canvas de Apresentação de Alta Fidelidade (High Fidelity Fixed Grid Canvas)**.

### 📐 1.1 O Grid Físico A4 Retrato
Todos os relatórios são desenhados sobre uma folha de desenho (Canvas) orientada por coordenadas bidimensionais fixas `(x, y)` projetadas na proporção física de uma página papel A4 Retrato em resolução padrão de tela de **794 pixels de largura** por **1123 pixels de altura**.

### 🥞 1.2 Regras de Posicionamento e Camadas (Z-Indexing)
Ao desenhar cartões, velocímetros ou blocos informativos:
1. **Margem Padrão de Impressão**: Mantenha uma margem de segurança invisível de pelo menos `40px` em todas as bordas do frame (as coordenadas utilizáveis seguras de `x` vão de `40` a `754`).
2. **Camadas de Fundo (Containers)**: Cartões com background cinza ou bordas coloridas Tailwind devem ser instanciados como um elemento do tipo `container` com largura/altura definidas, com `zIndex: 1`.
3. **Sobreposição de Elementos (Z-Index)**: Todos os textos explicativos, dados dinâmicos, ícones ou separadores que fiquem localizados visualmente dentro daquele cartão devem ser instanciados com coordenadas relativas sobrepostas sobre a bounding-box do contêiner anterior e ter obrigatoriamente um `zIndex` igual ou maior que `2`.

---

## 🎨 2. Pipeline de Conversão: Imagem/PDF para Canvas JSON

Quando o usuário fizer o upload de uma imagem de mockup, PDF de relatório de concorrente ou print de tela para a IA converter em template nativo, a IA deve seguir este algoritmo de visão computacional e engenharia de software:

```mermaid
graph TD
    Upload[Mockup do Relatório em Imagem / PDF] --> Vision[1. Modelo Visionário / YOLO OCR]
    Vision --> BoundingBox[Extração de Bounding Boxes [x, y, w, h] em Pixels]
    BoundingBox --> Proportion[2. Projeção Proporcional para A4 (794 x 1123)]
    Proportion --> Structure[3. Identificação de Padrões Estéticos]
    Structure --> Palette[Mapeamento de Cores e Fontes do Cliente]
    Structure --> Cards[Agrupamento de Elementos em Containers Cards]
    Structure --> Tables[Identificação de Grades e Conversão em Tabelas Dinâmicas]
    Palette & Cards & Tables --> CanvasJSON[4. Geração de JSON Estruturado de Frames e Elements]
    CanvasJSON --> Catalog[5. Vinculação Dinâmica aos Campos Canônicos de Destino]
```

### 🧠 Algoritmo de Visão e Alinhamento para IA:
* **Passo 1: Varredura de OCR**: Extraia todos os textos e suas respectivas caixas delimitadoras (*bounding boxes*).
* **Passo 2: Escalonamento de Altura**: Se o relatório original tiver múltiplas páginas, divida a coordenada vertical de Y para segmentá-lo nos respectivos Frames de página (`frame_page_1` para Y de `0` a `1123`, `frame_page_2` para Y de `1124` a `2246`, e assim sucessivamente).
* **Passo 3: Mapeamento de Lucide Icons**: Se encontrar ícones visuais (ex: rostos, dinheiro, relógios, setas), converta-os para o elemento do tipo `icon` usando as chaves válidas da biblioteca Lucide (ex: `User`, `TrendingUp`, `Compass`, `Activity`, `CheckCircle2`, `FileText`).
* **Passo 4: Criação de Tabelas Dinâmicas**: Quando houver listas ou grades na imagem (ex: lista de cheques devolvidos), converta o grupo em um elemento unificado do tipo `table` do canvas, mapeando colunas estruturadas, evitando criar dezenas de caixas de texto individuais e desalinhadas.

---

## 📚 3. Acoplamento de Variáveis e Agnosticismo de Fornecedor

### 🔀 Mapeamento De-Para Unificado (Aba Tipos)
A maior regra de ouro do Consultas PRO é o **Agnosticismo do Relatório**. Um template visual **nunca** deve conter variáveis ou chaves brutas de um birô específico (ex: `retorno_sollos.dados.cpf`). 
A IA deve sempre:
1. Identificar o catálogo de campos canônicos disponíveis no sistema (através de `CanonicalFieldCatalog`).
2. Vincular a propriedade do elemento do template à chave de destino ("Para") normalizada (ex: `{{DADOS_PESSOAIS.NOME}}`, `{{DIVIDAS_SPC.VALOR_TOTAL}}`).
3. Mapear o payload bruto do birô de forma isolada na aba **Tipos** associando-o ao campo canônico correspondente.

> [!IMPORTANT]
> **Prevenção de Quebras de Layout (Campos Vazios)**: Ative sempre a propriedade `hiddenIfEmpty` no JSON dos elementos do canvas. Se o cliente consultado não possuir restrições financeiras ou cheques, o componente correspondente no relatório desaparecerá de forma elegante e automática no PDF, em vez de deixar uma caixa branca orfã ou texto vazio no documento.

---

## 🚀 4. Motor de Expressões Premium e Lógicas Avançadas

Ao gerar campos de exibição dinâmica, gráficos SVG de risco ou velocímetros trigonométricos de score, a IA deve codificar as expressões utilizando a sintaxe do **Interpretador Lógico Premium do Consultas PRO**, que suporta escopos de variáveis e desvios condicionais robustos eliminando if-else aninhados:

### 4.1 Sintaxe de Atribuição e case when:
- **`VAR`**: Define uma variável de escopo local para cálculo.
- **`case when [Expressão] then [Resultado] else [Padrão] end`**: Desvio condicional múltiplo.
- **`RETURN`**: Conclui o processamento retornando o valor final formatado.

#### Exemplo 1: Alerta Estilizado de Status da Empresa (Receita Federal)
```handlebars
{{VAR status = $PRONAMPE_RECEITA[0].situacaoCadastral VAR cor = case when status == "ATIVA" then "#22c55e" when status == "SUSPENSA" then "#eab308" else "#ef4444" end RETURN cor}}
```

#### Exemplo 2: Velocímetro de Risco SVG Dinâmico
Para rotacionar o ponteiro de um velocímetro de risco em um indicador visual SVG sobreposto ao Canvas, calcule o ângulo de rotação proporcional ao score obtido:
```svg
<svg viewBox='0 0 100 60' width='100%' height='100%'>
  <!-- Arco do Velocímetro -->
  <path d='M 10 50 A 40 40 0 0 1 90 50' fill='none' stroke='#e2e8f0' stroke-width='8' stroke-linecap='round' />
  <!-- Ponteiro calculando trigonometria de rotação -->
  <g transform='translate(50, 50) rotate({{VAR score = $SCORE_CREDITO[0].score VAR angulo = (score / 1000) * 180 - 90 RETURN angulo}})'>
    <line x1='0' y1='0' x2='0' y2='-35' stroke='#1e293b' stroke-width='3' stroke-linecap='round' />
    <circle cx='0' cy='0' r='5' fill='#1e293b' />
  </g>
</svg>
```

---

## 🧪 5. Validação Prática das Integrações (Sandbox de Teste)

Antes de homologar qualquer nova integração no banco remoto, a IA ou o script validador deve rodar testes de integridade das expressões e mapeamentos utilizando o banco de dados simulado e os logs sintéticos estruturados do repositório:

1. **Injetar Dados de Simulação**: Utilize os payloads de logs de teste armazenados fisicamente na pasta `/consultas-pro-app/logs/` (como o log [radar_pronampe_brasilconsultas.json](file:///consultas-pro-app/logs/radar_pronampe_brasilconsultas.json) que possui 36 campos normalizados do Radar PRONAMPE).
2. **Executar Scripts de Avaliação de Expressões**: Chame os motores de simulação do backend para avaliar a conformidade matemática (`math()`), tratamento de strings brasileiras (`SUM` de moedas formatadas com regex de purificação) e compatibilidade com o formato de percentuais.
3. **Validação das Variáveis no Canvas**: Verifique se o catálogo unificado de autocomplete de variáveis (`availableVariables`) no console de administração do front-end lista exatamente as mesmas chaves destino configuradas, garantindo que o template renderize 100% livre de erros ou chaves fantasmas quebradas.

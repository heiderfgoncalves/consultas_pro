# 📐 Padrão de Layout Multipáginas A4 (Injeção de Custom HTML)

Este documento de apoio especifica o padrão arquitetural de alta fidelidade visual para a criação de relatórios impressos e exportáveis em formato **A4 Retrato** padrão no sistema de apresentação.

---

## 🚀 O Conceito de Frames Físicos Estanques

Em relatórios multipáginas complexos (como relatórios analíticos de faturamento comercial e demonstrativos cadastrais extensos), o motor do Canvas Dinâmico pode sofrer perda de alinhamento ao lidar com centenas de retângulos, linhas e caixas de texto individuais com coordenadas flutuantes. 

Para resolver isso de forma robusta, adotamos o padrão de **Frames Físicos Estanques**:
1. O array de elementos individuais do canvas (`elements`) é mantido **completamente vazio (`[]`)**.
2. Cada página do relatório é mapeada como um frame lógico independente dentro do array `frames`.
3. Todo o visual (estrutura, dados dinâmicos e estilos) é embutido na propriedade `customHtml` de cada frame usando tags HTML estruturadas, classes CSS e expressões de interpolação.

---

## 📏 Especificações Geométricas das Páginas

Cada frame deve respeitar rigorosamente as dimensões do padrão de folha A4 em 96 DPI e conter um distanciamento adequado na coordenada `y` para que fiquem bem organizadas no painel visual:

| Página | ID do Frame | Largura | Altura | Coordenada X | Coordenada Y | Ordem (sortOrder) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Página 1** | `frame_page_1` | `794` | `1123` | `0` | `0` | `0` |
| **Página 2** | `frame_page_2` | `794` | `1123` | `0` | `1150` | `1` |
| **Página 3** | `frame_page_3` | `794` | `1123` | `0` | `2300` | `2` |

> [!NOTE]
> O deslocamento vertical de `1150px` garante uma margem de segurança de `27px` entre o final de uma folha virtual e o início da próxima folha virtual A4, prevenindo sobreposição visual na tela do sistema.

---

## 🎨 Encapsulamento de CSS e Estilos de Alto Padrão

Para que as páginas fiquem visualmente idênticas e independentes ao serem geradas ou exportadas via renderizadores de backend (como geradores de PDF baseados em navegadores headless), **o CSS global deve ser embutido integralmente em cada página física** dentro de uma tag `<style>`.

### Exemplo de Montagem no Script de Semente:
```typescript
const cssContent = fs.readFileSync('templates/report-style.css', 'utf-8');
const page1Html = fs.readFileSync('templates/report-page-1.html', 'utf-8');
const page2Html = fs.readFileSync('templates/report-page-2.html', 'utf-8');

const styleBlock = `<style>\n${cssContent}\n</style>`;

const layout = {
  id: 'template_id_unico',
  name: 'Relatório Analítico',
  elements: [], // Mantido Vazio
  frames: [
    {
      id: 'frame_page_1',
      name: 'Página 1',
      type: 'page',
      customHtml: `${styleBlock}\n${page1Html}`,
      width: 794,
      height: 1123,
      x: 0,
      y: 0,
      sortOrder: 0
    },
    {
      id: 'frame_page_2',
      name: 'Página 2',
      type: 'page',
      customHtml: `${styleBlock}\n${page2Html}`,
      width: 794,
      height: 1123,
      x: 0,
      y: 1150,
      sortOrder: 1
    }
  ]
};
```

---

## 🧠 Boas Práticas para Escrita do HTML

1. **Envolva a Página na Div Mestre**: Sempre envolva todo o conteúdo de cada página na classe de container principal:
   ```html
   <div class="report-container">
       <!-- Cabeçalhos, seções e rodapés específicos da folha -->
   </div>
   ```
2. **Utilize o Grid de Alinhamento**: Em vez de fazer cálculos manuais de margem para cartões de resumo (KPIs), utilize CSS Grid com classes utilitárias para organizar as caixas automaticamente:
   ```css
   .grid { display: grid; gap: 16px; }
   .grid-3 { grid-template-columns: repeat(3, 1fr); }
   .grid-4 { grid-template-columns: repeat(4, 1fr); }
   ```
3. **Impeça quebras de página impróprias**: Ao desenhar tabelas longas ou listas de registros, verifique se elas cabem com segurança nos limites da altura de `1123px` do frame correspondente. Caso contrário, quebre os blocos de dados logicamente movendo a tabela ou parte dela para o frame da folha seguinte.

/**
 * 🎨 Consultas PRO — Template Layout Mockup Converter Boilerplate
 * 
 * Este script serve de referência técnica para futuras automações de IAs ou serviços de importação.
 * Ele demonstra como mapear caixas delimitadoras (bounding boxes) e propriedades de design 
 * de um mockup visual (imagem/PDF) para o formato JSON nativo de elementos do Canvas.
 */

interface MockupElement {
  id: string;
  type: 'text' | 'image' | 'icon' | 'divider' | 'container' | 'table';
  x: number;      // Posição x em pixels no mockup original
  y: number;      // Posição y em pixels no mockup original
  width: number;  // Largura em pixels
  height: number; // Altura em pixels
  text?: string;
  src?: string;
  style?: Record<string, any>;
}

interface CanvasElement {
  id: string;
  frameId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  data: Record<string, any>;
  style: Record<string, any>;
}

class LayoutConverter {
  private targetFrameId: string;
  private currentZIndex: number = 1;
  
  // Resolução padrão do frame A4 retrato do Consultas PRO
  private targetWidth = 794;
  private targetHeight = 1123;

  constructor(targetFrameId: string) {
    this.targetFrameId = targetFrameId;
  }

  /**
   * Converte um elemento do mockup para o elemento de Canvas compatível
   */
  public convertElement(el: MockupElement): CanvasElement {
    const canvasEl: CanvasElement = {
      id: el.id,
      frameId: this.targetFrameId,
      type: el.type,
      x: Math.round(el.x),
      y: Math.round(el.y),
      width: Math.round(el.width),
      height: Math.round(el.height),
      zIndex: this.currentZIndex++,
      data: {},
      style: el.style || {}
    };

    // Mapeamento específico por tipo de elemento
    switch (el.type) {
      case 'text':
        canvasEl.data = {
          text: el.text || ''
        };
        // Estilo padrão se não fornecido
        canvasEl.style = {
          fontSize: el.style?.fontSize || 12,
          color: el.style?.color || '#0f172a',
          fontWeight: el.style?.fontWeight || 400,
          ...canvasEl.style
        };
        break;

      case 'image':
        canvasEl.data = {
          src: el.src || '{{logoDataUrl}}',
          fit: el.style?.objectFit || 'contain'
        };
        break;

      case 'icon':
        canvasEl.data = {
          name: el.text || 'User',
          strokeWidth: el.style?.strokeWidth || 1.5
        };
        canvasEl.style = {
          color: el.style?.color || '#64748b',
          background: el.style?.background || '#f8fafc',
          borderColor: el.style?.borderColor || '#e2e8f0',
          borderWidth: el.style?.borderWidth || 1,
          borderRadius: el.style?.borderRadius || 8,
          ...canvasEl.style
        };
        break;

      case 'divider':
        canvasEl.style = {
          background: el.style?.background || '#cbd5e1',
          ...canvasEl.style
        };
        break;

      case 'container':
        canvasEl.style = {
          background: el.style?.background || '#ffffff',
          borderColor: el.style?.borderColor || '#e2e8f0',
          borderWidth: el.style?.borderWidth || 1,
          borderRadius: el.style?.borderRadius || 12,
          ...canvasEl.style
        };
        break;

      default:
        canvasEl.data = {};
        break;
    }

    return canvasEl;
  }

  /**
   * Converte em lote uma coleção de elementos extraídos via OCR/Vision de uma página
   */
  public convertPage(elements: MockupElement[]): CanvasElement[] {
    return elements.map(el => this.convertElement(el));
  }
}

// ==========================================
// Exemplo de uso da Automação de Conversão
// ==========================================

const visionOCRResults: MockupElement[] = [
  {
    id: "header_logo",
    type: "image",
    x: 40,
    y: 30,
    width: 150,
    height: 50,
    src: "https://api.limpanome.pro/public/logo.png",
    style: { objectFit: "contain" }
  },
  {
    id: "header_title",
    type: "text",
    x: 460,
    y: 30,
    width: 310,
    height: 25,
    text: "Relatório de Crédito",
    style: { fontSize: 16, fontWeight: 700, color: "#4f46e5", textAlign: "right" }
  },
  {
    id: "score_box_bg",
    type: "container",
    x: 40,
    y: 110,
    width: 714,
    height: 120,
    style: { background: "#ffffff", borderColor: "#cbd5e1" }
  }
];

const converter = new LayoutConverter("frame_page_1");
const nativeCanvasElements = converter.convertPage(visionOCRResults);

console.log("=== Elementos Convertidos com Sucesso para o Formato Canvas ===");
console.log(JSON.stringify(nativeCanvasElements, null, 2));

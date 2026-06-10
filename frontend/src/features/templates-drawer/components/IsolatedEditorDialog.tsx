import { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsolatedEditorStore } from "../store/isolated-editor.store";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { parseTemplateXml, serializeTemplateXml } from "../engine/xml";
import { renderSelectionHtml } from "./HtmlInspectorPanel";
import type { ReportTemplate } from "../schema/template";
import { toast } from "sonner";
import { InfiniteCanvas } from "./Canvas/InfiniteCanvas";
import { RightInspector } from "./RightInspector";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { SafeEditor as Editor } from "./SafeEditor";
import { useTheme } from "next-themes";
import {
  Type,
  Image,
  CreditCard,
  Minus,
  Table,
  Box,
  List,
  Compass,
  Trash2,
  Copy,
  Save,
  X,
  Plus,
  Sliders,
  Code,
  Sparkles,
  Layers,
  FileCode,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const ELEMENT_TYPES = [
  { type: "text", label: "Texto", icon: Type, desc: "Rótulos, parágrafos e valores interpolados" },
  { type: "image", label: "Imagem", icon: Image, desc: "Logotipos, fotos e figuras externas" },
  { type: "card", label: "Card", icon: CreditCard, desc: "Blocos de destaque e painéis visuais" },
  { type: "divider", label: "Divisor", icon: Minus, desc: "Linhas separadoras horizontais" },
  { type: "table", label: "Tabela", icon: Table, desc: "Grids de dados tabulares iteráveis" },
  { type: "container", label: "Container", icon: Box, desc: "Agrupador estrutural de elementos" },
  { type: "list", label: "Lista", icon: List, desc: "Listagem de itens e repetições simples" },
  { type: "icon", label: "Ícone", icon: Compass, desc: "Ícones de sinalização ou decoração" }
] as const;

const typeLabel = (t: string) => {
  const labels: Record<string, string> = {
    text: "Texto",
    image: "Imagem",
    card: "Card",
    container: "Container",
    divider: "Divisor",
    table: "Tabela",
    list: "Lista",
    icon: "Ícone",
  };
  return labels[t] ?? t;
};

export function IsolatedEditorDialog() {
  const {
    isOpen,
    closeEditor,
    openEditor,
    targetType,
    targetId,
    elementTree,
    selectedIds,
    setSelectedIds,
    addElement,
    updateElement,
    updateElementStyle,
    removeElements,
    duplicateElements,
    code,
    setCode,
    format,
    setFormat,
    save
  } = useIsolatedEditorStore();

  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const lastGeneratedHtml = useRef<string>("");

  const sincronizarArvoreParaCodigo = (targetFormat: typeof format) => {
    try {
      if (targetFormat === "json") {
        setCode(JSON.stringify(elementTree, null, 2));
      } else if (targetFormat === "xml") {
        const sub: ReportTemplate = { ...template, elements: elementTree };
        setCode(serializeTemplateXml(sub));
      } else if (targetFormat === "html") {
        const generated = renderSelectionHtml(template, elementTree, data);
        lastGeneratedHtml.current = generated;
        setCode(generated);
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar árvore para código:", err);
      toast.error("Erro ao gerar o código bruto.");
    }
  };

  const sincronizarCodigoParaArvore = (): boolean => {
    try {
      if (format === "html") {
        if (code !== lastGeneratedHtml.current) {
          // O usuário editou o HTML manualmente, vamos transformá-lo num container customizado!
          const maxX = Math.max(...elementTree.map(e => e.x + e.width), 800);
          const maxY = Math.max(...elementTree.map(e => e.y + e.height), 600);
          const newElement: TemplateElement = {
            id: "html_custom_" + Date.now().toString(36),
            type: "container",
            name: "HTML Bruto Customizado",
            x: 0,
            y: 0,
            width: maxX,
            height: maxY,
            frameId: elementTree[0]?.frameId || "default",
            data: { customHtml: code },
            style: {},
          };
          useIsolatedEditorStore.setState({ elementTree: [newElement] });
        }
        return true;
      }

      if (format === "json") {
        const parsed = JSON.parse(code);
        const elements = Array.isArray(parsed) ? parsed : [parsed];
        
        const isValid = elements.every(el => el && typeof el === "object" && "id" in el && "type" in el);
        if (!isValid) {
          throw new Error("JSON deve ser um array ou objeto válido de elementos do template (conter 'id' e 'type').");
        }

        useIsolatedEditorStore.setState({ elementTree: elements });
      } else if (format === "xml") {
        const parsedTemplate = parseTemplateXml(code);
        useIsolatedEditorStore.setState({ elementTree: parsedTemplate.elements });
      }
      return true;
    } catch (err: any) {
      console.error("Erro ao fazer parse do código:", err);
      toast.error(`Erro de sintaxe no ${format.toUpperCase()}: ${err.message || err}`);
      return false;
    }
  };

  // Sincronizar abertura por eventos customizados da tela do canvas principal
  useEffect(() => {
    const handler = () => {
      const editorState = useEditorStore.getState();
      const selectedIds = editorState.selectedIds;
      if (selectedIds.length === 0) return;

      const selectedElements = editorState.template.elements.filter((e) =>
        selectedIds.includes(e.id)
      );
      if (selectedElements.length === 0) return;

      // 1. Encontrar a caixa delimitadora mínima (menor x e menor y)
      const minX = Math.min(...selectedElements.map((e) => e.x));
      const minY = Math.min(...selectedElements.map((e) => e.y));

      // 2. Transladar os elementos para iniciar a partir de (50, 50) no mini-canvas
      const offsetX = 50 - minX;
      const offsetY = 50 - minY;

      const clonedElements = selectedElements.map((e) => ({
        ...structuredClone(e),
        x: e.x + offsetX,
        y: e.y + offsetY,
      }));

      // 3. Abrir o editor isolado com a árvore transladada e callback de save personalizado
      const targetId = selectedIds.length === 1 ? selectedIds[0] : `${selectedIds.length} elementos`;
      openEditor({
        targetType: "component",
        targetId: targetId,
        elementTree: clonedElements,
        code: "",
        format: "html",
        onSave: (finalTree, finalCode, finalFormat) => {
          // 4. Aplicar a translação reversa antes de reintegrar no canvas principal
          const originalElements = finalTree.map((e) => ({
            ...e,
            x: e.x - offsetX,
            y: e.y - offsetY,
          }));

          const currentEditorState = useEditorStore.getState();
          
          // Gravar no histórico de desfazer (Undo)
          currentEditorState.pushHistory();

          // Remover os IDs selecionados originais e injetar as versões atualizadas (criações/deleções/edições)
          const updatedElements = [
            ...currentEditorState.template.elements.filter(
              (e) => !selectedIds.includes(e.id)
            ),
            ...originalElements,
          ];

          useEditorStore.setState({
            template: {
              ...currentEditorState.template,
              elements: updatedElements,
            },
            // Manter a seleção amigável dos elementos modificados de volta no canvas principal
            selectedIds: originalElements.map((e) => e.id),
          });
        },
      });
    };

    window.addEventListener("rd:open-isolated", handler);
    return () => window.removeEventListener("rd:open-isolated", handler);
  }, [openEditor]);

  const selectedElements = useMemo(
    () => elementTree.filter((e) => selectedIds.includes(e.id)),
    [elementTree, selectedIds]
  );

  const selectedSingle = selectedElements[0] ?? null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeEditor()}>
      {/* showClose={false} para evitar o duplo botão de fechar */}
      <DialogContent showClose={false} className="max-w-[98vw] w-[96vw] h-[95vh] p-0 gap-0 flex flex-col overflow-hidden bg-slate-950 text-slate-100 border-slate-800 rounded-xl shadow-2xl">
        <DialogTitle className="sr-only">Editor de Layout Isolado</DialogTitle>
        <DialogDescription className="sr-only">Interface para criação, edição e estruturação visual e em código de componentes de relatório em modo isolado</DialogDescription>
        
        {/* Cabeçalho Premium - Usando o azul de destaque */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="size-4 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Editor de Layout Isolado
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/10">
                  {targetType === "canonicalField" ? "Tipo de Integração" : "Componente customizado"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                ID do Alvo: <span className="font-mono text-blue-300">{targetId}</span>
              </p>
            </div>
          </div>

          {/* Abas Visuais vs Código Bruto - Usando azul */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800/80 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => {
                const success = sincronizarCodigoParaArvore();
                if (success) {
                  setActiveTab("visual");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all duration-250 cursor-pointer",
                activeTab === "visual"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers className="size-3.5" /> Editor Visual (Mini-Canvas)
            </button>
            <button
              onClick={() => {
                sincronizarArvoreParaCodigo(format);
                setActiveTab("code");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all duration-250 cursor-pointer",
                activeTab === "code"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Code className="size-3.5" /> Código Bruto ({format.toUpperCase()})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (activeTab === "code") {
                  const success = sincronizarCodigoParaArvore();
                  if (!success) return;
                }
                await save();
              }}
              className="h-9 px-4 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="size-3.5" /> Salvar Alterações
            </button>
            <button
              onClick={closeEditor}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 active:scale-[0.95] transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Corpo principal */}
        <div className="flex-1 min-h-0 flex bg-slate-950">
          
          {activeTab === "visual" ? (
            <>
              {/* Coluna Esquerda (Mini-Drawer): Elementos Rápidos & Toolbar de Formatação no Modal */}
              <div className="w-[260px] border-r border-slate-900 bg-slate-900/30 p-3 shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
                

                {/* Seção de Elementos Básicos para Arrastar/Adicionar */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Elementos Básicos
                  </h3>
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Clique ou arraste um elemento para incluí-lo na área de recorte.
                  </p>

                  <div className="space-y-1.5">
                    {ELEMENT_TYPES.map((el) => {
                      const Icon = el.icon;
                      return (
                        <button
                          key={el.type}
                          onClick={() => addElement(el.type, { x: 30, y: 30 })}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-rd-element", el.type);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          className="w-full text-left p-2 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-blue-600/10 hover:border-blue-500/30 transition-all duration-200 group flex items-start gap-2.5 cursor-grab active:cursor-grabbing"
                        >
                          <div className="h-7 w-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
                            <Icon className="size-3.5 text-slate-400 group-hover:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-200 group-hover:text-slate-100">
                              {el.label}
                            </div>
                            <p className="text-[8.5px] text-slate-500 group-hover:text-slate-400 line-clamp-1 mt-0.5">
                              {el.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Coluna Central: Infinite Canvas Isolado */}
              <div className="flex-1 h-full relative">
                <InfiniteCanvas isIsolated={true} />
              </div>

              {/* Coluna Direita: Editor de Propriedades */}
              <div className="w-[300px] border-l border-slate-900 bg-slate-900/10 shrink-0 h-full overflow-y-auto">
                <RightInspector isIsolated={true} />
              </div>
            </>
          ) : (
            /* Modo Editor de Código Monaco */
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Barra de Ferramentas de Código - Usando o azul do tema */}
              <div className="h-10 px-4 bg-slate-900/40 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="size-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">Editor de Código-Fonte Bruto</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Formato:</span>
                  {(["html", "json", "xml"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        sincronizarArvoreParaCodigo(fmt);
                        setFormat(fmt);
                      }}
                      className={cn(
                        "h-6 px-2.5 text-[10px] font-bold rounded transition-all cursor-pointer",
                        format === fmt
                          ? "bg-blue-650 text-white shadow-sm"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                      )}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Monaco */}
              <div className="flex-1 bg-slate-950 relative border-b border-slate-900">
                <Editor
                  height="100%"
                  language={format === "xml" ? "xml" : format === "json" ? "json" : "html"}
                  theme={editorTheme}
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
                    wordWrap: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    readOnly: false
                  }}
                />
              </div>

              {/* Rodapé informativo de código - Usando azul do tema */}
              <div className="p-3 bg-slate-900/30 flex items-start gap-2 text-[10px] text-slate-500 leading-normal shrink-0">
                <div className="h-5 w-5 rounded bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/10 text-blue-400">
                  <Sparkles className="size-3" />
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Edição síncrona:</span> Você pode customizar o HTML/XML ou as estruturas JSON brutas consumidas pelos motores de integração diretamente. Ao salvar, as alterações serão gravadas diretamente no registro do Tipo ou do Componente Personalizado.
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../store/editor.store";
import type { FramePreset } from "../schema/template";
import { PRESET_LIST } from "../utils/frames-presets";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Trash2, 
  Copy, 
  ChevronDown, 
  MoreVertical, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Grid,
  Magnet,
  Terminal,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmDialog } from "./dialogs/ConfirmDialog";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function PageTabs() {
  const frames = useEditorStore((s) => s.template.frames);
  const activeFrameId = useEditorStore((s) => s.activeFrameId);
  const setActiveFrame = useEditorStore((s) => s.setActiveFrame);
  const addFrame = useEditorStore((s) => s.addFrame);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const duplicateFrame = useEditorStore((s) => s.duplicateFrame);
  const removeFrame = useEditorStore((s) => s.removeFrame);
  const setViewport = useEditorStore((s) => s.setViewport);

  // Estados e Ações consolidadas do StatusBar
  const zoom = useEditorStore((s) => s.viewport.zoom);
  const viewportX = useEditorStore((s) => s.viewport.x);
  const showGrid = useEditorStore((s) => s.showGrid);
  const snap = useEditorStore((s) => s.snap);
  const mode = useEditorStore((s) => s.mode);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const setMode = useEditorStore((s) => s.setMode);
  const consoleOpen = useEditorStore((s) => s.consoleOpen);
  const toggleConsole = useEditorStore((s) => s.toggleConsole);

  // Estados para edição rápida inline de nome
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Foca e seleciona o input de renomeação inline
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Função para mudar a página ativa e rolar o canvas até ela
  const handleSelectPage = (id: string) => {
    const targetFrame = frames.find((f) => f.id === id);
    if (!targetFrame) return;

    setActiveFrame(id);

    // Ajusta o viewport para centralizar a página selecionada com zoom ideal
    setViewport({
      x: -targetFrame.x * 0.6 + 100,
      y: -targetFrame.y * 0.6 + 60,
      zoom: 0.6,
    });
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingValue(name);
  };

  const handleSaveRename = (id: string) => {
    setEditingId(null);
    if (editingValue.trim() && editingValue.trim() !== frames.find(f => f.id === id)?.name) {
      updateFrame(id, { name: editingValue.trim() });
      toast.success(`Página renomeada para "${editingValue.trim()}"`);
    }
  };

  const handleAddDefaultPage = () => {
    // Adiciona uma página no formato A4-P padrão
    addFrame("a4-p" as FramePreset);
    toast.success("Nova página A4 criada!");
    
    // Pequeno delay para focar na nova página criada
    setTimeout(() => {
      const nextStore = useEditorStore.getState();
      const nextFrames = nextStore.template.frames;
      if (nextFrames.length > 0) {
        const lastFrame = nextFrames[nextFrames.length - 1];
        handleSelectPage(lastFrame.id);
      }
    }, 50);
  };

  // Funções de rolagem lateral se tiver muitas abas
  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="h-9 w-full bg-slate-50 dark:bg-slate-950 border-t border-b border-slate-200 dark:border-slate-800 flex items-center px-2 select-none shrink-0 transition-colors">
      
      {/* 1. Controles de Status (Modo, Grid, Snap, Console) - Estilo Excel */}
      <div className="flex items-center gap-1 shrink-0 pr-2 border-r border-slate-200 dark:border-slate-800 mr-2">
        <TooltipProvider delayDuration={150}>
          {/* Modo Preview/Esqueleto */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setMode(mode === "skeleton" ? "preview" : "skeleton")}
                className={cn(
                  "p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 text-slate-500",
                  mode === "preview" && "text-indigo-650 dark:text-yellow-500 bg-indigo-50 dark:bg-indigo-950/45"
                )}
                aria-label="Alternar Modo de Exibição"
              >
                {mode === "preview" ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2 py-1 shadow-md z-[110]">
              Modo: {mode === "skeleton" ? "Esqueleto (Edição)" : "Preview (Visualização)"}
            </TooltipContent>
          </Tooltip>

          {/* Grid On/Off */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleGrid}
                className={cn(
                  "p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 text-slate-500",
                  showGrid && "text-indigo-650 dark:text-yellow-500 bg-indigo-50 dark:bg-indigo-950/45"
                )}
                aria-label="Alternar Grid"
              >
                <Grid className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2 py-1 shadow-md z-[110]">
              Grade (Grid): {showGrid ? "Ativo" : "Inativo"}
            </TooltipContent>
          </Tooltip>

          {/* Snap On/Off */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSnap}
                className={cn(
                  "p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 text-slate-500",
                  snap && "text-indigo-650 dark:text-yellow-500 bg-indigo-50 dark:bg-indigo-950/45"
                )}
                aria-label="Alternar Snap"
              >
                <Magnet className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2 py-1 shadow-md z-[110]">
              Atração Magnética (Snap): {snap ? "Ativo" : "Inativo"}
            </TooltipContent>
          </Tooltip>

          {/* Console On/Off */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleConsole}
                className={cn(
                  "p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 text-slate-500",
                  consoleOpen && "text-indigo-650 dark:text-yellow-500 bg-indigo-50 dark:bg-indigo-950/40"
                )}
                aria-label="Alternar Console"
              >
                <Terminal className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2 py-1 shadow-md z-[110]">
              Console: {consoleOpen ? "Aberto" : "Fechado"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Botões de Rolagem se as abas passarem do tamanho */}
      <button 
        onClick={() => scrollTabs("left")}
        className="h-7 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900 rounded transition-colors shrink-0"
        title="Rolar abas para a esquerda"
      >
        <ChevronLeft className="size-3.5" />
      </button>

      {/* Container de Abas Horizontal */}
      <div 
        ref={tabsContainerRef}
        className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none h-full px-1 min-w-0"
        style={{ scrollbarWidth: "none" }}
      >
        {frames.map((f, idx) => {
          const isActive = activeFrameId === f.id;
          const isEditing = editingId === f.id;

          return (
            <div
              key={f.id}
              onClick={() => !isEditing && handleSelectPage(f.id)}
              onDoubleClick={() => handleStartRename(f.id, f.name)}
              className={cn(
                "group relative h-[29px] mt-[9px] px-3.5 rounded-t-lg flex items-center gap-1.5 cursor-pointer border-t border-l border-r text-xs transition-all shrink-0 max-w-[150px] min-w-[70px]",
                isActive 
                  ? "bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 font-bold text-slate-850 dark:text-slate-100" 
                  : "bg-slate-100/40 dark:bg-slate-950/20 border-transparent text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {/* Barra inferior colorida (Estilo Planilha) */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg bg-indigo-600 dark:bg-yellow-500 animate-scale-in" />
              )}

              {/* Renderização do Nome ou Input Inline */}
              <div className="flex-1 truncate min-w-0 text-center select-none font-medium text-[11px] tracking-wide">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => handleSaveRename(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(f.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-5 px-1 py-0 bg-slate-50 dark:bg-slate-800 border border-indigo-500 focus:outline-none focus:ring-0 rounded text-[11px] font-bold text-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <span>{f.name}</span>
                )}
              </div>

              {/* Menu Dropdown de Opções Rápidas (Aparece no Hover ou ativação) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button 
                    className={cn(
                      "p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title="Ações da página"
                  >
                    <MoreVertical className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-250 text-xs shadow-2xl rounded-lg p-1 w-40 z-[100]"
                >
                  <DropdownMenuItem 
                    onClick={() => handleStartRename(f.id, f.name)}
                    className="focus:bg-slate-100 dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Renomear</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      duplicateFrame(f.id);
                      toast.success(`Página "${f.name}" duplicada!`);
                    }}
                    className="focus:bg-slate-100 dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="size-3 text-indigo-500" />
                    <span>Duplicar Página</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled={frames.length === 1}
                    onClick={() => {
                      confirmDialog({
                        title: `Excluir página "${f.name}"?`,
                        description: "Todos os elementos contidos nela também serão excluídos.",
                        destructive: true,
                        confirmLabel: "Excluir",
                        onConfirm: () => {
                          removeFrame(f.id);
                          toast.success(`Página "${f.name}" excluída.`);
                          
                          // Pequeno delay para mover para a primeira página restante
                          setTimeout(() => {
                            const remainFrames = useEditorStore.getState().template.frames;
                            if (remainFrames.length > 0) {
                              handleSelectPage(remainFrames[0].id);
                            }
                          }, 50);
                        },
                      });
                    }}
                    className={cn(
                      "focus:bg-red-50 dark:focus:bg-red-950/20 text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer flex items-center gap-1.5",
                      frames.length === 1 && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="size-3" />
                    <span>Excluir Página</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => scrollTabs("right")}
        className="h-7 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900 rounded transition-colors shrink-0"
        title="Rolar abas para a direita"
      >
        <ChevronRight className="size-3.5" />
      </button>

      {/* Divisor Visual */}
      <div className="w-px h-5 bg-slate-250 dark:bg-slate-800 mx-1.5 shrink-0" />

      {/* 3. Botão + para Criar Nova Página */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="h-6 px-2 flex items-center gap-1 text-[11px] font-bold bg-indigo-600 dark:bg-yellow-500 hover:bg-indigo-700 dark:hover:bg-yellow-600 text-white dark:text-slate-950 rounded-md shadow-xs transition-colors shrink-0 cursor-pointer"
            title="Adicionar Nova Página"
          >
            <Plus className="size-3.5 shrink-0" />
            <span>Página</span>
            <ChevronDown className="size-3 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-250 text-xs shadow-2xl rounded-lg p-1 w-44 z-[100]"
        >
          {PRESET_LIST.map((p) => (
            <DropdownMenuItem 
              key={p.id} 
              onClick={() => {
                addFrame(p.id as FramePreset);
                toast.success(`Página no formato ${p.label} criada!`);
                // Foca na nova página
                setTimeout(() => {
                  const nextStore = useEditorStore.getState();
                  const nextFrames = nextStore.template.frames;
                  if (nextFrames.length > 0) {
                    const lastFrame = nextFrames[nextFrames.length - 1];
                    handleSelectPage(lastFrame.id);
                  }
                }, 50);
              }}
              className="focus:bg-slate-100 dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white cursor-pointer"
            >
              <Layers className="size-3 text-slate-400 shrink-0 mr-1.5" />
              <span>{p.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divisor Visual */}
      <div className="w-px h-5 bg-slate-250 dark:bg-slate-800 mx-2 shrink-0" />

      {/* 4. Barra de Scroll Horizontal do Canvas */}
      <div className="flex items-center gap-1.5 px-2 flex-1 max-w-[160px] min-w-[70px] shrink-0">
        <span className="text-[8px] text-slate-400 font-extrabold tracking-wider shrink-0 select-none">ROLAR</span>
        <input
          type="range"
          min="-2500"
          max="2500"
          value={Math.round(viewportX)}
          onChange={(e) => setViewport({ x: Number(e.target.value) })}
          className="w-full h-1 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650 dark:accent-yellow-500 focus:outline-none hover:h-1.5 transition-all"
          title="Rolar Canvas Horizontalmente"
        />
      </div>

      {/* 5. Controles de Zoom */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2 border-l border-slate-200 dark:border-slate-800 h-5">
        <button
          onClick={() => setViewport({ zoom: Math.max(0.1, zoom / 1.2) })}
          className="p-1 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900 rounded transition-colors cursor-pointer"
          title="Diminuir Zoom"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <span 
          onClick={() => setViewport({ x: 60, y: 60, zoom: 0.6 })}
          className="w-10 text-center text-[10px] font-extrabold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-650 dark:hover:text-yellow-500 transition-colors"
          title="Redefinir Câmera (Enquadrar)"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setViewport({ zoom: Math.min(4, zoom * 1.2) })}
          className="p-1 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900 rounded transition-colors cursor-pointer"
          title="Aumentar Zoom"
        >
          <ZoomIn className="size-3.5" />
        </button>
      </div>

    </div>
  );
}

import { useEffect, useState } from "react";
import { useEditorStore } from "../store/editor.store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TitleBar } from "./TitleBar";
import { Ribbon } from "./Ribbon";
import { FormulaBar } from "./FormulaBar";
import { LeftPanel } from "./LeftPanel";

import { PageTabs } from "./PageTabs";
import { BottomConsole } from "./BottomConsole";
import { InfiniteCanvas } from "./Canvas/InfiniteCanvas";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { TemplateCodeDialog } from "./TemplateCodeDialog";
import { PreviewWindow } from "./PreviewWindow";
import { HtmlInspectorPanel } from "./HtmlInspectorPanel";
import { IsolatedEditorDialog } from "./IsolatedEditorDialog";
import { RightInspector } from "./RightInspector";
import { SaveComponentDialog } from "./dialogs/SaveComponentDialog";
import { ConfirmDialog } from "./dialogs/ConfirmDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sliders, Palette, Code2, Link2, Database } from "lucide-react";

import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function EditorApp() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useEditorStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const consoleOpen = useEditorStore((s) => s.consoleOpen);
  const htmlInspectorOpen = useEditorStore((s) => s.htmlInspectorOpen);
  const setHtmlInspectorOpen = useEditorStore((s) => s.setHtmlInspectorOpen);
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen);
  const activeRightTab = useEditorStore((s) => s.activeRightTab);
  const setActiveRightTab = useEditorStore((s) => s.setActiveRightTab);

  useEffect(() => {
    const handler = () => {
      setHtmlInspectorOpen(true);
    };
    window.addEventListener("rd:open-html-inspector", handler);
    return () => window.removeEventListener("rd:open-html-inspector", handler);
  }, [setHtmlInspectorOpen]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }


  const mainArea = (
    <div className="flex-1 flex min-h-0 h-full overflow-hidden bg-background">
      <ResizablePanelGroup direction="horizontal" autoSaveId="templates-drawer-horizontal-main-layout-v3">
        {/* Painel Esquerdo Redimensionável */}
        <ResizablePanel id="left-panel-resizable" defaultSize={20} minSize={15} maxSize={35}>
          <motion.div 
            className="h-full w-full"
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.1 }}
          >
            <LeftPanel />
          </motion.div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="w-1.5 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-indigo-500/40 active:bg-indigo-500 transition-colors duration-200" />
        
        {/* Canvas Central Flexível */}
        <ResizablePanel id="canvas-panel-resizable" defaultSize={rightPanelOpen ? 60 : 80} minSize={40}>
          <motion.div 
            className="flex flex-col w-full h-full min-w-0 bg-[#0f172a]/5 dark:bg-black/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.12 }}
          >
            <div className="flex-1 min-h-0">
              <InfiniteCanvas />
            </div>
            <PageTabs />
          </motion.div>
        </ResizablePanel>

        {/* Painel Direito Redimensionável se aberto */}
        {rightPanelOpen && (
          <>
            <ResizableHandle withHandle className="w-1.5 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-indigo-500/40 active:bg-indigo-500 transition-colors duration-200" />
            <ResizablePanel id="right-inspector-resizable" defaultSize={20} minSize={15} maxSize={35}>
              <motion.div 
                className="h-full w-full"
                initial={{ x: 8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.1 }}
              >
                <RightInspector />
              </motion.div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Tira Lateral vertical compacta de abas (Estilo Planilha) sempre visível */}
      <motion.div 
        className="w-10 flex flex-col items-center py-4 gap-3 bg-slate-50 dark:bg-[#0f172a]/30 border-l border-slate-200 dark:border-slate-800 select-none shrink-0 overflow-y-auto scrollbar-none animate-in"
        initial={{ x: 8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.32, ease: "easeOut", delay: 0.1 }}
      >
        {[
          { id: "layout" as const, label: "Layout", shortLabel: "Layout", icon: Sliders },
          { id: "style" as const, label: "Estilo", shortLabel: "Estilo", icon: Palette },
          { id: "html" as const, label: "HTML Custom", shortLabel: "HTML", icon: Code2 },
          { id: "binding" as const, label: "Conexões / Binding", shortLabel: "Conexões", icon: Link2 },
          { id: "data" as const, label: "Dados / Conteúdo", shortLabel: "Campos", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = rightPanelOpen && activeRightTab === tab.id;
          return (
            <Tooltip key={tab.id} delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (rightPanelOpen && activeRightTab === tab.id) {
                      setRightPanelOpen(false);
                    } else {
                      setActiveRightTab(tab.id);
                      setRightPanelOpen(true);
                    }
                  }}
                  className={cn(
                    "relative w-7.5 py-3.5 px-0.5 rounded-lg flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs border border-transparent",
                    isActive
                      ? "bg-[var(--editor-ribbon-accent)] text-white font-bold shadow-md scale-102"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900/60"
                  )}
                  aria-label={tab.label}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="[writing-mode:vertical-lr] text-[8px] font-black tracking-wider uppercase select-none leading-none mt-1">
                    {tab.shortLabel}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-150 dark:text-slate-950 px-2 py-1 shadow-md border-0">
                {tab.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </motion.div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <div className="h-full w-full flex flex-col bg-background text-foreground select-none overflow-hidden">
      {/* Barra de Título (TitleBar) - Desliza do topo */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <TitleBar />
      </motion.div>

      {/* Ribbon e FormulaBar - Revelação suave logo abaixo */}
      <motion.div
        className="relative z-[45]"
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut", delay: 0.04 }}
      >
        <Ribbon />
        <FormulaBar />
      </motion.div>

      {/* Área de Conteúdo Principal (Central + Console se aberto) - Fade-in com escala sutil */}
      <motion.div 
        className="flex-1 min-h-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
      >
        <ResizablePanelGroup
          direction="vertical"
          autoSaveId="templates-drawer-console-vertical"
        >
          <ResizablePanel
            id="main"
            defaultSize={70}
            minSize={20}
          >
            {mainArea}
          </ResizablePanel>
          {consoleOpen && (
            <>
              <ResizableHandle withHandle className="h-1.5 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-indigo-500/40 active:bg-indigo-500 transition-colors duration-200" />
              <ResizablePanel
                id="console"
                defaultSize={30}
                minSize={10}
              >
                <BottomConsole />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </motion.div>
      <KeyboardShortcutsDialog />
      <TemplateCodeDialog />
      <PreviewWindow />
      <IsolatedEditorDialog />
      <SaveComponentDialog />
      <ConfirmDialog />
      <Dialog open={htmlInspectorOpen} onOpenChange={setHtmlInspectorOpen}>
        <DialogContent showClose={false} className="max-w-4xl h-[80vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Editor HTML</DialogTitle>
          <DialogDescription className="sr-only">Painel de inspeção e edição de código HTML customizado do elemento</DialogDescription>
          <HtmlInspectorPanel />
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
}
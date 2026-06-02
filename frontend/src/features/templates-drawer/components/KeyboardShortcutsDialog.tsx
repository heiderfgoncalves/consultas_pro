import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SHORTCUTS } from "../shortcuts/registry";

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (!isTyping && e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("rd:open-shortcuts", openEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("rd:open-shortcuts", openEvt);
    };
  }, []);

  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atalhos do teclado</DialogTitle>
          <DialogDescription className="sr-only">Lista de todos os atalhos de teclado disponíveis no editor do Templates Drawer</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm max-h-[60vh] overflow-auto">
          {groups.map((g) => (
            <div key={g}>
              <div className="font-semibold text-xs uppercase text-slate-500 mb-2">
                {g}
              </div>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <div key={s.keys + s.label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">{s.label}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border rounded text-slate-600">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
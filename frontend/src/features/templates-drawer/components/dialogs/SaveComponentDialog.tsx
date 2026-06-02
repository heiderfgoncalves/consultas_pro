import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "../../store/editor.store";
import { toast } from "sonner";

const CATEGORIES = ["card", "header", "footer", "table", "block", "custom"] as const;

export function SaveComponentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("custom");
  const save = useEditorStore((s) => s.saveSelectionAsComponentWithMeta);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  useEffect(() => {
    const openEvt = () => {
      if (selectedIds.length === 0) {
        toast.warning("Selecione um ou mais elementos primeiro.");
        return;
      }
      setName("");
      setCategory("custom");
      setOpen(true);
    };
    window.addEventListener("rd:open-save-component", openEvt);
    return () => window.removeEventListener("rd:open-save-component", openEvt);
  }, [selectedIds]);

  function handleSave() {
    const final = name.trim() || "Componente sem nome";
    save(final, category);
    setOpen(false);
    toast.success(`Componente "${final}" salvo.`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como componente</DialogTitle>
          <DialogDescription className="sr-only">Insira o nome e a categoria para salvar os elementos selecionados do layout como um novo componente reutilizável</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="comp-name">Nome</Label>
            <Input
              id="comp-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Ex.: Cabeçalho com logo"
            />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            {selectedIds.length} elemento{selectedIds.length === 1 ? "" : "s"} serão agrupados.
          </p>
        </div>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="h-8 px-3 text-sm rounded border hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="h-8 px-3 text-sm rounded bg-slate-900 text-white hover:bg-slate-700"
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
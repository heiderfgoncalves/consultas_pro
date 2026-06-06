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

import { X } from "lucide-react";

export function SaveComponentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("custom");
  const [variables, setVariables] = useState<string[]>([]);
  const [newVar, setNewVar] = useState("");
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
      setVariables([]);
      setNewVar("");
      setOpen(true);
    };
    window.addEventListener("rd:open-save-component", openEvt);
    return () => window.removeEventListener("rd:open-save-component", openEvt);
  }, [selectedIds]);

  function handleAddVar() {
    const trimmed = newVar.trim();
    if (!trimmed) return;
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      toast.warning("Use apenas letras, números e sublinhados.");
      return;
    }
    if (variables.includes(trimmed)) {
      toast.warning("Este parâmetro já existe.");
      return;
    }
    setVariables([...variables, trimmed]);
    setNewVar("");
  }

  function handleRemoveVar(val: string) {
    setVariables(variables.filter((v) => v !== val));
  }

  function handleSave() {
    const final = name.trim() || "Componente sem nome";
    save(final, category, variables);
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
        <div className="space-y-4 py-2">
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

          {/* Seção de Parâmetros de Entrada */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Parâmetros de Entrada (Opcional)
            </Label>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Crie variáveis dinâmicas que podem ser interpoladas nos elementos internos (ex: <code className="text-indigo-600 dark:text-indigo-400">{"{$params.nome_cliente}"}</code>).
            </p>
            <div className="flex gap-2">
              <Input
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddVar();
                  }
                }}
                placeholder="Ex.: nome_cliente"
                className="h-8 text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleAddVar}
                className="h-8 px-3 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shrink-0"
              >
                Adicionar
              </button>
            </div>
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-[100px] overflow-auto">
                {variables.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                  >
                    <span>{v}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVar(v)}
                      className="hover:text-indigo-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 pt-1">
            {selectedIds.length} elemento{selectedIds.length === 1 ? "" : "s"} serão agrupados.
          </p>
        </div>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="h-8 px-3 text-sm rounded border hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="h-8 px-3 text-sm rounded bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white hover:bg-slate-700"
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
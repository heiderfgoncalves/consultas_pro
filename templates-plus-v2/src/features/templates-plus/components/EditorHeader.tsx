import { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, Sparkles } from "lucide-react";
import { queryTypes } from "../mocks";
import { toast } from "sonner";

export function EditorHeader() {
  const template = useEditorStore((s) => s.templates.find((t) => t.id === s.activeTemplateId)!);
  const templates = useEditorStore((s) => s.templates);
  const setActive = useEditorStore((s) => s.setActiveTemplate);
  const activeQueryId = useEditorStore((s) => s.activeQueryId);
  const setQuery = useEditorStore((s) => s.setActiveQuery);
  const experience = useEditorStore((s) => s.experience);
  const setExperience = useEditorStore((s) => s.setExperience);
  const rename = useEditorStore((s) => s.renameTemplate);
  const save = useEditorStore((s) => s.save);
  const dirty = useEditorStore((s) => s.dirty);

  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(template.name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(template.name), [template.name]);
  useEffect(() => { if (editingName) ref.current?.select(); }, [editingName]);

  const confirm = () => {
    const v = draft.trim();
    if (v && v !== template.name) rename(v);
    setEditingName(false);
  };

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 pr-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold">Editor de template</span>
      </div>
      <div className="ml-4 flex flex-1 items-center gap-4">
        <Field label="Template">
          {editingName ? (
            <Input
              ref={ref}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={confirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") { setDraft(template.name); setEditingName(false); }
              }}
              className="h-8 w-[220px] text-xs"
            />
          ) : (
            <div className="flex items-center gap-1">
              <Select value={template.id} onValueChange={setActive}>
                <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditingName(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Field>

        <Field label="Consulta">
          <Select value={activeQueryId} onValueChange={setQuery}>
            <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {queryTypes.map((q) => <SelectItem key={q.id} value={q.id} className="text-xs">{q.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Experiência">
          <Select value={experience} onValueChange={(v) => setExperience(v as "admin" | "user")}>
            <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin" className="text-xs">Admin (alta customização)</SelectItem>
              <SelectItem value="user" className="text-xs">Usuário (edição simples)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Button
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => { save(); toast.success("Template salvo"); }}
      >
        <Save className="h-3.5 w-3.5" />
        Salvar{dirty ? " *" : ""}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

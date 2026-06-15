import { useEditorStore } from "../store/editor.store";
import { Button } from "@/components/ui/button";
import { Download, Upload, FilePlus2, Save, Eye, Printer, Code2, Keyboard, CircleDot, CheckCircle2, Loader2, Pencil, Check, BarChart3 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patchTemplateLayoutApi, getTemplatesApi, createTemplateApi, getProviders } from "@/api/admin-integrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatRelative(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return `há ${h} h`;
}

export function TitleBar() {
  const name = useEditorStore((s) => s.template.name);
  const rename = useEditorStore((s) => s.renameTemplate);
  const template = useEditorStore((s) => s.template);
  const load = useEditorStore((s) => s.loadTemplate);
  const newTpl = useEditorStore((s) => s.newTemplate);
  const dirty = useEditorStore((s) => s.dirty);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const markSaved = useEditorStore((s) => s.markSaved);
  const setSelectedConsultaIds = useEditorStore((s) => s.setSelectedConsultaIds);
  const [now, setNow] = useState(Date.now());

  // Integração com Produção & Estado de autenticação
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeTemplateId = useEditorStore((s) => s.activeTemplateId);
  const setActiveTemplateId = useEditorStore((s) => s.setActiveTemplateId);

  const queryClient = useQueryClient();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);

  // Replicando a query de templates para usar cache do React Query
  const templatesQuery = useQuery({
    queryKey: ['production-templates-integration'],
    queryFn: () => getTemplatesApi(accessToken),
    enabled: !!accessToken,
  });

  // Query de Provedores para obter produtos e associar ao template se necessário (criação)
  const providersQuery = useQuery({
    queryKey: ['admin-providers-integration'],
    queryFn: () => getProviders(accessToken),
    enabled: !!accessToken,
  });

  // Deriva o primeiro produto ativo cadastrado no sistema para ser a associação padrão
  const defaultItems = useMemo(() => {
    if (!providersQuery.data) return [];
    for (const provider of providersQuery.data) {
      if (!provider.isActive) continue;
      for (const prod of provider.products) {
        if (prod.isActive) {
          return [
            {
              providerProductId: prod.id,
              sortOrder: 0,
            },
          ];
        }
      }
    }
    return [];
  }, [providersQuery.data]);

  // Sincroniza o rascunho de nome quando o nome do template muda externamente
  useEffect(() => {
    setTempName(name);
  }, [name]);

  const handleFinishEditing = () => {
    if (tempName.trim() && tempName.trim() !== name) {
      rename(tempName.trim());
    }
    setIsEditingName(false);
  };

  const saveLayoutMutation = useMutation({
    mutationFn: async (vars?: { isAutosave?: boolean }) => {
      let targetId = activeTemplateId;
      const selectedConsultaIds = useEditorStore.getState().selectedConsultaIds;
      const templateItems = selectedConsultaIds.map((id, index) => ({
        providerProductId: id,
        sortOrder: index,
      }));

      // Se não há um ID ativo, estamos salvando um rascunho local pela primeira vez!
      if (!targetId) {
        const itemsToCreate = templateItems.length > 0 ? templateItems : defaultItems;
        if (itemsToCreate.length === 0) {
          throw new Error("Selecione pelo menos uma consulta ativa como fonte para salvar o template.");
        }

        if (!vars?.isAutosave) {
          toast.info("Criando novo template de relatório no servidor...");
        }
        const createdTpl = await createTemplateApi(accessToken, {
          name: template.name,
          visibility: "PRIVATE",
          items: itemsToCreate,
        });

        if (!createdTpl || !createdTpl.id) {
          throw new Error("Falha ao criar o template no backend do servidor.");
        }

        targetId = createdTpl.id;
      }

      const currentDataJson = useEditorStore.getState().dataJson;
      const payloadTemplate = {
        ...template,
        metadata: {
          ...(template.metadata || {}),
          lastAdminData: currentDataJson
        }
      };

      // Com o ID real do banco (seja existente ou recém-criado), salva o layout
      const res = await patchTemplateLayoutApi(accessToken, targetId, {
        name: template.name,
        layout: payloadTemplate,
        items: templateItems, // Envia a lista de fontes atualizada para salvar no banco
      });

      return { res, isAutosave: vars?.isAutosave };
    },
    onSuccess: (data) => {
      if (!data.isAutosave) {
        toast.success("Layout e nome do template salvos no servidor com sucesso!");
      }

      // Se era um template novo, precisamos atualizar o ID ativo no estado global
      if (!activeTemplateId && data.res?.id) {
        setActiveTemplateId(data.res.id);
      }

      queryClient.invalidateQueries({ queryKey: ['production-templates-integration'] });
      markSaved();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar layout no servidor");
    },
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Autosave debounced para o servidor (apenas se houver template ativo)
  useEffect(() => {
    if (!dirty || !activeTemplateId) return;

    const id = setTimeout(() => {
      saveLayoutMutation.mutate({ isAutosave: true });
    }, 3000); // 3 segundos de inatividade

    return () => clearTimeout(id);
  }, [dirty, template, activeTemplateId]);

  // Resetar a flag de sincronização se o template ativo mudar
  useEffect(() => {
    setHasSyncedFromServer(false);
  }, [activeTemplateId]);

  // Sincroniza o layout do banco de dados na inicialização ou troca de template
  useEffect(() => {
    if (!templatesQuery.data || !activeTemplateId) return;
    if (hasSyncedFromServer || dirty) return;

    const t = templatesQuery.data.find((x) => x.id === activeTemplateId);
    if (t && t.layout) {
      try {
        const parsed = typeof t.layout === "string" ? JSON.parse(t.layout) : t.layout;
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.frames)) {
          load(parsed);
          if (t.items) {
            setSelectedConsultaIds(t.items.map((item: any) => item.providerProductId));
          } else {
            setSelectedConsultaIds([]);
          }
          setHasSyncedFromServer(true);
          markSaved();
          toast.success(`Layout do template "${t.name}" sincronizado com o servidor.`);
        }
      } catch (e) {
        console.error("Erro ao sincronizar template do servidor:", e);
      }
    }
  }, [templatesQuery.data, activeTemplateId, hasSyncedFromServer, dirty, load, markSaved, setSelectedConsultaIds]);

  const savedLabel = lastSavedAt
    ? formatRelative(now - lastSavedAt)
    : "ainda não salvo";

  function exportTemplate() {
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name || "template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(String(r.result));
          load(parsed);
        } catch {
          alert("JSON inválido");
        }
      };
      r.readAsText(file);
    };
    input.click();
  }

  const confirmAndProceed = async (targetId: string | null) => {
    if (dirty) {
      const saveOk = window.confirm(
        "Existem alterações não salvas neste template. Deseja salvá-las antes de trocar/sair?"
      );
      if (saveOk) {
        try {
          await saveLayoutMutation.mutateAsync({});
        } catch (err) {
          return false;
        }
      } else {
        const discardOk = window.confirm(
          "Deseja descartar as alterações e prosseguir?"
        );
        if (!discardOk) {
          return false;
        }
      }
    }

    if (targetId === null) {
      setActiveTemplateId(null);
      newTpl();
      setSelectedConsultaIds([]);
      setHasSyncedFromServer(true);
      toast.info("Você está editando um novo template em branco.");
    } else {
      setActiveTemplateId(targetId);
      const t = templatesQuery.data?.find((x) => x.id === targetId);
      if (t && t.layout) {
        try {
          const parsed = typeof t.layout === "string" ? JSON.parse(t.layout) : t.layout;
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.frames)) {
            load(parsed);
            if (t.items) {
              setSelectedConsultaIds(t.items.map((item: any) => item.providerProductId));
            } else {
              setSelectedConsultaIds([]);
            }
            setHasSyncedFromServer(true);
            toast.success(`Layout do template "${t.name}" importado.`);
          } else {
            toast.warning(`O template "${t.name}" não possui um layout visual v2 válido.`);
            newTpl();
            setSelectedConsultaIds([]);
            setHasSyncedFromServer(true);
          }
        } catch {
          toast.error("Erro ao analisar o layout JSON do template.");
          newTpl();
          setSelectedConsultaIds([]);
          setHasSyncedFromServer(true);
        }
      } else {
        toast.info("Este template está sem layout. Comece a desenhá-lo na tela limpa.");
        newTpl();
        if (t && t.items) {
          setSelectedConsultaIds(t.items.map((item: any) => item.providerProductId));
        } else {
          setSelectedConsultaIds([]);
        }
        setHasSyncedFromServer(true);
      }
    }
    return true;
  };

  let statusText = "";
  let statusIcon = null;
  let statusTooltip = "";

  if (!activeTemplateId) {
    statusText = "Rascunho local";
    statusIcon = <CircleDot className="size-2.5 text-amber-300" />;
    statusTooltip = "Este template existe apenas no seu navegador. Clique em 'Salvar' para salvá-lo no banco de dados.";
  } else if (saveLayoutMutation.isPending) {
    statusText = "Salvando...";
    statusIcon = <Loader2 className="size-2.5 animate-spin text-white" />;
    statusTooltip = "Salvando alterações no banco de dados...";
  } else if (dirty) {
    statusText = "Alterações pendentes...";
    statusIcon = <CircleDot className="size-2.5 text-amber-300 animate-pulse" />;
    statusTooltip = "Você fez alterações locais que serão salvas automaticamente no servidor em instantes.";
  } else {
    statusText = lastSavedAt ? `Salvo no servidor (${savedLabel})` : "Sincronizado";
    statusIcon = <CheckCircle2 className="size-2.5 text-emerald-300" />;
    statusTooltip = "Todas as alterações estão salvas no banco de dados.";
  }

  return (
    <div
      className="flex items-center gap-2 px-4 h-9 border-b border-white/10 text-xs shadow-md select-none"
      style={{
        background: "var(--editor-ribbon-accent)",
        color: "white",
      }}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <BarChart3 className="size-4 text-blue-200 animate-pulse" />
        <span className="font-extrabold tracking-wider uppercase text-[10px] text-blue-100">Report Drawer</span>
      </div>
      <span className="opacity-40">·</span>

      {isEditingName ? (
        <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded border border-white/25 animate-scale-in">
          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFinishEditing();
              if (e.key === "Escape") {
                setTempName(name);
                setIsEditingName(false);
              }
            }}
            className="bg-transparent border-none outline-none text-white font-medium text-xs w-48"
            autoFocus
          />
          <button onClick={handleFinishEditing} className="text-white hover:text-emerald-300 transition-colors cursor-pointer">
            <Check className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 hover:border-white/25 hover:bg-white/15 rounded-md px-2.5 h-6.5 transition-all shadow-inner">
          <Select
            value={activeTemplateId || "__none__"}
            onValueChange={async (id) => {
              const targetId = id === "__none__" ? null : id;
              await confirmAndProceed(targetId);
            }}
          >
            <SelectTrigger className="border-none bg-transparent h-6 text-xs text-white p-0 hover:bg-transparent focus:ring-0 gap-1.5 max-w-[200px] font-bold outline-none cursor-pointer">
              <SelectValue placeholder="Selecione um template..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0b0c10]/95 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-2xl">
              <SelectItem value="__none__" className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5">
                Novo template (local)
              </SelectItem>
              {templatesQuery.isLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 p-2">
                  <Loader2 className="size-3 animate-spin text-white" /> Carregando...
                </div>
              ) : (
                templatesQuery.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5">
                    {t.id === activeTemplateId ? name : t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <button
            onClick={() => setIsEditingName(true)}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors animate-scale-in cursor-pointer"
            title="Editar nome do template"
          >
            <Pencil className="size-3" />
          </button>
        </div>
      )}
      <span 
        className="flex items-center gap-1 text-[10px] text-white/80 font-medium ml-1 bg-white/10 rounded-full px-2 py-0.5 cursor-help"
        title={statusTooltip}
      >
        {statusIcon}
        {statusText}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rd:open-preview"))}
          title="Visualizar"
        >
          <Eye className="size-3.5 mr-1" /> Visualizar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rd:print"))}
          title="Imprimir / Salvar PDF (Ctrl+P)"
        >
          <Printer className="size-3.5 mr-1" /> PDF
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rd:open-html-inspector"))}
          title="Inspecionar (HTML/XML/JSON)"
        >
          <Code2 className="size-3.5 mr-1" /> Código
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-1.5 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rd:open-shortcuts"))}
          title="Atalhos do teclado (?)"
        >
          <Keyboard className="size-3.5" />
        </Button>
        <span className="w-px h-4 bg-white/20 mx-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={() => confirmAndProceed(null)}
        >
          <FilePlus2 className="size-3.5 mr-1" /> Novo
        </Button>
        
        {/* Botão Salvar com destaque visual premium (Power BI corporativo) */}
        <Button
          size="sm"
          variant="ghost"
          disabled={saveLayoutMutation.isPending}
          className="h-6.5 px-3 text-white bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/35 font-bold shadow-xs transition-all cursor-pointer text-[11px] rounded"
          onClick={() => {
            saveLayoutMutation.mutate({});
          }}
        >
          {saveLayoutMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin mr-1 text-white" />
          ) : (
            <Save className="size-3.5 mr-1 text-blue-100" />
          )}
          Salvar
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={importTemplate}
        >
          <Upload className="size-3.5 mr-1" /> Importar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6.5 px-2 text-white hover:bg-white/10 hover:text-white transition-all cursor-pointer text-[11px]"
          onClick={exportTemplate}
        >
          <Download className="size-3.5 mr-1" /> Exportar
        </Button>
      </div>
    </div>
  );
}
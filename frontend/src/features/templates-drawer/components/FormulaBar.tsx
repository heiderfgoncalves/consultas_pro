import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editor.store";
import type { TemplateElement } from "../schema/template";
import { getSuggestions, insertSuggestionAt } from "../utils/suggestions";
import { cn } from "@/lib/utils";
import { SafeEditor as Editor } from "./SafeEditor";
import { useTheme } from "next-themes";
import { 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Code,
  Sparkles,
  Search,
  Variable
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

// Definição das funções e helpers matemáticos para o popover "fx"
const MATH_FUNCTIONS = [
  { name: "sum(array)", snippet: "sum(", desc: "Soma todos os números de um array" },
  { name: "count(array)", snippet: "count(", desc: "Conta a quantidade de itens no array" },
  { name: "avg(array)", snippet: "avg(", desc: "Calcula a média dos números do array" },
  { name: "min(array)", snippet: "min(", desc: "Encontra o menor valor do array" },
  { name: "max(array)", snippet: "max(", desc: "Encontra o maior valor do array" },
];

const HELPERS = [
  { name: "formatCurrency(valor)", snippet: "formatCurrency(", desc: "Formata como moeda BRL (R$ 0,00)" },
  { name: "formatBacenCurrency(valor)", snippet: "formatBacenCurrency(", desc: "Formata valor no padrão Bacen" },
  { name: "formatCpfCnpj(valor)", snippet: "formatCpfCnpj(", desc: "Formata strings em CPF ou CNPJ" },
  { name: "math(expressao)", snippet: "math('", desc: "Avalia expressões matemáticas complexas" },
  { name: "calc(expressao)", snippet: "calc('", desc: "Calcula operações aritméticas básicas" },
  { name: "round(valor, decimais)", snippet: "round(", desc: "Arredonda o valor com a quantidade de casas decimais definida" },
];

const LOGICAL_FUNCTIONS = [
  { name: "IF(teste, se_sim, se_nao)", snippet: "IF(", desc: "Executa teste lógico condicional" },
  { name: "SWITCH(expr, val1, res1, ..., padrao)", snippet: "SWITCH(", desc: "Avalia expressões contra uma lista de valores" },
  { name: "DIVIDE(num, den, [alternativo])", snippet: "DIVIDE(", desc: "Divisão segura contra erro de divisão por zero" },
  { name: "COALESCE(val1, val2, ...)", snippet: "COALESCE(", desc: "Retorna o primeiro argumento não nulo" },
  { name: "CONCATENATE(txt1, txt2, ...)", snippet: "CONCATENATE(", desc: "Une múltiplas strings de texto" },
  { name: "UPPER(texto)", snippet: "UPPER(", desc: "Converte o texto para letras maiúsculas" },
  { name: "LOWER(texto)", snippet: "LOWER(", desc: "Converte o texto para letras minúsculas" },
  { name: "LEN(texto)", snippet: "LEN(", desc: "Retorna a quantidade de caracteres do texto" },
  { name: "IFEMPTY(valor, alternativo)", snippet: "IFEMPTY(", desc: "Retorna valor alternativo se estiver vazio" },
];

interface EditableProp {
  key: string;
  label: string;
  isExpression: boolean;
  getValue: (el: TemplateElement) => string;
  setValue: (el: TemplateElement, val: string, updateElement: any, updateData: any) => void;
}

export function FormulaBar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.template.elements);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateData = useEditorStore((s) => s.updateElementData);
  const availableVariables = useEditorStore((s) => s.availableVariables);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const selectedElement = elements.find((e) => e.id === selectedIds[0]);

  // Estados locais
  const [activePropKey, setActivePropKey] = useState<string>("text");
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";
  const [inputValue, setInputValue] = useState<string>("");
  const [originalValue, setOriginalValue] = useState<string>("");
  const [isNameEditing, setIsNameEditing] = useState<boolean>(false);
  const [nameValue, setNameValue] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Estados do autocomplete integrado
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionMetadata, setSuggestionMetadata] = useState<{ matchStart: number; matchEnd: number } | null>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [suggestActiveIdx, setSuggestActiveIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestDropdownRef = useRef<HTMLDivElement>(null);
  const justCompletedRef = useRef<boolean>(false);

  // Mapeamento dinâmico de propriedades editáveis com base no tipo de elemento
  const getPropertiesForElement = (el: TemplateElement | undefined): EditableProp[] => {
    if (!el) return [];

    const list: EditableProp[] = [];

    // Propriedade de texto principal de acordo com o tipo
    if (el.type === "text") {
      list.push({
        key: "text",
        label: "Texto (Conteúdo)",
        isExpression: false,
        getValue: (e) => (e.data?.text as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { text: val }),
      });
    } else if (el.type === "card") {
      list.push({
        key: "body",
        label: "Conteúdo do Card (Body)",
        isExpression: false,
        getValue: (e) => (e.data?.body as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { body: val }),
      });
      list.push({
        key: "title",
        label: "Título do Card (Title)",
        isExpression: false,
        getValue: (e) => (e.data?.title as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { title: val }),
      });
    } else if (el.type === "image") {
      list.push({
        key: "src",
        label: "URL da Imagem (src)",
        isExpression: true,
        getValue: (e) => (e.data?.src as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { src: val }),
      });
    } else if (el.type === "table") {
      list.push({
        key: "arrayPath",
        label: "Caminho do Array JSON",
        isExpression: true,
        getValue: (e) => (e.data?.arrayPath as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { arrayPath: val }),
      });
    } else if (el.type === "list") {
      list.push({
        key: "items",
        label: "Itens da Lista (um por linha)",
        isExpression: false,
        getValue: (e) => Array.isArray(e.data?.items) ? (e.data.items as string[]).join("\n") : "",
        setValue: (e, val, updEl, updData) => updData(e.id, { items: val.split("\n").filter(x => x.trim() !== "") }),
      });
      list.push({
        key: "arrayPath",
        label: "Caminho do Array (Opcional)",
        isExpression: true,
        getValue: (e) => (e.data?.arrayPath as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { arrayPath: val }),
      });
    } else if (el.type === "icon") {
      list.push({
        key: "iconName",
        label: "Nome do Ícone Lucide",
        isExpression: true,
        getValue: (e) => (e.data?.name as string) ?? "Star",
        setValue: (e, val, updEl, updData) => updData(e.id, { name: val }),
      });
    }

    // Se houver customHtml configurado no elemento, permite editá-lo
    if (el.data?.customHtml !== undefined || el.type === "container") {
      list.push({
        key: "customHtml",
        label: "Código HTML Customizado",
        isExpression: false,
        getValue: (e) => (e.data?.customHtml as string) ?? "",
        setValue: (e, val, updEl, updData) => updData(e.id, { customHtml: val }),
      });
    }

    // Binding genérico de expressão que qualquer elemento pode ter
    list.push({
      key: "binding",
      label: "Binding de Expressão (Fórmula)",
      isExpression: true,
      getValue: (e) => e.binding?.expression ?? "",
      setValue: (e, val, updEl, updDt) => updEl(e.id, { 
        binding: { 
          ...(e.binding ?? { mode: "static" }), 
          mode: val ? "expression" : "static", 
          expression: val 
        } 
      }),
    });

    return list;
  };

  const properties = getPropertiesForElement(selectedElement);
  const activeProp = properties.find((p) => p.key === activePropKey) ?? properties[0];

  const isHtmlMode = activePropKey === "customHtml" || inputValue.startsWith("html:");
  const isFormulaMode = activeProp?.isExpression || inputValue.includes("{{") || /\bVAR\b/i.test(inputValue) || /\bRETURN\b/i.test(inputValue) || /\bCASE\b/i.test(inputValue);
  const shouldShowMonaco = isExpanded && (isHtmlMode || isFormulaMode);
  const editorLanguage = isHtmlMode ? "html" : (isFormulaMode ? "javascript" : "plaintext");

  // Monitora mudança do elemento selecionado ou da propriedade ativa
  useEffect(() => {
    if (selectedElement) {
      setNameValue(selectedElement.name || selectedElement.id);
      
      // Auto-seleciona a primeira propriedade disponível se a atual não for compatível
      const availableProps = getPropertiesForElement(selectedElement);
      const isStillCompatible = availableProps.some((p) => p.key === activePropKey);
      
      let nextProp = activeProp;
      if (!isStillCompatible && availableProps.length > 0) {
        nextProp = availableProps[0];
        setActivePropKey(availableProps[0].key);
      }

      if (nextProp) {
        const val = nextProp.getValue(selectedElement);
        setInputValue(val);
        setOriginalValue(val);
      }
    } else {
      setNameValue("");
      setInputValue("");
      setOriginalValue("");
      setIsSuggestOpen(false);
    }
  }, [selectedIds, activePropKey, selectedElement]);

  // Registra ouvinte global para inserção reativa de variáveis do painel esquerdo
  useEffect(() => {
    const handleInsertFormula = (e: any) => {
      const text = e.detail?.text;
      if (!text) return;
      if (!selectedElement || !activeProp) {
        toast.warning("Selecione um elemento para associar variáveis.");
        return;
      }

      const input = inputRef.current;
      if (!input) return;

      const cursor = input.selectionStart ?? inputValue.length;
      
      // Ajusta o cursor para garantir inserção como {{...}} se for campo textual e o valor for variável ($)
      let textToInsert = text;
      if (!activeProp.isExpression && text.startsWith("$")) {
        const textBefore = inputValue.substring(0, cursor);
        if (!textBefore.trim().endsWith("{{")) {
          textToInsert = `{{${text}}}`;
        }
      }

      const { newValue, newCursorPos } = insertSuggestionAt(inputValue, textToInsert, cursor, cursor);
      setInputValue(newValue);

      // Salva na store
      activeProp.setValue(selectedElement, newValue, updateElement, updateData);

      // Foca de volta e ajusta cursor
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 15);

      toast.success(`Inserido: ${text}`);
    };

    window.addEventListener("rd:insert-formula" as any, handleInsertFormula);
    return () => window.removeEventListener("rd:insert-formula" as any, handleInsertFormula);
  }, [selectedElement, activeProp, inputValue]);

  // Atualiza o autocomplete enquanto o usuário digita
  const updateAutocompleteState = (currentValue: string, cursor: number) => {
    if (justCompletedRef.current) {
      justCompletedRef.current = false;
      setIsSuggestOpen(false);
      return;
    }

    if (!selectedElement || !activeProp) return;

    // Se for um campo de expressão direta (como arrayPath ou binding), ativa com '$'.
    // Caso contrário, ativa apenas dentro de '{{ ... }}'
    const res = getSuggestions(currentValue, cursor, activeProp.isExpression, availableVariables);
    
    setSuggestions(res.suggestions);
    setSuggestionMetadata({ matchStart: res.matchStart, matchEnd: res.matchEnd });
    setIsSuggestOpen(res.isOpen);
    setSuggestActiveIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (selectedElement && activeProp) {
      // Atualiza o valor na store em tempo real
      activeProp.setValue(selectedElement, val, updateElement, updateData);
      
      const cursor = e.target.selectionStart || 0;
      updateAutocompleteState(val, cursor);
    }
  };

  const handleInputFocus = () => {
    if (selectedElement) {
      // Salva no histórico antes de começar a alteração
      pushHistory();
      if (activeProp) {
        setOriginalValue(activeProp.getValue(selectedElement));
      }
    }
  };

  const handleInputKeyUpAndClick = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Evita rodar autocomplete nas teclas de navegação para não resetar o índice ativo das sugestões
    const navigationKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Tab", "Shift", "Control", "Alt"];
    if (e.type === "keyup" && navigationKeys.includes((e as any).key)) {
      return;
    }
    const el = e.currentTarget;
    const cursor = el.selectionStart || 0;
    updateAutocompleteState(el.value, cursor);
  };

  // Insere sugestão na posição correta do cursor
  const insertSuggestion = (suggestion: string) => {
    if (!inputRef.current || !selectedElement || !activeProp) return;
    const input = inputRef.current;
    
    const cursor = input.selectionStart || 0;
    const matchStart = suggestionMetadata?.matchStart ?? cursor;
    const matchEnd = suggestionMetadata?.matchEnd ?? cursor;

    // Se for uma propriedade textual (isExpression = false) e a sugestão for uma variável (começa com $),
    // e o usuário NÃO estiver digitando dentro de chaves no momento, garante a inclusão do {{...}}
    let textToInsert = suggestion;
    if (!activeProp.isExpression && suggestion.startsWith("$")) {
      // Se não houver '{{' antes, envolve com chaves
      const textBefore = inputValue.substring(0, matchStart);
      if (!textBefore.trim().endsWith("{{")) {
        textToInsert = `{{${suggestion}}}`;
      }
    }

    const { newValue, newCursorPos } = insertSuggestionAt(inputValue, textToInsert, matchStart, matchEnd);
    
    justCompletedRef.current = true;
    setInputValue(newValue);
    setIsSuggestOpen(false);

    // Salva na store
    activeProp.setValue(selectedElement, newValue, updateElement, updateData);

    // Foca de volta e ajusta cursor
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 15);
  };

  // Atalhos de teclado no input principal
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Se o autocomplete estiver aberto, controla com setas e Enter/Tab
    if (isSuggestOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestActiveIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        e.preventDefault();
        const activeSuggest = suggestions[suggestActiveIdx];
        if (activeSuggest) {
          insertSuggestion(activeSuggest);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsSuggestOpen(false);
        return;
      }
    }

    // Se pressionar Shift + Enter no modo colapsado, expande a barra e insere quebra de linha
    if (e.key === "Enter" && e.shiftKey) {
      if (!isExpanded) {
        e.preventDefault();
        setIsExpanded(true);
        const cursor = e.currentTarget.selectionStart || 0;
        const val = e.currentTarget.value;
        const newValue = val.slice(0, cursor) + "\n" + val.slice(cursor);
        setInputValue(newValue);
        if (selectedElement && activeProp) {
          activeProp.setValue(selectedElement, newValue, updateElement, updateData);
        }
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const newCursor = cursor + 1;
            inputRef.current.setSelectionRange(newCursor, newCursor);
          }
        }, 50);
        return;
      }
    }

    // Se o autocomplete NÃO estiver aberto
    if (e.key === "Enter" && !e.shiftKey) {
      // Evita comportamento padrão se não for textarea ou se for input simples
      if (e.currentTarget.tagName === "INPUT" || !isExpanded) {
        e.preventDefault();
        e.currentTarget.blur();
        toast.success("Alteração de fórmula confirmada!");
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
      e.currentTarget.blur();
    }
  };

  // Salvar alteração na Caixa de Nome (Name Box)
  const handleNameSave = () => {
    setIsNameEditing(false);
    if (selectedElement && nameValue.trim() && nameValue.trim() !== selectedElement.name) {
      pushHistory();
      updateElement(selectedElement.id, { name: nameValue.trim() });
      toast.success(`Elemento renomeado para "${nameValue.trim()}"`);
    }
  };

  const handleCancel = () => {
    if (selectedElement && activeProp) {
      // Restaura o valor original do elemento antes de iniciar a edição
      activeProp.setValue(selectedElement, originalValue, updateElement, updateData);
      setInputValue(originalValue);
      setIsSuggestOpen(false);
      toast.info("Edição de fórmula cancelada.");
    }
  };

  const handleConfirm = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    setIsSuggestOpen(false);
    toast.success("Alteração de fórmula aplicada!");
  };

  const handleAutoFormat = () => {
    if (!inputValue || !selectedElement || !activeProp) {
      toast.warning("Não há conteúdo para formatar!");
      return;
    }

    try {
      let formatted = "";
      if (activePropKey === "customHtml" || inputValue.startsWith("html:")) {
        const isPrefixed = inputValue.startsWith("html:");
        const rawHtml = isPrefixed ? inputValue.substring(5) : inputValue;
        const formattedHtml = formatHtml(rawHtml);
        formatted = isPrefixed ? `html:${formattedHtml}` : formattedHtml;
      } else {
        formatted = formatExpressionOnly(inputValue);
      }

      setInputValue(formatted);
      activeProp.setValue(selectedElement, formatted, updateElement, updateData);
      toast.success("Código formatado com sucesso!");
    } catch (err) {
      console.error("Erro ao formatar código:", err);
      toast.error("Ocorreu um erro ao formatar o código.");
    }
  };

  // Fecha dropdown do autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestDropdownRef.current &&
        !suggestDropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincroniza o scroll no dropdown de autocomplete
  useEffect(() => {
    if (isSuggestOpen && suggestDropdownRef.current) {
      const activeEl = suggestDropdownRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [suggestActiveIdx, isSuggestOpen]);

  return (
    <div 
      className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/90 backdrop-blur-sm z-[30] shrink-0 transition-all duration-200 select-none"
      style={{ padding: "5px 12px" }}
    >
      <div className={cn(
        "flex gap-1.5 w-full min-h-[30px]",
        isExpanded ? "items-start pt-0.5" : "items-center"
      )}>
        
        {/* 1. CAIXA DE NOME (NAME BOX) */}
        <div className="flex items-center">
          {isNameEditing ? (
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setNameValue(selectedElement?.name || selectedElement?.id || "");
                  setIsNameEditing(false);
                }
              }}
              className="h-7 w-40 px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-slate-800 dark:text-slate-100 shadow-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                if (selectedElement) setIsNameEditing(true);
              }}
              disabled={!selectedElement}
              className={cn(
                "h-7 w-40 px-2 text-left text-xs font-mono font-bold border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between group transition-colors truncate",
                selectedElement 
                  ? "text-slate-800 dark:text-slate-200 hover:border-blue-400 cursor-pointer" 
                  : "text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-950/20 cursor-not-allowed"
              )}
              title={selectedElement ? "Clique para renomear o elemento" : "Nenhum elemento selecionado"}
            >
              <span className="truncate">
                {selectedElement 
                  ? `${selectedElement.type.toUpperCase()} [${selectedElement.name || selectedElement.id}]` 
                  : "NENHUM"
                }
              </span>
              {selectedElement && (
                <span className="text-[9px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-sans ml-1 shrink-0">
                  Editar
                </span>
              )}
            </button>
          )}
        </div>

        {/* Divisor Visual */}
        <div className="w-px h-5 bg-slate-250 dark:bg-slate-800 shrink-0" />

        {/* 2. SELETOR DE PROPRIEDADE ATIVA */}
        {selectedElement && properties.length > 1 && (
          <div className="flex items-center shrink-0">
            <select
              value={activePropKey}
              onChange={(e) => setActivePropKey(e.target.value)}
              className="h-7 px-2 text-xs font-medium border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors shadow-xs"
            >
              {properties.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedElement && properties.length > 1 && (
          <div className="w-px h-5 bg-slate-250 dark:bg-slate-800 shrink-0" />
        )}

        {/* 3. BOTÕES DE CONTROLE (X, ✓, fx) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleCancel}
            disabled={!selectedElement}
            className={cn(
              "p-1.5 rounded transition-colors",
              selectedElement 
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" 
                : "text-slate-350 dark:text-slate-750 cursor-not-allowed"
            )}
            title="Cancelar Edição (Esc)"
          >
            <X className="size-4" />
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!selectedElement}
            className={cn(
              "p-1.5 rounded transition-colors",
              selectedElement 
                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer" 
                : "text-slate-350 dark:text-slate-750 cursor-not-allowed"
            )}
            title="Confirmar Fórmula (Enter)"
          >
            <Check className="size-4" />
          </button>

          {/* BOTÃO FX (INSERIR FUNÇÃO/VARIÁVEL) */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                disabled={!selectedElement}
                className={cn(
                  "px-2 h-7 font-serif font-black italic text-sm rounded flex items-center justify-center transition-colors select-none",
                  selectedElement 
                    ? "text-blue-650 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer" 
                    : "text-slate-350 dark:text-slate-750 cursor-not-allowed"
                )}
                title="Inserir Variável ou Função (fx)"
              >
                fx
              </button>
            </PopoverTrigger>
            <PopoverContent 
              side="bottom" 
              align="start" 
              className="w-80 p-0 max-h-96 overflow-y-auto bg-popover border border-border shadow-2xl rounded-xl z-50 flex flex-col"
            >
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-border flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Sparkles className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Assistente de Fórmulas</h4>
                  <p className="text-[10px] text-slate-500">Clique para inserir elementos na fórmula atual</p>
                </div>
              </div>

              <div className="p-1 space-y-1 overflow-y-auto max-h-72 text-xs scrollbar-thin">
                {/* 1. Variáveis de Sistema */}
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Dados Disponíveis (Variáveis)
                </div>
                {availableVariables.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400 italic text-[11px]">
                    Nenhum campo de consulta mapeado para este template.
                  </div>
                ) : (
                  availableVariables.map((v) => (
                    <button
                      key={v}
                      onClick={() => insertSuggestion(`$${v}`)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/25 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                    >
                      <Variable className="size-3 text-blue-500 shrink-0 opacity-70" />
                      <span className="truncate">{v}</span>
                    </button>
                  ))
                )}

                <div className="h-px bg-slate-100 dark:bg-slate-900 my-1" />

                {/* 2. Funções Matemáticas */}
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Funções de Array (Excel)
                </div>
                {MATH_FUNCTIONS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => insertSuggestion(f.snippet)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">{f.name}</div>
                    <div className="text-[10px] text-slate-500">{f.desc}</div>
                  </button>
                ))}

                <div className="h-px bg-slate-100 dark:bg-slate-900 my-1" />

                {/* 3. Ajudantes de Formatação */}
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Formatadores & Cálculos
                </div>
                {HELPERS.map((h) => (
                  <button
                    key={h.name}
                    onClick={() => insertSuggestion(h.snippet)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">{h.name}</div>
                    <div className="text-[10px] text-slate-500">{h.desc}</div>
                  </button>
                ))}

                <div className="h-px bg-slate-100 dark:bg-slate-900 my-1" />

                {/* 4. Funções de Fórmulas e Lógica */}
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Funções & Fórmulas de Expressão
                </div>
                {LOGICAL_FUNCTIONS.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => insertSuggestion(d.snippet)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">{d.name}</div>
                    <div className="text-[10px] text-slate-500">{d.desc}</div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Divisor Visual */}
        <div className="w-px h-5 bg-slate-250 dark:bg-slate-800 shrink-0" />

        {/* 4. INPUT DE FÓRMULA PRINCIPAL */}
        <div className="flex-1 relative flex items-center min-w-0">
          <Popover open={isSuggestOpen && suggestions.length > 0} onOpenChange={setIsSuggestOpen}>
            <PopoverTrigger asChild>
              <div 
                className={cn(
                  "flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-md flex transition-all shadow-xs focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500",
                  isExpanded ? "h-auto items-start" : "h-7 items-center"
                )}
              >
                {isExpanded ? (
                  shouldShowMonaco ? (
                    <div className="w-full min-h-[180px] h-[180px] border-t border-slate-200 dark:border-slate-800 relative z-0">
                      <Editor
                        key={`formulabar-${selectedElement?.id}-${activePropKey}`}
                        height="100%"
                        language={editorLanguage}
                        theme={editorTheme}
                        value={inputValue}
                        hideHeader={true}
                        onChange={(v) => {
                          setInputValue(v || "");
                          if (selectedElement && activeProp) {
                            activeProp.setValue(selectedElement, v || "", updateElement, updateData);
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          lineNumbers: "on",
                          fontSize: 12,
                          wordWrap: "on",
                          padding: { top: 8 },
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                      value={inputValue}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onKeyUp={handleInputKeyUpAndClick}
                      onKeyDown={handleInputKeyDown}
                      onClick={handleInputKeyUpAndClick}
                      placeholder={selectedElement ? "Digite um texto ou uma expressão, ex: {{$cliente.nome}}" : "Selecione um elemento para editar suas expressões..."}
                      disabled={!selectedElement}
                      className="w-full min-h-[80px] h-[80px] px-2 py-1.5 text-xs font-mono text-slate-950 dark:text-slate-55 bg-transparent border-none outline-none resize-y scrollbar-thin focus:ring-0 focus:outline-none"
                    />
                  )
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyUp={handleInputKeyUpAndClick}
                    onKeyDown={handleInputKeyDown}
                    onClick={handleInputKeyUpAndClick}
                    placeholder={selectedElement ? "Digite um texto ou uma expressão, ex: {{$cliente.nome}}" : "Selecione um elemento para editar suas expressões..."}
                    disabled={!selectedElement}
                    className="w-full h-full px-2 text-xs font-mono text-slate-950 dark:text-slate-50 bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                  />
                )}

                {/* BOTÃO AUTO-FORMATAR */}
                {selectedElement && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAutoFormat();
                    }}
                    className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors h-7 w-7 flex items-center justify-center shrink-0 border-l border-slate-100 dark:border-slate-850 cursor-pointer"
                    title="Auto-Formatar Código/Fórmula (Sparkles)"
                  >
                    <Sparkles className="size-4" />
                  </button>
                )}

                {/* BOTÃO EXPANDIR / COLAPSAR */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors h-7 w-7 flex items-center justify-center shrink-0 border-l border-slate-100 dark:border-slate-850 cursor-pointer"
                  title={isExpanded ? "Colapsar Barra de Fórmulas" : "Expandir Barra de Fórmulas"}
                >
                  {isExpanded ? <ChevronUp className="size-4 animate-scale-in" /> : <ChevronDown className="size-4 animate-scale-in" />}
                </button>
              </div>
            </PopoverTrigger>
            <PopoverContent
              ref={suggestDropdownRef}
              className="p-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-2xl z-[99999] scrollbar-thin w-[var(--radix-popover-trigger-width)]"
              align="start"
              side="bottom"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase border-b border-slate-100 dark:border-slate-900/60 mb-1 flex items-center justify-between">
                <span>Sugestões de Variáveis e Funções</span>
                <span className="text-[8px] opacity-60 lowercase italic">[tab / enter] autocompletar</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  data-active={index === suggestActiveIdx}
                  onClick={() => insertSuggestion(suggestion)}
                  className={cn(
                    "w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center gap-1.5 font-mono truncate",
                    index === suggestActiveIdx
                      ? "bg-blue-550/15 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300"
                      : "text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-850 dark:hover:text-white"
                  )}
                >
                  <span className="text-[10px] opacity-40 font-semibold font-mono">{"{}"}</span>
                  {suggestion}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

      </div>
    </div>
  );
}

/**
 * Formata expressões lógicas de forma estruturada e indentada.
 * Especialmente projetada para tratar blocos "VAR/RETURN" e estruturas "case when ... then ... else ... end".
 */
export function formatExpressionOnly(expr: string): string {
  let text = expr.trim();
  
  // Normaliza quebras de linha e formata VAR/RETURN
  text = text.replace(/\bVAR\s+/gi, "\nVAR ");
  text = text.replace(/\bRETURN\b/gi, "\nRETURN\n");
  
  // Formatar CASE/WHEN/THEN/ELSE/END de forma limpa e estruturada
  text = text.replace(/\bCASE\b/gi, "\nCASE\n");
  text = text.replace(/\bWHEN\b/gi, "\n  WHEN ");
  text = text.replace(/\bTHEN\b/gi, " THEN ");
  text = text.replace(/\bELSE\b/gi, "\n  ELSE ");
  text = text.replace(/\bEND\b/gi, "\nEND");

  // Re-processamento linha por linha para manter indentação limpa e proporcional
  const lines = text.split("\n");
  let indentLevel = 0;
  const step = "  ";
  const resultLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Se a linha começa com END, reduz a indentação antes de renderizá-la
    if (trimmed.toUpperCase() === "END" || trimmed.toUpperCase().startsWith("END ")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    let indent = step.repeat(indentLevel);
    
    // Ajusta o nível de indentação para as próximas linhas
    if (trimmed.toUpperCase() === "CASE" || trimmed.toUpperCase().startsWith("CASE ")) {
      indentLevel++;
    }
    
    // Se for RETURN, remove recuo para destaque estético de bloco
    if (trimmed.toUpperCase() === "RETURN") {
      indent = "";
    }

    resultLines.push(indent + trimmed);
  }

  return resultLines.join("\n");
}

/**
 * Formata um bloco HTML offline preservando e formatando expressões interpoladas {{ ... }}.
 */
export function formatHtml(html: string): string {
  const expressions: string[] = [];
  
  // Captura e protege os blocos de expressões interpoladas {{ ... }}
  let protectedHtml = html.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
    expressions.push(expr);
    return `__EXPR_PLACEHOLDER_${expressions.length - 1}__`;
  });

  let result = "";
  let indentLevel = 0;
  const step = "  ";

  // Formata o HTML usando quebra de tags estruturais
  const tagReg = /(<[^>]+>)/g;
  const parts = protectedHtml.replace(/\s+/g, " ").replace(tagReg, "\n$1\n").split("\n");

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Tag de fechamento
    if (part.startsWith("</")) {
      indentLevel = Math.max(0, indentLevel - 1);
      result += step.repeat(indentLevel) + part + "\n";
    }
    // Tag autocontida ou instrução especial
    else if (part.startsWith("<") && (part.endsWith("/>") || part.startsWith("<?") || part.startsWith("<!"))) {
      result += step.repeat(indentLevel) + part + "\n";
    }
    // Tag de abertura comum
    else if (part.startsWith("<") && !part.startsWith("</")) {
      result += step.repeat(indentLevel) + part + "\n";
      indentLevel++;
    }
    // Texto simples contendo possivelmente nossos placeholders
    else {
      result += step.repeat(indentLevel) + part + "\n";
    }
  }

  let formattedHtml = result.trim();

  // Devolve as expressões formatando-as individualmente conforme a complexidade
  for (let i = 0; i < expressions.length; i++) {
    const rawExpr = expressions[i];
    let formattedExpr = "";

    // Se contiver palavras-chave de fórmulas avançadas ou for muito longa, formata-a
    if (/\bVAR\b/i.test(rawExpr) || /\bCASE\b/i.test(rawExpr) || rawExpr.length > 50) {
      const internalFormatted = formatExpressionOnly(rawExpr);
      
      if (internalFormatted.includes("\n")) {
        const placeholder = `__EXPR_PLACEHOLDER_${i}__`;
        const lines = formattedHtml.split("\n");
        const lineWithPlaceholder = lines.find(l => l.includes(placeholder)) || "";
        const indentMatch = lineWithPlaceholder.match(/^(\s*)/);
        const baseIndent = indentMatch ? indentMatch[1] : "";
        
        const exprLines = internalFormatted.split("\n");
        const indentedExpr = exprLines.map((line, idx) => {
          if (idx === 0) return line.trim();
          return baseIndent + "  " + line.trim();
        }).join("\n");
        
        formattedExpr = `{{\n${baseIndent}  ${indentedExpr}\n${baseIndent}}}`;
      } else {
        formattedExpr = `{{ ${internalFormatted.trim()} }}`;
      }
    } else {
      formattedExpr = `{{${rawExpr.trim()}}}`;
    }

    formattedHtml = formattedHtml.replace(`__EXPR_PLACEHOLDER_${i}__`, formattedExpr);
  }

  return formattedHtml;
}

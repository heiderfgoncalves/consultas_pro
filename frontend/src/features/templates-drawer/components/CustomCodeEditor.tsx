import React, { useRef, useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, WrapText } from "lucide-react";
import { toast } from "sonner";

interface CustomCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
}

export function CustomCodeEditor({
  value = "",
  onChange,
  language = "html",
  theme = "vs-dark",
  height = "350px",
  readOnly = false,
  className,
}: CustomCodeEditorProps) {
  const [copied, setCopyFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeOverlayRef = useRef<HTMLPreElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "vs-dark";
  const activeLang = language.toLowerCase();

  // HTML inicia com quebra de linha ligada por padrão, outros iniciam desligada
  const [wordWrap, setWordWrap] = useState<boolean>(activeLang === "html");

  // Escapa entidades HTML para renderização segura e processamento de realce
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // Realce de sintaxe em tempo real baseado em regex de alta fidelidade
  const highlightedCode = useMemo(() => {
    if (!value) {
      return `<span style="color: #637777; font-style: italic;">// Sem conteúdo</span>`;
    }

    const escaped = escapeHtml(value);

    if (activeLang === "json") {
      // Tokenizador unificado de passagem única para JSON livre de desalinhamentos de captura
      const jsonRegex = /("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([\{\}\[\]])/g;

      return escaped.replace(jsonRegex, (match, key, colon, strValue, numValue, boolValue, braceValue) => {
        if (key !== undefined) {
          // Chave JSON (Key)
          return `<span style="color: #c792ea; font-weight: 600;">${key}</span>${colon || ""}`;
        }
        if (strValue !== undefined) {
          // Valor String
          return `<span style="color: #ecc48d;">${strValue}</span>`;
        }
        if (numValue !== undefined) {
          // Valor Numérico
          return `<span style="color: #f78c6c;">${numValue}</span>`;
        }
        if (boolValue !== undefined) {
          // Booleano ou Null
          return `<span style="color: #ff5874; font-weight: bold;">${boolValue}</span>`;
        }
        if (braceValue !== undefined) {
          // Parênteses, colchetes ou chaves
          return `<span style="color: #89ddff; font-weight: bold;">${braceValue}</span>`;
        }
        return match;
      });
    }

    if (activeLang === "html" || activeLang === "xml") {
      const isXml = activeLang === "xml";
      
      // Tokenizador unificado de passagem única para HTML/XML (evita canibalização)
      const htmlRegex = /(&lt;!--[\s\S]*?--&gt;)|(\{\{[\s\S]*?\}\})|(&lt;\?xml[\s\S]*?\?&gt;)|(&lt;\/?[a-zA-Z0-9_:-]+(?:\s+[\s\S]*?)?\/?&gt;)/g;

      return escaped.replace(htmlRegex, (match, comment, interpolation, xmlDecl, tag) => {
        if (comment !== undefined) {
          // Comentários HTML/XML
          return `<span style="color: #637777; font-style: italic;">${comment}</span>`;
        }
        if (interpolation !== undefined && !isXml) {
          // Interpolações dinâmicas {{ ... }} do motor de templates
          return `<span style="color: #00e676; font-weight: bold; background: rgba(0, 230, 118, 0.08); padding: 0 2px; border-radius: 2.5px; border: 1px solid rgba(0, 230, 118, 0.15);">${interpolation}</span>`;
        }
        if (xmlDecl !== undefined) {
          // Declaração XML <?xml ... ?>
          return `<span style="color: #82aaff; font-style: italic;">${xmlDecl}</span>`;
        }
        if (tag !== undefined) {
          // Isolado e seguro: processamento interno de componentes sem canibalização
          
          // 1. Destaque dos pares Atributo=Valor primeiro (sobre a string limpa)
          let tagHighlighted = tag.replace(
            /(\s+)([a-zA-Z0-9_:-]+)\s*=\s*(["'][^"']*["'])/g,
            `$1<span style="color: ${isXml ? "#c792ea" : "#ffcb6b"};">$2</span>=<span style="color: #ecc48d;">$3</span>`
          );

          // 2. Destaque dos delimitadores iniciais e nome da tag (ancorado no início)
          tagHighlighted = tagHighlighted.replace(
            /^(&lt;\/?)([a-zA-Z0-9_:-]+)/g,
            `$1<span style="color: ${isXml ? "#7fdbca" : "#ff5370"}; font-weight: 600;">$2</span>`
          );

          // 3. Destaque dos fechamentos de tag (ancorado no fim)
          tagHighlighted = tagHighlighted.replace(
            /(\/?&gt;)$/g,
            '<span style="color: #89ddff;">$1</span>'
          );

          // 4. Destaque de interpolações {{...}} que porventura existam dentro de atributos da tag
          if (!isXml) {
            tagHighlighted = tagHighlighted.replace(
              /(\{\{[\s\S]*?\}\})/g,
              `<span style="color: #00e676; font-weight: bold; background: rgba(0, 230, 118, 0.08); padding: 0 2px; border-radius: 2.5px; border: 1px solid rgba(0, 230, 118, 0.15);">$1</span>`
            );
          }

          return tagHighlighted;
        }
        return match;
      });
    }

    // Fallback de texto puro escapado
    return escaped;
  }, [value, activeLang]);

  // Calcula a quantidade de linhas e gera o array de numeração
  const lineCount = useMemo(() => {
    const lines = value.split("\n").length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1);
  }, [value]);

  // Sincroniza o scroll de forma bidirecional e milimétrica
  const handleScroll = () => {
    const textarea = textareaRef.current;
    const overlay = codeOverlayRef.current;
    const gutter = lineGutterRef.current;

    if (!textarea) return;

    if (overlay) {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    }
    if (gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  };

  // Garante que o scroll inicial esteja alinhado
  useEffect(() => {
    handleScroll();
  }, [value]);

  // Tratamento avançado de teclado (Tab, Shift+Tab e indentação automática no Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;

    // 1. Tecla TAB e SHIFT+TAB para recuo/identação inteligente
    if (e.key === "Tab") {
      e.preventDefault();
      const spaces = "  "; // Indentação padrão de 2 espaços

      if (!e.shiftKey) {
        // Tabulação simples: Insere 2 espaços na posição do cursor
        const newVal =
          currentVal.substring(0, selectionStart) +
          spaces +
          currentVal.substring(selectionEnd);

        onChange?.(newVal);

        // Restaura e reposiciona o cursor
        requestAnimationFrame(() => {
          if (textarea) {
            const newCursor = selectionStart + spaces.length;
            textarea.selectionStart = newCursor;
            textarea.selectionEnd = newCursor;
          }
        });
      } else {
        // Shift+Tab: Remove recuo de 2 espaços à esquerda se houver
        const lineStartPos = currentVal.lastIndexOf("\n", selectionStart - 1) + 1;
        const linePrefix = currentVal.substring(lineStartPos, selectionStart);

        if (linePrefix.startsWith("  ")) {
          const newVal =
            currentVal.substring(0, lineStartPos) +
            linePrefix.substring(2) +
            currentVal.substring(selectionStart);

          onChange?.(newVal);

          requestAnimationFrame(() => {
            if (textarea) {
              const newCursor = Math.max(lineStartPos, selectionStart - 2);
              textarea.selectionStart = newCursor;
              textarea.selectionEnd = newCursor;
            }
          });
        }
      }
    }

    // 2. Tecla ENTER para Indentação Automática Inteligente
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // Encontra a linha atual
      const lineStartPos = currentVal.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = currentVal.substring(lineStartPos, selectionStart);

      // Descobre quantos espaços em branco estão na frente da linha atual
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "";

      // Insere quebra de linha + a mesma quantidade de indentação
      const insertion = "\n" + indent;
      const newVal =
        currentVal.substring(0, selectionStart) +
        insertion +
        currentVal.substring(selectionEnd);

      onChange?.(newVal);

      requestAnimationFrame(() => {
        if (textarea) {
          const newCursor = selectionStart + insertion.length;
          textarea.selectionStart = newCursor;
          textarea.selectionEnd = newCursor;
        }
      });
    }
  };

  // Ação de copiar código para área de transferência
  const handleCopy = () => {
    if (!value) {
      toast.info("Não há código para copiar!");
      return;
    }
    navigator.clipboard.writeText(value);
    setCopyFeedback(true);
    toast.success("Código copiado para a área de transferência!");
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Ação de formatar código (beautifier local robusto e offline)
  const handleFormat = () => {
    if (!value) {
      toast.info("Insira código para formatar!");
      return;
    }

    if (activeLang === "json") {
      try {
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        onChange?.(formatted);
        toast.success("JSON formatado com sucesso!");
      } catch (err: any) {
        toast.error(`Erro de sintaxe no JSON: ${err.message || err}`);
      }
    } else if (activeLang === "html" || activeLang === "xml") {
      try {
        // Algoritmo local inteligente para formatação estruturada de XML/HTML
        const formatted = formatHtmlXmlLocally(value);
        onChange?.(formatted);
        toast.success(`${language.toUpperCase()} formatado com sucesso!`);
      } catch (err: any) {
        console.error("Erro na formatação local de tags:", err);
        toast.error("Ocorreu um erro ao formatar as tags.");
      }
    } else {
      toast.info(`Não há formatador local específico para ${language.toUpperCase()}`);
    }
  };

  // Algoritmo refinado offline para indentar HTML/XML de forma limpa e balanceada
  const formatHtmlXmlLocally = (input: string): string => {
    let result = "";
    let indentLevel = 0;
    const step = "  "; // 2 espaços para indentação

    // Divide em blocos de tags e texto
    const reg = /(<[^>]+>)/g;
    const parts = input.replace(/\s+/g, " ").replace(reg, "\n$1\n").split("\n");

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      // Caso seja tag de fechamento (ex: </div> ou </template-frame>)
      if (part.startsWith("</")) {
        indentLevel = Math.max(0, indentLevel - 1);
        result += step.repeat(indentLevel) + part + "\n";
      }
      // Caso seja tag autocontida ou de declaração/doctype (ex: <img /> ou <?xml ?> ou <!DOCTYPE>)
      else if (part.startsWith("<") && (part.endsWith("/>") || part.startsWith("<?") || part.startsWith("<!"))) {
        result += step.repeat(indentLevel) + part + "\n";
      }
      // Caso seja tag de abertura (ex: <div class="...">)
      else if (part.startsWith("<") && !part.startsWith("</")) {
        result += step.repeat(indentLevel) + part + "\n";
        indentLevel++;
      }
      // Caso seja texto simples
      else {
        result += step.repeat(indentLevel) + part + "\n";
      }
    }

    return result.trim();
  };

  // Determina a altura em formato utilizável
  const containerHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{ height: containerHeight }}
      className={cn(
        "flex flex-col w-full h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md select-none group",
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-800",
        className
      )}
    >
      {/* Barra de título do editor personalizado */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 select-none">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Editor Premium de Código ({activeLang.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Botão de Quebra de Linha (Word Wrap) */}
          <button
            type="button"
            onClick={() => setWordWrap(!wordWrap)}
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-all border border-transparent",
              wordWrap 
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/20" 
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700/50"
            )}
            title={`Alternar Quebra de Linha (Word Wrap - Ativo: ${wordWrap ? "Sim" : "Não"})`}
          >
            <WrapText className="size-3.5" />
          </button>

          {/* Botão de Copiar */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-all border border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700/50"
            title="Copiar tudo para área de transferência"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Área central do editor */}
      <div className="flex-1 min-h-0 flex relative font-mono text-xs select-text">
        {/* 1. Gutter lateral de linhas (contador de linhas) - Renderizado apenas quando wordWrap está inativo */}
        {!wordWrap && (
          <div
            ref={lineGutterRef}
            className="w-10 bg-slate-50/50 dark:bg-slate-900/20 border-r border-slate-100 dark:border-slate-800/85 flex flex-col overflow-hidden text-right select-none pr-2.5 text-slate-400 dark:text-slate-600 shrink-0 font-mono scrollbar-none"
            style={{
              paddingTop: "14px",
              paddingBottom: "14px",
            }}
          >
            {lineCount.map((num) => (
              <div
                key={num}
                className="flex items-center justify-end font-mono text-[11px]"
                style={{
                  height: "22px",
                  lineHeight: "22px",
                }}
              >
                {num}
              </div>
            ))}
          </div>
        )}
 
        {/* 2. Área principal de digitação e renderização */}
        <div className="flex-1 min-w-0 h-full relative overflow-hidden bg-transparent">
          {/* Camada inferior de renderização (realce de sintaxe) */}
          <pre
            ref={codeOverlayRef}
            className="absolute top-0 left-0 w-full h-full m-0 overflow-auto pointer-events-none select-none border-none outline-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
            style={{
              fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
              fontSize: "12px",
              lineHeight: "22px",
              padding: "14px",
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              wordBreak: wordWrap ? "break-word" : "normal",
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
 
          {/* Camada superior de interação (textarea transparente) */}
          <textarea
            ref={textareaRef}
            className={cn(
              "absolute top-0 left-0 w-full h-full m-0 bg-transparent border-none outline-none resize-none focus:ring-0 focus:outline-none overflow-auto caret-indigo-500",
              isDark ? "text-transparent selection:bg-indigo-500/25" : "text-transparent selection:bg-indigo-200/50"
            )}
            style={{
              fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
              fontSize: "12px",
              lineHeight: "22px",
              padding: "14px",
              WebkitTextFillColor: "transparent", // Garante transparência de texto no iOS/Safari
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              wordBreak: wordWrap ? "break-word" : "normal",
            }}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            placeholder={readOnly ? "Sem conteúdo de código" : "Insira seu código aqui..."}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}

export default CustomCodeEditor;

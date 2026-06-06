import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editor.store";
import { cn } from "@/lib/utils";
import { getSuggestions, insertSuggestionAt } from "../utils/suggestions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function AutocompleteTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows = 4,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionMetadata, setSuggestionMetadata] = useState<{ matchStart: number; matchEnd: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justCompletedRef = useRef(false);

  const availableVariables = useEditorStore((s) => s.availableVariables);

  const updateAutocomplete = (currentValue: string, cursor: number) => {
    if (justCompletedRef.current) {
      justCompletedRef.current = false;
      setIsOpen(false);
      return;
    }
    const res = getSuggestions(currentValue, cursor, false, availableVariables);
    setSuggestions(res.suggestions);
    setSuggestionMetadata({ matchStart: res.matchStart, matchEnd: res.matchEnd });
    setIsOpen(res.isOpen);
    setActiveIndex(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    onChange(val);
    updateAutocomplete(val, cursor);
  };

  const handleKeyUpAndClick = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const navigationKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Tab", "Shift", "Control", "Alt"];
    if (e.type === "keyup" && navigationKeys.includes((e as any).key)) {
      return;
    }
    const textarea = e.currentTarget;
    const cursor = textarea.selectionStart || 0;
    updateAutocomplete(textarea.value, cursor);
  };

  const insertSuggestion = (suggestion: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    
    const matchStart = suggestionMetadata?.matchStart ?? (textarea.selectionStart || 0);
    const matchEnd = suggestionMetadata?.matchEnd ?? (textarea.selectionStart || 0);

    const { newValue, newCursorPos } = insertSuggestionAt(value, suggestion, matchStart, matchEnd);
    
    justCompletedRef.current = true;
    onChange(newValue);
    setIsOpen(false);

    // Reposiciona o cursor e foca de volta no textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (suggestions[activeIndex]) {
        insertSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Scroll automático no dropdown para acompanhar a navegação com teclado
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Popover open={isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyUp={handleKeyUpAndClick}
            onKeyDown={handleKeyDown}
            onClick={handleKeyUpAndClick}
            onFocus={handleKeyUpAndClick}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              "w-full px-2 py-1.5 border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin",
              className
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          ref={dropdownRef}
          className="p-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-[9999] scrollbar-thin w-[var(--radix-popover-trigger-width)]"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase border-b border-slate-100 dark:border-slate-900/60 mb-1 flex items-center justify-between">
            <span>Sugestões</span>
            <span className="text-[8px] opacity-60 lowercase italic">[tab] autocompletar</span>
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              data-active={index === activeIndex}
              onClick={() => insertSuggestion(suggestion)}
              className={cn(
                "w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center gap-1.5 font-mono truncate",
                index === activeIndex
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-850 dark:hover:text-white"
              )}
            >
              <span className="text-[10px] opacity-40 font-semibold font-mono">{"{}"}</span>
              {suggestion}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AutocompleteInput({
  value,
  onChange,
  className,
  placeholder,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionMetadata, setSuggestionMetadata] = useState<{ matchStart: number; matchEnd: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justCompletedRef = useRef(false);

  const availableVariables = useEditorStore((s) => s.availableVariables);

  const updateAutocomplete = (currentValue: string, cursor: number) => {
    if (justCompletedRef.current) {
      justCompletedRef.current = false;
      setIsOpen(false);
      return;
    }
    const res = getSuggestions(currentValue, cursor, false, availableVariables);
    setSuggestions(res.suggestions);
    setSuggestionMetadata({ matchStart: res.matchStart, matchEnd: res.matchEnd });
    setIsOpen(res.isOpen);
    setActiveIndex(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    onChange(val);
    updateAutocomplete(val, cursor);
  };

  const handleKeyUpAndClick = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const navigationKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Tab", "Shift", "Control", "Alt"];
    if (e.type === "keyup" && navigationKeys.includes((e as any).key)) {
      return;
    }
    const input = e.currentTarget;
    const cursor = input.selectionStart || 0;
    updateAutocomplete(input.value, cursor);
  };

  const insertSuggestion = (suggestion: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    
    const matchStart = suggestionMetadata?.matchStart ?? (input.selectionStart || 0);
    const matchEnd = suggestionMetadata?.matchEnd ?? (input.selectionStart || 0);

    const { newValue, newCursorPos } = insertSuggestionAt(value, suggestion, matchStart, matchEnd);
    
    justCompletedRef.current = true;
    onChange(newValue);
    setIsOpen(false);

    // Reposiciona o cursor e foca de volta no input
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (suggestions[activeIndex]) {
        insertSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Scroll automático no dropdown para acompanhar a navegação com teclado
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Popover open={isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyUp={handleKeyUpAndClick}
            onKeyDown={handleKeyDown}
            onClick={handleKeyUpAndClick}
            onFocus={handleKeyUpAndClick}
            placeholder={placeholder}
            className={cn(
              "w-full px-2 py-1 border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary",
              className
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          ref={dropdownRef}
          className="p-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-[9999] scrollbar-thin w-[var(--radix-popover-trigger-width)]"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase border-b border-slate-100 dark:border-slate-900/60 mb-1 flex items-center justify-between">
            <span>Sugestões</span>
            <span className="text-[8px] opacity-60 lowercase italic">[tab] autocompletar</span>
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              data-active={index === activeIndex}
              onClick={() => insertSuggestion(suggestion)}
              className={cn(
                "w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center gap-1.5 font-mono truncate",
                index === activeIndex
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
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
  );
}

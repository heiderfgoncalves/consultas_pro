export type Shortcut = {
  keys: string;
  label: string;
  group: "Navegação" | "Seleção" | "Edição" | "Zoom" | "Camadas" | "Visualização";
};

export const SHORTCUTS: Shortcut[] = [
  { keys: "Space + arrastar", label: "Pan do canvas", group: "Navegação" },
  { keys: "Ctrl + Scroll", label: "Zoom in / out no cursor", group: "Zoom" },
  { keys: "Shift + Scroll", label: "Pan horizontal", group: "Navegação" },
  { keys: "Scroll", label: "Pan vertical", group: "Navegação" },
  { keys: "Ctrl + 0", label: "Ajustar à tela", group: "Zoom" },
  { keys: "Ctrl + 1", label: "Zoom 100%", group: "Zoom" },
  { keys: "Ctrl + +", label: "Zoom in", group: "Zoom" },
  { keys: "Ctrl + -", label: "Zoom out", group: "Zoom" },

  { keys: "Click", label: "Selecionar elemento", group: "Seleção" },
  { keys: "Shift + Click", label: "Adicionar à seleção", group: "Seleção" },
  { keys: "Click no vazio", label: "Limpar seleção", group: "Seleção" },
  { keys: "Ctrl + A", label: "Selecionar todos do frame ativo", group: "Seleção" },
  { keys: "Esc", label: "Sair da edição / fechar modal", group: "Seleção" },

  { keys: "Shift (resize)", label: "Preservar proporção", group: "Edição" },
  { keys: "Duplo clique", label: "Editar texto", group: "Edição" },
  { keys: "Delete / Backspace", label: "Excluir selecionados", group: "Edição" },
  { keys: "Ctrl + D", label: "Duplicar", group: "Edição" },
  { keys: "Ctrl + C / V", label: "Copiar / Colar", group: "Edição" },
  { keys: "Ctrl + Z", label: "Desfazer", group: "Edição" },
  { keys: "Ctrl + Shift + Z", label: "Refazer", group: "Edição" },

  { keys: "]", label: "Trazer para frente", group: "Camadas" },
  { keys: "[", label: "Enviar para trás", group: "Camadas" },

  { keys: "?", label: "Mostrar atalhos", group: "Visualização" },
  { keys: "Ctrl + Shift + X", label: "Abrir modal de código (HTML/XML/JSON)", group: "Visualização" },
  { keys: "Ctrl + P", label: "Abrir Preview / Salvar PDF", group: "Visualização" },
  { keys: "P", label: "Alternar Esqueleto / Preview", group: "Visualização" },
  { keys: "G", label: "Alternar grid", group: "Visualização" },
];
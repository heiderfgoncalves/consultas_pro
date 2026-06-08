export const CONFIG = {
  // A URL base do sistema principal para onde os botões "Acessar Sistema" (Login) e "Criar Conta" (Cadastro) devem redirecionar.
  // Por padrão, usa o domínio de produção oficial. Pode ser sobrescrita via variável de ambiente VITE_SYSTEM_URL.
  systemUrl: import.meta.env.VITE_SYSTEM_URL || "https://consultas.limpanome.pro",
};

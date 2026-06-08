import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VersionChecker() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Coleta as tags de script atuais carregadas na página
    const getCurrentScripts = () => {
      return Array.from(document.querySelectorAll("script[src]"))
        .map((el) => el.getAttribute("src"))
        .filter((src): src is string => !!src && src.includes("/assets/"));
    };

    const currentScripts = getCurrentScripts();
    if (currentScripts.length === 0) return; // Em desenvolvimento local às vezes não há chunks estáticos no index.html

    const checkVersion = async () => {
      try {
        // Busca o index.html contornando o cache do navegador
        const response = await fetch(`/?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        
        if (!response.ok) return;
        
        const html = await response.text();
        
        // Expressão regular para extrair caminhos de scripts gerados pelo Vite (/assets/...)
        const scriptRegex = /src=["']([^"']+\/assets\/[^"']+\.js)["']/g;
        const serverScripts: string[] = [];
        let match;
        
        while ((match = scriptRegex.exec(html)) !== null) {
          serverScripts.push(match[1]);
        }

        if (serverScripts.length === 0) return;

        // Compara se algum script mudou (novo hash)
        const scriptsChanged = serverScripts.some(
          (src) => !currentScripts.includes(src)
        );

        if (scriptsChanged) {
          setHasUpdate(true);
        }
      } catch (err) {
        console.warn("Falha ao verificar nova versão do app:", err);
      }
    };

    // Executa a primeira checagem após 30 segundos
    const initialTimeout = setTimeout(checkVersion, 30000);

    // E checa periodicamente a cada 2 minutos
    const interval = setInterval(checkVersion, 120000);

    // Verifica também quando o usuário foca na aba/janela novamente (ex: volta do standby)
    const handleFocus = () => {
      void checkVersion();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Countdown e auto-reload caso o usuário detecte a atualização e não clique
  useEffect(() => {
    if (!hasUpdate) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleReload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasUpdate]);

  const handleReload = () => {
    setIsReloading(true);
    // Limpa caches e força reload completo
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-[440px] p-8 bg-[color-mix(in_srgb,var(--brand-glow,rgba(0,112,243,0.15))_15%,rgba(5,7,12,0.95))] border border-brand/40 shadow-2xl relative hud-corners text-center">
        {/* HUD corners */}
        <div className="hud-tl" />
        <div className="hud-tr" />
        <div className="hud-bl" />
        <div className="hud-br" />

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand/20 animate-ping" />
            <div className="h-14 w-14 rounded-full border border-brand/50 bg-brand/10 flex items-center justify-center text-brand relative">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
          </div>

          <span className="mono text-[10px] tracking-[0.25em] text-brand font-bold uppercase">
            ◆ SISTEMA ATUALIZADO ◆
          </span>

          <h3 className="text-lg font-medium tracking-tight mt-1 text-foreground">
            Nova versão disponível!
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mt-1">
            Uma nova versão do <strong>Consultas PRO</strong> foi publicada. Para evitar erros de sincronização e inconsistência de dados, a página precisa ser recarregada.
          </p>

          <div className="mt-4 w-full p-3 rounded bg-surface/50 border border-hairline font-mono text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-2">
            <RefreshCw className={`h-3 w-3 ${isReloading ? "animate-spin" : ""}`} />
            <span>Recarregamento automático em <strong className="text-brand font-mono font-bold">{countdown}s</strong></span>
          </div>

          <div className="mt-5 w-full">
            <Button
              onClick={handleReload}
              disabled={isReloading}
              className="w-full bg-brand hover:bg-brand/95 text-primary-foreground font-medium py-2 px-4 shadow-[0_0_20px_rgba(var(--brand),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand),0.5)] transition-all cursor-target flex items-center justify-center gap-2"
            >
              {isReloading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Recarregando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Atualizar Agora</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

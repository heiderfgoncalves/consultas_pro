import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Plus, Trash2, ShieldAlert, Globe, FileText, Check, AlertCircle, Info, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getCompanyTokensApi,
  createCompanyTokenApi,
  revokeCompanyTokenApi,
  type CompanyApiToken,
} from '@/api/admin-integrations';

interface CompanyApiTokensTabProps {
  accessToken: string | null;
}

export default function CompanyApiTokensTab({ accessToken }: CompanyApiTokensTabProps) {
  const [tokens, setTokens] = useState<CompanyApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [allowedOriginsInput, setAllowedOriginsInput] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<'widget' | 'proxy'>('widget');

  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const data = await getCompanyTokensApi(accessToken);
      setTokens(data || []);
    } catch (error) {
      toast.error('Falha ao carregar os tokens de API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      void fetchTokens();
    }
  }, [accessToken]);

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error('O rótulo do token é obrigatório.');
      return;
    }

    const allowedOrigins = allowedOriginsInput
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    try {
      const res = await createCompanyTokenApi(accessToken, {
        label: label.trim(),
        allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined
      });

      setNewlyCreatedToken(res.token);
      toast.success('Token de API gerado com sucesso!');
      setLabel('');
      setAllowedOriginsInput('');
      void fetchTokens();
    } catch (error) {
      toast.error('Falha ao gerar o token de API.');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeCompanyTokenApi(accessToken, id);
      toast.success('Token revogado com sucesso!');
      void fetchTokens();
    } catch (error) {
      toast.error('Erro ao revogar o token de API.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 border border-border p-5 rounded-2xl">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" /> Tokens de API & Integrações
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as chaves de acesso para integrar consultas automatizadas e widgets White-Label no seu sistema.
          </p>
        </div>
        <Button onClick={() => { setNewlyCreatedToken(null); setIsCreateOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Gerar Token de API
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tokens List (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-primary/70" /> Seus Tokens Ativos
          </h4>

          {isLoading ? (
            <div className="flex justify-center items-center py-10 bg-card border border-border rounded-xl">
              <span className="text-sm text-muted-foreground animate-pulse">Carregando tokens...</span>
            </div>
          ) : tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-card border border-border rounded-xl text-center space-y-2">
              <Key className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Nenhum token ativo encontrado</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Gere um token de API para começar a integrar as consultas PRO no seu website.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border p-4 rounded-xl flex items-center justify-between gap-4 hover:border-primary/30 transition-all duration-300 shadow-card"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">{token.label}</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">
                        •••• {token.last4}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                      <span>Criado em: {new Date(token.createdAt).toLocaleDateString('pt-BR')}</span>
                      {token.lastUsedAt && (
                        <span>Último uso: {new Date(token.lastUsedAt).toLocaleString('pt-BR')}</span>
                      )}
                      {token.allowedOrigins && token.allowedOrigins.length > 0 ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Globe className="w-3.5 h-3.5" /> Domain Lock: {token.allowedOrigins.join(', ')}
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1" title="Qualquer site pode fazer chamadas usando este token (perigoso se exposto no front)">
                          <AlertCircle className="w-3.5 h-3.5" /> Sem restrição de domínio
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Deseja realmente revogar este token? As integrações associadas deixarão de funcionar.')) {
                        void handleRevoke(token.id);
                      }
                    }}
                    title="Revogar Token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Config / White Label Instructions (1/3 width) */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-primary/70" /> Resumo do White-Label
          </h4>

          <div className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-semibold text-foreground">Layout & CSS Customizado</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O esqueleto HTML fornecido pelo widget é cru e possui classes limpas (ex: <code className="bg-muted px-1 py-0.5 rounded font-mono">cpro-table</code>). Seu desenvolvedor pode aplicar CSS customizado para combinar 100% com a identidade visual da sua marca.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-semibold text-foreground">Saldo Compartilhado</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Todas as consultas realizadas por meio dos seus tokens consomem diretamente o saldo consolidado da sua empresa na nossa plataforma.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guide Section */}
      <div className="border border-border rounded-2xl overflow-hidden shadow-card bg-card">
        <div className="border-b border-border bg-muted/30 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Code2 className="w-4.5 h-4.5 text-primary" /> Guia de Integração Rápida
            </h4>
            <p className="text-xs text-muted-foreground">Implemente a exibição de consultas em minutos no seu app.</p>
          </div>

          <div className="flex bg-muted p-0.5 rounded-lg border border-border shrink-0">
            <button
              onClick={() => setDocTab('widget')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                docTab === 'widget' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Widget White-Label (Frontend)
            </button>
            <button
              onClick={() => setDocTab('proxy')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                docTab === 'proxy' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Backend Proxy (Altamente Seguro)
            </button>
          </div>
        </div>

        <div className="p-6">
          {docTab === 'widget' ? (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Aviso de Segurança:</span> Ao usar o widget direto no frontend, certifique-se de configurar a restrição de domínios (*Allowed Origins*) na chave de API para impedir que outras pessoas copiem seu token e gastem seu saldo.
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Snippet HTML para colocar no seu site</p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground overflow-x-auto leading-relaxed select-all">
{`<!-- Elemento onde a consulta será renderizada -->
<div id="meu-container-consulta"></div>

<!-- Carrega o script da plataforma -->
<script src="${window.location.origin}/widget.js"></script>

<script>
  const widget = new ConsultasProWidget({
    token: 'SEU_API_TOKEN_AQUI'
  });
  
  // Dispara a consulta (faz polling e renderiza no container)
  widget.renderConsultation('meu-container-consulta', {
    subjectDocument: '12345678900', // CPF ou CNPJ
    templateId: 'ID_DO_TEMPLATE',   // ID do layout de consulta desejado
    externalUserId: 'user_internal_id' // Seu ID do cliente final (para controle de saldo)
  });
</script>`}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute right-3 top-3 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(`<!-- Elemento onde a consulta será renderizada -->
<div id="meu-container-consulta"></div>

<!-- Carrega o script da plataforma -->
<script src="${window.location.origin}/widget.js"></script>

<script>
  const widget = new ConsultasProWidget({
    token: 'SEU_API_TOKEN_AQUI'
  });
  
  widget.renderConsultation('meu-container-consulta', {
    subjectDocument: '12345678900',
    templateId: 'ID_DO_TEMPLATE',
    externalUserId: 'user_internal_id'
  });
</script>`)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Recomendado:</span> Esta arquitetura protege 100% o seu Token de API. O navegador do seu cliente conversa com o seu próprio servidor backend, e o seu servidor (de forma invisível e segura) se autentica com a nossa plataforma.
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fluxo no seu Servidor Backend (NodeJS / Express)</p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground overflow-x-auto leading-relaxed select-all">
{`app.post('/api/consultar-documento', async (req, res) => {
  try {
    // Faz a consulta de forma segura por baixo dos panos
    const response = await fetch('${window.location.origin}/consultations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_API_TOKEN_SEGURO_NO_BACKEND'
      },
      body: JSON.stringify({
        subjectDocument: req.body.cpf,
        templateId: 'ID_DO_TEMPLATE',
        externalUserId: req.body.usuarioInterno // Identificação para microgerenciamento
      })
    });
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});`}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute right-3 top-3 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(`app.post('/api/consultar-documento', async (req, res) => {
  try {
    const response = await fetch('${window.location.origin}/consultations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_API_TOKEN_SEGURO_NO_BACKEND'
      },
      body: JSON.stringify({
        subjectDocument: req.body.cpf,
        templateId: 'ID_DO_TEMPLATE',
        externalUserId: req.body.usuarioInterno
      })
    });
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});`)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Gerar Token de API</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Configure as credenciais e restrições do seu token.
            </DialogDescription>
          </DialogHeader>

          {!newlyCreatedToken ? (
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome / Rótulo</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Integração Rprotec Widget"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Restrição de Origem (CORS)
                </label>
                <Input
                  value={allowedOriginsInput}
                  onChange={(e) => setAllowedOriginsInput(e.target.value)}
                  placeholder="rprotec.com.br, app.rprotec.com.br"
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Permite restringir o uso do token a origens específicas (separadas por vírgula). Útil para o Widget frontend. Deixe vazio para não restringir.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} className="gradient-primary text-primary-foreground shadow-glow">
                  Gerar Token
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Atenção total:</span> Copie este token agora! Por motivos de segurança, ele **nunca mais** será exibido nesta tela novamente.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Token Gerado</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={newlyCreatedToken}
                    className="font-mono text-xs bg-muted text-foreground flex-1"
                  />
                  <Button onClick={() => copyToClipboard(newlyCreatedToken)} className="gradient-primary text-primary-foreground">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsCreateOpen(false)} className="bg-primary text-primary-foreground">
                  Entendido & Concluído
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

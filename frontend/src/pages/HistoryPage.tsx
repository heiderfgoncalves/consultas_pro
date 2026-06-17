import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, RefreshCw, Eye, History, Flag, MessageSquare, Code2,
  X, AlertTriangle, CheckCircle2, Clock, FileText, ChevronDown, ChevronUp,
  Loader2, LayoutTemplate, Database, Printer
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest, getStoredToken, apiBase, openConsultationPdfInNewTab } from '@/lib/api';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';


export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [jsonModal, setJsonModal] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'preview' | 'data'>('preview');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null);
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<any[]>('/consultations');
      setHistory(data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar o histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const openViewModal = useCallback(async (id: string) => {
    setViewModal(id);
    setViewDetail(null);
    setViewError(null);
    setExpandedExecution(null);
    setViewTab('preview');
    setViewLoading(true);
    try {
      const data = await apiRequest<any>(`/consultations/${id}`);
      setViewDetail(data);
    } catch (err: any) {
      setViewError(err?.message || 'Falha ao carregar detalhes da consulta');
    } finally {
      setViewLoading(false);
    }
  }, []);

  const downloadPdf = useCallback((item: any) => {
    openConsultationPdfInNewTab(item.id);
    toast.success('PDF aberto em nova aba!');
  }, []);

  const isAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const canReport = (user?.accessLevel ?? 2) >= 1;

  const filtered = history.filter(h => {
    const doc = h.subjectDocument || '';
    const templateName = h.template?.name || (h.items?.map((i: any) => i.providerProduct?.name).join(', ') || 'Consulta Personalizada');
    const extId = h.externalUserId || '';

    const matchSearch = doc.includes(searchQuery) ||
      templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extId.toLowerCase().includes(searchQuery.toLowerCase());

    const mappedStatus = h.status === 'COMPLETED' ? 'completed' : (h.status === 'PROCESSING' || h.status === 'QUEUED' ? 'processing' : 'error');
    const matchStatus = statusFilter === 'all' || mappedStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const reportStatusConfig = {
    pending: { label: 'Pendente', icon: Clock, className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    reviewed: { label: 'Em Análise', icon: Eye, className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    resolved: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <PageHeader
        title="Histórico de Consultas"
        subtitle="Consulte todas as análises emitidas pela sua conta em tempo real"
        titleClassName="text-2xl font-bold text-foreground tracking-tight"
        subtitleClassName="text-muted-foreground text-sm"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Campo de Busca Premium */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por documento ou template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10.5 bg-card/75 backdrop-blur-md border-border focus:border-primary/50 focus:ring-primary/15 text-foreground rounded-xl placeholder:text-muted-foreground transition-all text-sm w-full"
          />
        </div>

        {/* Filtros em Cápsula */}
        <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
          {['all', 'completed', 'processing', 'error'].map((s) => (
            <button
               key={s}
               onClick={() => setStatusFilter(s)}
               className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                 statusFilter === s
                   ? 'bg-primary text-primary-foreground shadow-none scale-[1.02]'
                   : 'bg-card/75 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30'
               }`}
             >
              {s === 'all' ? 'Todas' : s === 'completed' ? 'Concluídas' : s === 'processing' ? 'Processando' : 'Erro'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Carregando consultas reais...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <Button size="sm" variant="ghost" className="ml-auto hover:bg-rose-500/20 hover:text-rose-500" onClick={fetchHistory}>Tentar novamente</Button>
        </div>
      )}

      {/* Table Section */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <EmptyState icon={History} title="Nenhuma consulta encontrada" description="Ajuste os filtros ou emita uma nova consulta." />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-xl shadow-none overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Data</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Documento</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Template</th>
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Valor</th>
                    <th className="text-left text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">ID Cliente</th>
                    <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Status</th>
                    {isAdmin && <th className="text-center text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Report</th>}
                    <th className="text-right text-[10px] uppercase font-bold text-muted-foreground px-5 py-3 tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((item) => {
                    const hasReport = !!item.reportedBy;
                    const dateStr = new Date(item.createdAt).toLocaleString('pt-BR');
                    const docStr = item.subjectDocument;
                    const templateNameStr = item.template?.name || (item.items?.map((i: any) => i.providerProduct?.name).join(', ') || 'Consulta Personalizada');
                    const totalCostNum = Number(item.totalCost);
                    const statusKey = item.status === 'COMPLETED' ? 'completed' : (item.status === 'PROCESSING' || item.status === 'QUEUED' ? 'processing' : 'error');

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          hasReport && isAdmin ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-l-2 border-l-amber-500' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{dateStr}</td>
                        <td className="px-5 py-3.5 text-xs text-foreground font-mono whitespace-nowrap">{docStr}</td>
                        <td className="px-5 py-3.5 text-xs text-foreground font-semibold whitespace-nowrap">{templateNameStr}</td>
                        <td className="px-5 py-3.5 text-xs text-foreground text-right font-black whitespace-nowrap">R$ {totalCostNum.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{item.externalUserId || '—'}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                            statusKey === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : statusKey === 'processing'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {statusKey === 'completed' ? 'Sucesso' : statusKey === 'processing' ? 'Processando' : 'Erro'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            {hasReport && item.reportStatus ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${reportStatusConfig[item.reportStatus].className}`}>
                                  {(() => { const Ic = reportStatusConfig[item.reportStatus].icon; return <Ic className="w-2.5 h-2.5" />; })()}
                                  {reportStatusConfig[item.reportStatus].label}
                                </span>
                                <span className="text-[9px] text-muted-foreground/60 font-semibold">por {item.reportedBy}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50 font-bold">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10" title="Visualizar consulta" onClick={() => openViewModal(item.id)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10" title="Baixar Relatório" onClick={() => downloadPdf(item)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border" title="Reexecutar Consulta">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            {canReport && !isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/10"
                                onClick={() => setReportModal(item.id)}
                                title="Reportar problema"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10"
                                onClick={() => setJsonModal(JSON.stringify(item, null, 2))}
                                title="Ver Log JSON"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {isAdmin && hasReport && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/10"
                                onClick={() => setReportModal(item.id)}
                                title="Ver Report"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )
      )}

      {/* Report Modal */}
      {(() => {
        const item = history.find(h => h.id === reportModal);
        if (!item) return null;

        const templateNameStr = item.template?.name || (item.items?.map((i: any) => i.providerProduct?.name).join(', ') || 'Consulta Personalizada');
        const showAdminDetails = isAdmin && item.reportedBy;

        return (
          <Modal
            isOpen={!!reportModal}
            onClose={() => setReportModal(null)}
            title={showAdminDetails ? "Detalhes do Report" : "Reportar Consulta"}
            icon={showAdminDetails ? AlertTriangle : Flag}
            iconClassName={showAdminDetails ? "text-amber-500" : "text-primary"}
            size="md"
          >
            {showAdminDetails ? (
              <div className="space-y-4">
                <div className="text-xs space-y-1">
                  <p><span className="text-muted-foreground font-medium">Reportado por:</span> <span className="font-bold text-foreground">{item.reportedBy}</span></p>
                  <p><span className="text-muted-foreground font-medium">Consulta:</span> <span className="font-bold text-foreground">{templateNameStr} — {item.subjectDocument}</span></p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border/80">
                  <p className="text-xs text-foreground/80 font-medium leading-relaxed">{item.reportComment}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs" variant="outline">Marcar como Analisado</Button>
                  <Button size="sm" className="flex-1 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 rounded-lg text-xs">Resolver</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground font-medium">Consulta: <span className="font-bold text-foreground">{templateNameStr}</span> — {item.subjectDocument}</p>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Descreva detalhadamente o problema encontrado..."
                  className="w-full h-28 p-3.5 rounded-xl border border-border bg-muted/35 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                />
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 rounded-lg shadow-none" disabled={!reportComment.trim()}>
                  <Flag className="w-4 h-4 mr-1.5" /> Enviar Report
                </Button>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* JSON Log Modal */}
      <Modal
        isOpen={jsonModal !== null}
        onClose={() => setJsonModal(null)}
        title="JSON Log da Consulta"
        icon={Code2}
        size="2xl"
      >
        <pre className="overflow-auto rounded-xl bg-muted/30 border border-border/80 p-4 text-xs font-mono text-foreground/80 scrollbar-thin">
          {jsonModal}
        </pre>
      </Modal>

      {/* View Consultation Modal */}
      <Modal
        isOpen={viewModal !== null}
        onClose={() => setViewModal(null)}
        title={viewDetail ? <span className="font-mono">{viewDetail.subjectDocument}</span> : 'Visualizar Consulta'}
        icon={FileText}
        size="4xl"
        className="h-[min(90vh,900px)] flex flex-col"
        noPadding={true}
        bodyClassName="flex flex-col min-h-0"
        headerSuffix={
          viewDetail && !viewLoading && (
            <div className="flex gap-1 px-6 pt-3 pb-0">
              <button
                onClick={() => setViewTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
                  viewTab === 'preview'
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" /> Preview HTML
              </button>
              <button
                onClick={() => setViewTab('data')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
                  viewTab === 'data'
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> Dados da Consulta
              </button>
            </div>
          )
        }
        footer={
          viewDetail && !viewLoading && (
            <div className="w-full flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground font-mono">ID: {viewDetail.id}</p>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 rounded-lg border-border"
                    onClick={() => { setViewModal(null); setJsonModal(JSON.stringify(viewDetail, null, 2)); }}
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> Raw JSON
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {viewLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando consulta...</p>
            </div>
          )}

          {viewError && (
            <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{viewError}</span>
            </div>
          )}

          {viewDetail && !viewLoading && (
            <>
              {/* ABA: PREVIEW REAL */}
              {viewTab === 'preview' && (() => {
                const realData = viewDetail.renderPayload || viewDetail.mergedPayload || null;
                const templateLayout = viewDetail.template?.layout ?? null;
                const rawItems = viewDetail.items ?? [];
                const clientName =
                  realData?.cliente?.nome ||
                  realData?.clientName ||
                  realData?.nome ||
                  viewDetail.subjectDocument ||
                  'CLIENTE ANALISADO';

                return (
                  <div className="flex-1 min-h-0" style={{ height: '100%', overflow: 'hidden' }}>
                    <ConsultationPreview
                      blocks={[]}
                      rawItems={rawItems}
                      document={viewDetail.subjectDocument || ''}
                      clientName={clientName}
                      logo={viewDetail.template?.logo ?? null}
                      realData={realData}
                      mode="preview"
                      layout={templateLayout}
                      consultationId={viewDetail.id}
                    />
                  </div>
                );
              })()}

              {/* ABA: DADOS DA CONSULTA */}
              {viewTab === 'data' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Info Geral */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 col-span-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Documento</p>
                      <p className="text-sm font-mono font-bold text-foreground">{viewDetail.subjectDocument}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Template</p>
                      <p className="text-xs font-semibold text-foreground">{viewDetail.template?.name || viewDetail.items?.map((i: any) => i.providerProduct?.name).join(', ') || 'Personalizada'}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                        viewDetail.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : viewDetail.status === 'PROCESSING' || viewDetail.status === 'QUEUED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {viewDetail.status}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Custo Total</p>
                      <p className="text-sm font-black text-foreground">R$ {Number(viewDetail.totalCost).toFixed(2)}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Data</p>
                      <p className="text-xs font-medium text-foreground">{new Date(viewDetail.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    {viewDetail.externalUserId && (
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 col-span-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ID Cliente</p>
                        <p className="text-xs font-mono text-foreground">{viewDetail.externalUserId}</p>
                      </div>
                    )}
                  </div>

                  {/* Produtos */}
                  {viewDetail.items?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Produtos Consultados</p>
                      <div className="space-y-1.5">
                        {viewDetail.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                            <div>
                              <p className="text-xs font-semibold text-foreground">{it.providerProduct?.name || '—'}</p>
                              <p className="text-[10px] text-muted-foreground">{it.providerProduct?.provider?.name} · {it.providerProduct?.consultationType?.name}</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">R$ {Number(it.requestedCost).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execuções */}
                  {viewDetail.executions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Execuções</p>
                      <div className="space-y-2">
                        {viewDetail.executions.map((exec: any) => {
                          const isExpanded = expandedExecution === exec.id;
                          const execStatus = exec.status === 'SUCCESS' ? 'success' : (exec.status === 'PENDING' || exec.status === 'RUNNING') ? 'pending' : 'error';
                          return (
                            <div key={exec.id} className="rounded-xl border border-border/60 overflow-hidden">
                              <button
                                onClick={() => setExpandedExecution(isExpanded ? null : exec.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    execStatus === 'success' ? 'bg-emerald-500' : execStatus === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                                  }`} />
                                  <span className="text-xs font-semibold text-foreground">{exec.provider?.name || exec.product?.name || 'Execução'}</span>
                                  {exec.product?.name && exec.provider?.name && (
                                    <span className="text-[9px] text-muted-foreground">({exec.product.name})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    execStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : execStatus === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                  }`}>{exec.status}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                              </button>
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 space-y-3 border-t border-border/60">
                                      {exec.errorMessage && (
                                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                          <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Erro</p>
                                          <p className="text-xs text-rose-400 font-mono">{exec.errorMessage}</p>
                                        </div>
                                      )}
                                      {exec.normalizedPayload ? (
                                        <div>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Dados Normalizados</p>
                                          <pre className="text-[10px] font-mono text-foreground/80 bg-muted/30 border border-border/50 rounded-lg p-3 overflow-auto max-h-48 scrollbar-thin">
                                            {JSON.stringify(exec.normalizedPayload, null, 2)}
                                          </pre>
                                        </div>
                                      ) : exec.rawResponse ? (
                                        <div>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Resposta Bruta</p>
                                          <pre className="text-[10px] font-mono text-foreground/80 bg-muted/30 border border-border/50 rounded-lg p-3 overflow-auto max-h-48 scrollbar-thin">
                                            {typeof exec.rawResponse === 'string' ? exec.rawResponse : JSON.stringify(exec.rawResponse, null, 2)}
                                          </pre>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">Sem dados disponíveis</p>
                                      )}
                                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                                        {exec.startedAt && <span>Início: {new Date(exec.startedAt).toLocaleString('pt-BR')}</span>}
                                        {exec.completedAt && <span>Fim: {new Date(exec.completedAt).toLocaleString('pt-BR')}</span>}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!viewDetail.executions || viewDetail.executions.length === 0) && viewDetail.status !== 'COMPLETED' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Clock className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-medium">Execuções ainda não disponíveis</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

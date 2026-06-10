import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, RefreshCw, Eye, History, Flag, MessageSquare, Code2,
  X, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { mockHistory } from '@/stores/consultationStore';
import { PageHeader, EmptyState } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [jsonModal, setJsonModal] = useState<string | null>(null);
  const { user } = useAuthStore();

  const isAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const canReport = (user?.accessLevel ?? 2) >= 1;

  const filtered = mockHistory.filter(h => {
    const matchSearch = h.document.includes(searchQuery) ||
      h.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((h as any).externalUserId && (h as any).externalUserId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || h.status === statusFilter;
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
                   ? 'bg-primary text-primary-foreground shadow-[0_4px_15px_rgba(0,194,255,0.25)] scale-[1.02]'
                   : 'bg-card/75 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30'
               }`}
             >
              {s === 'all' ? 'Todas' : s === 'completed' ? 'Concluídas' : s === 'processing' ? 'Processando' : 'Erro'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      {filtered.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma consulta encontrada" description="Ajuste os filtros ou emita uma nova consulta." />
      ) : (
         <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl overflow-hidden"
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
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        hasReport && isAdmin ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-l-2 border-l-amber-500' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{item.date}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground font-mono whitespace-nowrap">{item.document}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground font-semibold whitespace-nowrap">{item.templateName}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground text-right font-black whitespace-nowrap">R$ {item.totalPrice.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{((item as any).externalUserId) || '—'}</td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : item.status === 'processing'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {item.status === 'completed' ? 'Sucesso' : item.status === 'processing' ? 'Processando' : 'Erro'}
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
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border" title="Visualizar">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border" title="Baixar Relatório">
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
                              onClick={() => setJsonModal(item.jsonLog || '')}
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
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {reportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-md"
            onClick={() => setReportModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const item = mockHistory.find(h => h.id === reportModal);
                if (!item) return null;

                if (isAdmin && item.reportedBy) {
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" /> Detalhes do Report
                        </h3>
                        <button onClick={() => setReportModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="space-y-4">
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground font-medium">Reportado por:</span> <span className="font-bold text-foreground">{item.reportedBy}</span></p>
                          <p><span className="text-muted-foreground font-medium">Consulta:</span> <span className="font-bold text-foreground">{item.templateName} — {item.document}</span></p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/50 border border-border/80">
                          <p className="text-xs text-foreground/80 font-medium leading-relaxed">{item.reportComment}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs" variant="outline">Marcar como Analisado</Button>
                          <Button size="sm" className="flex-1 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 rounded-lg text-xs">Resolver</Button>
                        </div>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Flag className="w-5 h-5 text-amber-500" /> Reportar Consulta
                      </h3>
                      <button onClick={() => setReportModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground font-medium">Consulta: <span className="font-bold text-foreground">{item.templateName}</span> — {item.document}</p>
                      <textarea
                      value={reportComment}
                        onChange={(e) => setReportComment(e.target.value)}
                        placeholder="Descreva detalhadamente o problema encontrado..."
                        className="w-full h-28 p-3.5 rounded-xl border border-border bg-muted/35 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                      />
                      <Button className="w-full gradient-primary text-primary-foreground font-semibold text-xs h-10 rounded-lg shadow-[0_4px_15px_rgba(0,194,255,0.15)]" disabled={!reportComment.trim()}>
                        <Flag className="w-4 h-4 mr-1.5" /> Enviar Report
                      </Button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JSON Log Modal */}
      <AnimatePresence>
        {jsonModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-md"
            onClick={() => setJsonModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" /> JSON Log da Consulta
                </h3>
                <button onClick={() => setJsonModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <pre className="flex-1 overflow-auto rounded-xl bg-muted/30 border border-border/80 p-4 text-xs font-mono text-foreground/80 scrollbar-thin">
                {jsonModal}
              </pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

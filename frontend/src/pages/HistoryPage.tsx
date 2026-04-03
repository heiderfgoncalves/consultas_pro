import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, RefreshCw, Eye, History, Flag, MessageSquare, Code2, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { mockHistory } from '@/stores/consultationStore';
import { PageHeader, StatusBadge, EmptyState } from '@/components/shared/StatCard';
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
    const matchSearch = h.document.includes(searchQuery) || h.templateName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const reportStatusConfig = {
    pending: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
    reviewed: { label: 'Em Análise', icon: Eye, className: 'bg-info/10 text-info border-info/20' },
    resolved: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico de Consultas" subtitle="Todas as consultas emitidas pela sua conta" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por documento ou template..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'completed', 'processing', 'error'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === s ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Todas' : s === 'completed' ? 'Concluídas' : s === 'processing' ? 'Processando' : 'Erro'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma consulta encontrada" description="Ajuste os filtros ou emita uma nova consulta." />
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Data</th>
                  <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Documento</th>
                  <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Template</th>
                  <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Valor</th>
                  <th className="text-center text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Status</th>
                  {isAdmin && <th className="text-center text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Report</th>}
                  <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const hasReport = !!item.reportedBy;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-accent/50 transition-colors ${
                        hasReport && isAdmin ? 'bg-warning/5 border-l-2 border-l-warning' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{item.document}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{item.templateName}</td>
                      <td className="px-4 py-3 text-sm text-foreground text-right font-semibold">R$ {item.totalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={item.status} /></td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          {hasReport && item.reportStatus ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${reportStatusConfig[item.reportStatus].className}`}>
                                {(() => { const Ic = reportStatusConfig[item.reportStatus].icon; return <Ic className="w-3 h-3" />; })()}
                                {reportStatusConfig[item.reportStatus].label}
                              </span>
                              <span className="text-[9px] text-muted-foreground">por {item.reportedBy}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-accent"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-accent"><Download className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-accent"><RefreshCw className="w-3.5 h-3.5" /></Button>
                          {canReport && !isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-warning/10 hover:text-warning"
                              onClick={() => setReportModal(item.id)}
                              title="Reportar consulta"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => setJsonModal(item.jsonLog || '')}
                              title="Ver JSON Log"
                            >
                              <Code2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdmin && hasReport && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-warning/10 hover:text-warning"
                              onClick={() => setReportModal(item.id)}
                              title="Ver report"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
            onClick={() => setReportModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-elevated p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const item = mockHistory.find(h => h.id === reportModal);
                if (!item) return null;

                if (isAdmin && item.reportedBy) {
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning" /> Detalhes do Report
                        </h3>
                        <button onClick={() => setReportModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm"><span className="text-muted-foreground">Reportado por:</span> <span className="font-medium text-foreground">{item.reportedBy}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Consulta:</span> <span className="font-medium text-foreground">{item.templateName} — {item.document}</span></div>
                        <div className="p-3 rounded-lg bg-muted border border-border">
                          <p className="text-sm text-foreground">{item.reportComment}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" variant="outline">Marcar como Analisado</Button>
                          <Button size="sm" className="flex-1 bg-success text-success-foreground hover:bg-success/90">Resolver</Button>
                        </div>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Flag className="w-5 h-5 text-warning" /> Reportar Consulta
                      </h3>
                      <button onClick={() => setReportModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Consulta: <span className="font-medium text-foreground">{item.templateName}</span> — {item.document}</p>
                      <textarea
                        value={reportComment}
                        onChange={(e) => setReportComment(e.target.value)}
                        placeholder="Descreva o problema encontrado..."
                        className="w-full h-24 p-3 rounded-lg border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <Button className="w-full gradient-primary text-primary-foreground" disabled={!reportComment.trim()}>
                        <Flag className="w-4 h-4 mr-2" /> Enviar Report
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
            onClick={() => setJsonModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-elevated p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" /> JSON Log da Consulta
                </h3>
                <button onClick={() => setJsonModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg bg-muted/50 border border-border p-4 text-xs font-mono text-foreground scrollbar-thin">
                {jsonModal}
              </pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

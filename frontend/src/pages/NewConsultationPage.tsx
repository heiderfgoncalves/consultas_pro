import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Send,
  FileText, Eye, AlertTriangle,
  Play, Edit, Star, Trash2, Copy,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useConsultationStore, mockTemplates, type SavedTemplate } from '@/stores/consultationStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';

// Template preview modal with mock data
function TemplatePreviewModal({ template, open, onClose }: { template: SavedTemplate; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Prévia — {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div className="bg-card rounded-xl border border-border">
            <ConsultationPreview
              blocks={template.blocks}
              document="403.406.588-51"
              clientName="JULIANO CAMPOS PEREIRA"
              mode="preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NewConsultationPage() {
  const [templates] = useState(mockTemplates);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);
  const [document, setDocument] = useState('');
  const { user } = useAuthStore();
  const { selectedBlocks, addBlock, removeBlock, clearBlocks } = useConsultationStore();

  const totalPrice = selectedBlocks.reduce((sum, b) => sum + b.price, 0);
  const insufficientBalance = totalPrice > (user?.balance || 0);

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const loadTemplate = (tpl: SavedTemplate) => {
    clearBlocks();
    tpl.blocks.forEach(b => addBlock(b));
  };

  const openEditor = (tpl?: SavedTemplate) => {
    setEditingTemplate(tpl || null);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Nova Consulta" subtitle="Escolha um template ou crie um novo para emitir sua consulta">
        <div className="flex items-center gap-2">
          <Button onClick={() => openEditor()} className="gradient-primary text-primary-foreground text-xs h-8 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo Template
          </Button>
        </div>
      </PageHeader>

      {/* Emissão rápida */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-xs font-semibold text-foreground mb-3">Emissão Rápida</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documento (CPF/CNPJ)</label>
            <Input placeholder="000.000.000-00" value={document} onChange={(e) => setDocument(formatDocument(e.target.value))} className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            {selectedBlocks.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{selectedBlocks.length} blocos</span>
                <span className="font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                {insufficientBalance && <span className="text-destructive text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Saldo insuficiente</span>}
              </div>
            )}
            <Button className="gradient-primary text-primary-foreground h-8 text-xs gap-1.5" disabled={selectedBlocks.length === 0 || insufficientBalance || !document}>
              <Send className="w-3.5 h-3.5" /> Emitir
            </Button>
          </div>
        </div>
      </div>

      {/* Template cards */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seus Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border shadow-card hover:shadow-elevated transition-all duration-200 overflow-hidden group"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">{tpl.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{tpl.blocks.length} blocos</p>
                    </div>
                  </div>
                  {tpl.isFavorite && <Star className="w-3.5 h-3.5 text-warning fill-warning" />}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {tpl.blocks.slice(0, 4).map((block) => (
                    <span key={block.id} className="px-1.5 py-0.5 text-[9px] rounded-full bg-muted text-muted-foreground">{block.name}</span>
                  ))}
                  {tpl.blocks.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-medium">+{tpl.blocks.length - 4}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Valor estimado</span>
                  <span className="font-semibold text-foreground">R$ {tpl.totalPrice.toFixed(2)}</span>
                </div>

                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 gradient-primary text-primary-foreground text-[10px] h-7 gap-1" onClick={() => loadTemplate(tpl)}>
                    <Play className="w-3 h-3" /> Usar
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => setPreviewTemplate(tpl)} title="Prévia com dados">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => openEditor(tpl)} title="Editar">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2"><Copy className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="px-4 py-1.5 border-t border-border bg-muted/30 text-[9px] text-muted-foreground">
                Atualizado em {tpl.updatedAt}
              </div>
            </motion.div>
          ))}

          {/* New template card */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: templates.length * 0.05 }}
            onClick={() => openEditor()}
            className="bg-card rounded-xl border-2 border-dashed border-border hover:border-primary/40 shadow-card hover:shadow-elevated transition-all duration-200 p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Criar Template</span>
          </motion.button>
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <TemplateBuilderEditor
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
          initialBlocks={editingTemplate?.blocks}
          templateName={editingTemplate?.name}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

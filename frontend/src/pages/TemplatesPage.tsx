import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Edit, Copy, Trash2, Play, FileText, Plus, Eye } from 'lucide-react';
import { mockTemplates, type SavedTemplate } from '@/stores/consultationStore';
import { PageHeader, EmptyState } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';

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
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const [templates] = useState(mockTemplates);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" subtitle="Seus layouts salvos para reutilização rápida">
        <Link to="/consulta/nova">
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Template
          </Button>
        </Link>
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum template salvo" description="Crie um template na tela de nova consulta para reutilizar depois." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border shadow-card hover:shadow-elevated transition-shadow overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground">{tpl.blocks.length} blocos</p>
                    </div>
                  </div>
                  <button className={`${tpl.isFavorite ? 'text-warning' : 'text-muted-foreground'} hover:text-warning transition-colors`}>
                    <Star className={`w-4 h-4 ${tpl.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tpl.blocks.slice(0, 4).map((block) => (
                    <span key={block.id} className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">{block.name}</span>
                  ))}
                  {tpl.blocks.length > 4 && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-medium">+{tpl.blocks.length - 4}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Valor estimado</span>
                  <span className="font-semibold text-foreground">R$ {tpl.totalPrice.toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                  <Link to="/consulta/nova" className="flex-1">
                    <Button size="sm" className="w-full gradient-primary text-primary-foreground text-xs">
                      <Play className="w-3 h-3 mr-1" /> Usar
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setPreviewTemplate(tpl)} title="Prévia">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs"><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-xs"><Copy className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-xs text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="px-5 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
                Atualizado em {tpl.updatedAt}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

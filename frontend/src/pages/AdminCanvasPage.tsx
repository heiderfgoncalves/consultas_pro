import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Code2, Play, Save, Plus, Trash2, GripVertical, Eye,
  Variable, Braces, Settings2, ChevronRight, ArrowRight,
  X, FileText, Maximize2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CanvasNode {
  id: string;
  type: 'variable' | 'expression' | 'block' | 'condition';
  label: string;
  value: string;
  color: string;
}

const defaultNodes: CanvasNode[] = [
  { id: 'n1', type: 'variable', label: 'document', value: '{{cpf}}', color: 'bg-primary/10 border-primary/30 text-primary' },
  { id: 'n2', type: 'expression', label: 'Score Band', value: 'score <= 200 ? "Péssimo" : score <= 400 ? "Ruim" : "Regular"', color: 'bg-warning/10 border-warning/30 text-warning' },
  { id: 'n3', type: 'block', label: 'SPC Section', value: '{ "source": "spc", "fields": ["inclusao", "vencimento", "valor"] }', color: 'bg-success/10 border-success/30 text-success' },
  { id: 'n4', type: 'condition', label: 'Show Bacen', value: 'blocks.includes("registrato_bacen")', color: 'bg-info/10 border-info/30 text-info' },
];

const nodeTypeIcons = {
  variable: Variable,
  expression: Braces,
  block: FileText,
  condition: Settings2,
};

function SortableNode({ node, selected, onSelect, onDelete, onUpdate }: {
  node: CanvasNode; selected: boolean; onSelect: () => void; onDelete: () => void;
  onUpdate: (val: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const Icon = nodeTypeIcons[node.type];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        onClick={onSelect}
        className={`
          rounded-xl border p-3 cursor-pointer transition-all duration-200 group
          ${node.color}
          ${selected ? 'ring-2 ring-primary shadow-glow' : 'hover:shadow-elevated'}
        `}
      >
        <div className="flex items-start gap-2">
          <button {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">{node.type}</span>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm font-semibold mt-0.5">{node.label}</p>
            <code className="text-[10px] mt-1 block font-mono opacity-80 truncate">{node.value}</code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminCanvasPage() {
  const { user } = useAuthStore();
  const [nodes, setNodes] = useState<CanvasNode[]>(defaultNodes);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNodes(prev => {
        const oldIndex = prev.findIndex(n => n.id === active.id);
        const newIndex = prev.findIndex(n => n.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const addNode = (type: CanvasNode['type']) => {
    const colors = {
      variable: 'bg-primary/10 border-primary/30 text-primary',
      expression: 'bg-warning/10 border-warning/30 text-warning',
      block: 'bg-success/10 border-success/30 text-success',
      condition: 'bg-info/10 border-info/30 text-info',
    };
    const newNode: CanvasNode = {
      id: `n${Date.now()}`,
      type,
      label: `Novo ${type}`,
      value: '',
      color: colors[type],
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const updateNodeValue = (id: string, value: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, value } : n));
  };

  const updateNodeLabel = (id: string, label: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, label } : n));
  };

  const runTest = () => {
    const output = {
      template: nodes.map(n => ({ type: n.type, label: n.label, value: n.value })),
      compiledAt: new Date().toISOString(),
      testDocument: '214.193.318-84',
      mockResult: {
        spc: { records: 4, totalValue: 810.16, status: 'found' },
        serasa: { records: 3, totalValue: 7234.23, status: 'found' },
        score: { value: 24, band: 'pessimo', probability: '2.40%' },
      },
    };
    setTestResult(JSON.stringify(output, null, 2));
    setPreviewJson(JSON.stringify(output, null, 2));
  };

  const selected = nodes.find(n => n.id === selectedNode);

  if (user?.backendRole !== 'PLATFORM_ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)]">
      <PageHeader title="Editor Canvas de Templates" subtitle="Construa templates técnicos com variáveis, expressões e preview em tempo real">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runTest}>
            <Play className="w-3.5 h-3.5 mr-1.5" /> Testar
          </Button>
          <Button className="gradient-primary text-primary-foreground" size="sm">
            <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar Template
          </Button>
        </div>
      </PageHeader>

      <div className="h-[calc(100%-4rem)]">
        <ResizablePanelGroup direction="horizontal" className="rounded-xl border border-border bg-background">
          {/* Toolbox */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-card/50">
                <h3 className="text-xs font-semibold text-foreground">Ferramentas</h3>
              </div>
              <div className="p-3 space-y-2">
                {(['variable', 'expression', 'block', 'condition'] as const).map((type) => {
                  const Icon = nodeTypeIcons[type];
                  const labels = { variable: 'Variável', expression: 'Expressão', block: 'Bloco', condition: 'Condição' };
                  return (
                    <button
                      key={type}
                      onClick={() => addNode(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-200 group"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {labels[type]}
                      <Plus className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>

              {/* Node properties */}
              {selected && (
                <div className="flex-1 p-3 border-t border-border overflow-y-auto space-y-3">
                  <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Propriedades</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Label</label>
                    <Input
                      value={selected.label}
                      onChange={(e) => updateNodeLabel(selected.id, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Valor / Expressão</label>
                    <textarea
                      value={selected.value}
                      onChange={(e) => updateNodeValue(selected.id, e.target.value)}
                      className="w-full h-20 p-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    <p className="font-semibold mb-1">Variáveis disponíveis:</p>
                    <code className="block">{'{{cpf}}, {{cnpj}}, {{blocks}}, {{score}}, {{spc_total}}'}</code>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Canvas */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-primary" /> Canvas
                </h3>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{nodes.length} nós</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {nodes.map((node, i) => (
                        <div key={node.id}>
                          <SortableNode
                            node={node}
                            selected={selectedNode === node.id}
                            onSelect={() => setSelectedNode(node.id)}
                            onDelete={() => deleteNode(node.id)}
                            onUpdate={(val) => updateNodeValue(node.id, val)}
                          />
                          {i < nodes.length - 1 && (
                            <div className="flex justify-center py-1">
                              <ArrowRight className="w-3 h-3 text-border rotate-90" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {nodes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Code2 className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">Canvas vazio</p>
                    <p className="text-xs text-muted-foreground">Adicione nós usando o painel lateral</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Preview JSON */}
          <ResizablePanel defaultSize={35} minSize={20}>
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Preview / Output
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {testResult ? (
                  <pre className="text-[10px] font-mono text-foreground bg-muted/50 rounded-lg border border-border p-3 whitespace-pre-wrap leading-relaxed">
                    {testResult}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Play className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">Clique em "Testar" para ver o output</p>
                    <p className="text-xs text-muted-foreground mt-1">O preview mostrará o JSON gerado pelo template</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

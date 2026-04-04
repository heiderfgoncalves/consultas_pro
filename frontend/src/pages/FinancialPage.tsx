import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownRight, Gift, Settings, Calendar, Filter } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { mockFinancialEntries } from '@/stores/consultationStore';
import StatCard, { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { openRechargeModal } from '@/stores/rechargeModalStore';

const typeLabels: Record<string, string> = { credit: 'Recarga', debit: 'Consulta', adjustment: 'Ajuste', bonus: 'Bônus' };
const typeIcons: Record<string, any> = { credit: ArrowUpRight, debit: ArrowDownRight, adjustment: Settings, bonus: Gift };

export default function FinancialPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Saldo, recargas e extrato de movimentações">
        <Button className="gradient-primary text-primary-foreground" onClick={() => openRechargeModal()}>
          <Wallet className="w-4 h-4 mr-2" /> Recarregar saldo
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Saldo Atual" value={`R$ ${user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Wallet} variant="success" />
        <StatCard title="Entradas no Mês" value="R$ 850,00" subtitle="2 recargas + 1 bônus" icon={ArrowUpRight} variant="primary" delay={0.05} />
        <StatCard title="Saídas no Mês" value="R$ 752,40" subtitle="23 consultas emitidas" icon={ArrowDownRight} variant="warning" delay={0.1} />
      </div>

      {/* Statement */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Extrato</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8">
              <Calendar className="w-3 h-3 mr-1" /> Período
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8">
              <Filter className="w-3 h-3 mr-1" /> Filtros
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Data</th>
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Tipo</th>
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Descrição</th>
                <th className="text-left text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Usuário</th>
                <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Valor</th>
                <th className="text-right text-[10px] uppercase font-semibold text-muted-foreground px-4 py-3 tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockFinancialEntries.map((entry) => {
                const TypeIcon = typeIcons[entry.type];
                return (
                  <tr key={entry.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{entry.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className={`w-3.5 h-3.5 ${entry.amount > 0 ? 'text-success' : 'text-destructive'}`} />
                        <span className="text-xs text-muted-foreground">{typeLabels[entry.type]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.user || '—'}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${entry.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                      {entry.amount > 0 ? '+' : ''}R$ {Math.abs(entry.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-foreground">R$ {entry.balanceAfter.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, QrCode, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const quickAmounts = [50, 100, 200, 500];

export default function RechargePage() {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Recarga Realizada!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            R$ {finalAmount.toFixed(2)} foram adicionados ao seu saldo via {method === 'pix' ? 'PIX' : 'Cartão de Crédito'}.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/dashboard"><Button variant="outline">Ir ao Painel</Button></Link>
            <Link to="/consulta/nova"><Button className="gradient-primary text-primary-foreground">Nova Consulta</Button></Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Recarregar Saldo" subtitle="Adicione créditos à sua carteira">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
          <Wallet className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-success">
            Saldo: R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
        {/* Amount selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Valor da recarga</label>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {quickAmounts.map((v) => (
              <button
                key={v}
                onClick={() => { setAmount(v); setCustomAmount(''); }}
                className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                  amount === v && !customAmount
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-muted text-foreground border border-border hover:border-primary/30'
                }`}
              >
                R$ {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
            <Input
              type="number"
              placeholder="Outro valor"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Método de pagamento</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'pix' as const, label: 'PIX', icon: QrCode, desc: 'Aprovação instantânea' },
              { value: 'card' as const, label: 'Cartão de Crédito', icon: CreditCard, desc: 'Visa, Master, Elo' },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  method === m.value
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method === m.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold text-foreground">R$ {finalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Novo saldo</span>
            <span className="font-semibold text-success">R$ {((user?.balance || 0) + finalAmount).toFixed(2)}</span>
          </div>
          <Button onClick={() => setStep('success')} className="w-full h-11 gradient-primary text-primary-foreground font-medium" disabled={!finalAmount || finalAmount <= 0}>
            Confirmar Recarga
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

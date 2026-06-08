import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, QrCode, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRechargeModalStore } from '@/stores/rechargeModalStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const quickAmounts = [50, 100, 200, 500];

export default function RechargeModal() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const open = useRechargeModalStore((s) => s.open);
  const setOpen = useRechargeModalStore((s) => s.setOpen);

  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [step, setStep] = useState<'select' | 'success'>('select');

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  useEffect(() => {
    if (!open) {
      setStep('select');
      setAmount(100);
      setCustomAmount('');
      setMethod('pix');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {step === 'success' ? (
          <div className="p-6 pt-10 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Recarga realizada</h2>
              <p className="text-sm text-muted-foreground mb-6">
                R$ {finalAmount.toFixed(2)} foram adicionados ao seu saldo via{' '}
                {method === 'pix' ? 'PIX' : 'cartão de crédito'}.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                  Fechar
                </Button>
                <Button
                  className="gradient-primary text-primary-foreground w-full sm:w-auto"
                  onClick={() => {
                    setOpen(false);
                    navigate('/consulta/nova');
                  }}
                >
                  Nova consulta
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-border text-left space-y-3">
              <DialogTitle>Recarregar saldo</DialogTitle>
              <DialogDescription>Adicione créditos à sua carteira.</DialogDescription>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 w-fit">
                <Wallet className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm font-semibold text-success">
                  Saldo: R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </DialogHeader>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 space-y-6"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Valor da recarga</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                  {quickAmounts.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setAmount(v);
                        setCustomAmount('');
                      }}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    type="number"
                    placeholder="Outro valor"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Método de pagamento</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'pix' as const, label: 'PIX', icon: QrCode, desc: 'Aprovação instantânea' },
                    { value: 'card' as const, label: 'Cartão de crédito', icon: CreditCard, desc: 'Visa, Master, Elo' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        method === m.value
                          ? 'border-primary bg-primary/5 shadow-glow'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          method === m.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <m.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold text-foreground">R$ {finalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Novo saldo</span>
                  <span className="font-semibold text-success">
                    R$ {((user?.balance || 0) + finalAmount).toFixed(2)}
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={() => setStep('success')}
                  className="w-full h-11 gradient-primary text-primary-foreground font-medium"
                  disabled={!finalAmount || finalAmount <= 0 || Number.isNaN(finalAmount)}
                >
                  Confirmar recarga
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

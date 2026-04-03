import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.png';

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<'pf' | 'pj'>('pf');
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (accountType === 'pf') {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate('/login'), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>

        <img src={logo} alt="Consultas Pró" className="h-10 w-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-1">Criar sua conta</h2>
        <p className="text-sm text-muted-foreground mb-8">Preencha os dados para começar a utilizar</p>

        {/* Account type toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-6">
          {[
            { value: 'pf' as const, label: 'Pessoa Física' },
            { value: 'pj' as const, label: 'Pessoa Jurídica' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setAccountType(opt.value); setForm(f => ({ ...f, document: '' })); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                accountType === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{accountType === 'pf' ? 'Nome Completo' : 'Razão Social'}</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="h-11" placeholder={accountType === 'pf' ? 'João da Silva' : 'Empresa LTDA'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required className="h-11" placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} required className="h-11" placeholder="(11) 99999-8888" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{accountType === 'pf' ? 'CPF' : 'CNPJ'}</Label>
            <Input value={form.document} onChange={(e) => setForm(f => ({ ...f, document: formatDocument(e.target.value) }))} required className="h-11" placeholder={accountType === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required className="h-11" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required className="h-11" placeholder="••••••••" />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-medium mt-2" disabled={loading}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>Criar Conta <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Já tem uma conta? <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
        </p>
      </motion.div>
    </div>
  );
}

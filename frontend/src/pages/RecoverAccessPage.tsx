import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.png';

export default function RecoverAccessPage() {
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>

        <img src={logo} alt="Consultas PRO" className="h-10 w-auto mb-6" />

        {sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">E-mail enviado!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <Link to="/login">
              <Button variant="outline">Voltar ao login</Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-1">Recuperar acesso</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Informe seu e-mail ou documento para receber as instruções de recuperação.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>E-mail ou CPF/CNPJ</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={value} onChange={(e) => setValue(e.target.value)} required className="h-11 pl-10" placeholder="seu@email.com ou 000.000.000-00" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-medium" disabled={loading}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : 'Enviar instruções'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

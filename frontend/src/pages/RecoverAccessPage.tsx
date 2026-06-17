import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

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
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono relative overflow-hidden">
      <PublicHeader />

      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 flex flex-col justify-center items-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-surface/60 backdrop-blur-xl border border-hairline rounded-3xl p-8 shadow-2xl"
        >
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 border border-brand/20">
                <CheckCircle className="w-8 h-8 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">E-mail enviado!</h2>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Link to="/login">
                <button className="w-full bg-secondary border border-border text-foreground font-bold py-3.5 rounded-xl hover:bg-secondary/80 transition-all">
                  VOLTAR AO LOGIN
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Recuperar acesso</h1>
                <p className="text-xs text-muted-foreground">Informe seu e-mail ou documento para receber as instruções.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">E-mail ou CPF/CNPJ</span>
                  <div className="mt-2 relative flex items-center rounded-xl border border-hairline bg-background focus-within:border-brand/50 transition-colors">
                    <span className="pl-4 text-muted-foreground"><Mail className="w-4 h-4" /></span>
                    <input
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="seu@email.com ou 000.000.000-00"
                      className="w-full bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
                    />
                  </div>
                </label>
                
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-brand text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "ENVIAR INSTRUÇÕES"}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                Lembrou a senha? <Link to="/login" className="text-brand font-bold hover:underline">Fazer login</Link>
              </p>
            </>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

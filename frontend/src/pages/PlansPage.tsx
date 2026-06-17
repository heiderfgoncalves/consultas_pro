import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Shield, Building, User, CheckCircle, Loader2, Lock, BarChart3, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/api';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  userLimit: number;
  extraUserPrice: string;
  extraUserBlock: number;
  allowWhiteLabel: boolean;
  description: string;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/painel/assinatura', { replace: true });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState(500);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingLead, setSendingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        if (user) {
          const subData = await apiRequest<any>('/subscriptions/me');
          setUserSubscription(subData);
        }
      } catch (error) {
        console.error('Erro ao buscar planos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const calculateCompanyPrice = () => {
    const basePrice = 599.90;
    if (selectedUsers <= 500) return basePrice;
    const extraBlocks = Math.ceil((selectedUsers - 500) / 100);
    return basePrice + extraBlocks * 99.90;
  };

  const handleSubscribe = async (planSlug: string) => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/planos', selectedPlan: planSlug } });
      return;
    }
    try {
      setLoading(true);
      await apiRequest<any>('/subscriptions/subscribe', { method: 'POST', body: JSON.stringify({ planSlug }) });
      const subData = await apiRequest<any>('/subscriptions/me');
      setUserSubscription(subData);
      navigate('/painel/assinatura');
    } catch (error: any) {
      alert(error.message || 'Falha ao assinar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingLead(true);
    try {
      await apiRequest<any>('/plans/contact', {
        method: 'POST',
        body: JSON.stringify({ name: contactName, email: contactEmail, phone: contactPhone, companyName: contactCompany, message: contactMessage }),
      });
      setLeadSuccess(true);
      setTimeout(() => {
        setShowContactForm(false); setLeadSuccess(false); setContactName(''); setContactEmail(''); setContactPhone(''); setContactCompany(''); setContactMessage('');
      }, 3000);
    } catch (error: any) {
      alert(error.message || 'Erro ao enviar contato. Tente novamente.');
    } finally {
      setSendingLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono relative overflow-hidden">
      <PublicHeader />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern ripple-grid-mask pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[350px] bg-brand/10 blur-[120px] rounded-full pointer-events-none z-0" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 z-10 flex flex-col items-center justify-center">
        
        <section className="text-center w-full max-w-4xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand/10 border border-brand/20 text-[10px] font-bold uppercase tracking-widest text-brand mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> ALTO PADRÃO DE DESENVOLVIMENTO
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight mb-6"
          >
            Por que contratar a <span className="brand-text">Consultas PRO?</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Não somos apenas mais um sistema de consulta. Oferecemos <strong>gráficos avançados</strong>, <strong>gestão de saldo unificada</strong> para equipes, e os <strong>templates mais bonitos</strong> e organizados do mercado. Informação 100% online, segura, fiel e revisada constantemente.
          </motion.p>
        </section>

        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          
          {/* PLAN 1: INDIVIDUAL */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface/30 backdrop-blur-md rounded-2xl p-8 flex flex-col justify-between border border-hairline hover:border-brand/30 transition-all duration-300 relative group shadow-sm hover:shadow-xl"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="p-3 bg-brand/10 rounded-xl text-brand border border-brand/20">
                  <User className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Individual</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">Acesso pessoal com consultas ilimitadas fazendo recargas de saldos avulsos por conta própria.</p>
              
              <div className="flex items-baseline gap-1 mb-6 border-b border-hairline pb-6">
                <span className="text-4xl font-black">Grátis</span>
                <span className="text-muted-foreground text-xs">/sem assinatura</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-xs">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>1 Usuário Operador</span>
                </li>
                <li className="flex items-center gap-3 text-xs">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Recargas de saldo diretas</span>
                </li>
                <li className="flex items-center gap-3 text-xs text-muted-foreground/50 line-through">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                  <span>White-Label</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => handleSubscribe('individual-free')}
              className="w-full py-3.5 rounded-lg text-xs font-bold transition-all bg-secondary border border-border hover:bg-secondary/80 text-foreground"
            >
              COMEÇAR GRÁTIS
            </button>
          </motion.div>

          {/* PLAN 2: EMPRESA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-[1px] relative flex shadow-2xl bg-gradient-to-b from-brand/50 to-brand/10"
          >
            <div className="bg-background rounded-2xl p-8 flex flex-col justify-between w-full h-full relative">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="p-3 bg-brand/10 rounded-xl text-brand border border-brand/20">
                    <Building className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-brand px-2 py-1 bg-brand/10 rounded-full">MAIS ESCOLHIDO</span>
                </div>
                
                <h3 className="text-xl font-bold tracking-tight mb-2">Empresa Premium</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-6">Gestão completa de equipes e faturamento unificado. Templates premium e gráficos online.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">
                    R$ {calculateCompanyPrice().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted-foreground text-xs">/mês</span>
                </div>

                <div className="bg-surface/50 border border-hairline rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-2">
                    <span>OPERADORES:</span>
                    <span className="text-brand">{selectedUsers} users</span>
                  </div>
                  <input 
                    type="range" min="50" max="2000" step="50"
                    value={selectedUsers} 
                    onChange={(e) => setSelectedUsers(Number(e.target.value))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer spectral-slider"
                  />
                  {selectedUsers > 500 && (
                    <div className="mt-3 text-center text-[10px] text-brand bg-brand/5 py-1 px-2 rounded border border-brand/10">
                      + R$ 99,90/mês a cada 100 usuários
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8 border-t border-hairline pt-6">
                  <li className="flex items-center gap-3 text-xs">
                    <Check className="w-4 h-4 text-brand flex-shrink-0" />
                    <span>Gestão Unificada de Saldo</span>
                  </li>
                  <li className="flex items-center gap-3 text-xs">
                    <Check className="w-4 h-4 text-brand flex-shrink-0" />
                    <span>Dashboard de Gráficos</span>
                  </li>
                  <li className="flex items-center gap-3 text-xs">
                    <Check className="w-4 h-4 text-brand flex-shrink-0" />
                    <span>Customização White-Label</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => handleSubscribe('company-premium')}
                className="w-full py-4 rounded-lg text-xs font-bold transition-all bg-brand text-primary-foreground hover:bg-brand/90 hover:scale-[1.01] shadow-lg shadow-brand/20"
              >
                CONTRATAR AGORA
              </button>
            </div>
          </motion.div>

          {/* PLAN 3: PARCEIRO */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface/30 backdrop-blur-md rounded-2xl p-8 flex flex-col justify-between border border-hairline hover:border-brand/30 transition-all duration-300 relative group shadow-sm hover:shadow-xl"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="p-3 bg-brand/10 rounded-xl text-brand border border-brand/20">
                  <Shield className="w-5 h-5" />
                </span>
              </div>
              
              <h3 className="text-xl font-bold tracking-tight mb-2">Parceiro Enterprise</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">Integrações de grande porte que necessitam de sandboxes multitenant.</p>
              
              <div className="flex items-baseline gap-1 mb-6 border-b border-hairline pb-6">
                <span className="text-4xl font-black">Sob Medida</span>
                <span className="text-muted-foreground text-xs">/vendas</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-xs">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Usuários Ilimitados</span>
                </li>
                <li className="flex items-center gap-3 text-xs">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Gerente de contas e SLA</span>
                </li>
                <li className="flex items-center gap-3 text-xs">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Integração de API Direta</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={() => setShowContactForm(true)}
              className="w-full py-3.5 rounded-lg text-xs font-bold transition-all bg-secondary border border-border hover:bg-secondary/80 text-foreground"
            >
              FALAR COM VENDAS
            </button>
          </motion.div>

        </section>

      </main>

      {/* Pop-up Formulário de Contato Lead */}
      <AnimatePresence>
        {showContactForm && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-surface border border-border rounded-2xl p-8 relative shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowContactForm(false)}
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-xs font-bold p-1.5 hover:bg-muted rounded transition"
              >
                ✕ FECHAR
              </button>
              
              <div className="mb-8">
                <div className="inline-flex p-3 bg-brand/10 rounded-xl text-brand border border-brand/20 mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Solicitar Orçamento Parceiro</h3>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">Preencha os dados técnicos da sua empresa para desenharmos uma proposta de alta escala.</p>
              </div>

              {leadSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-brand mb-4" />
                  <h4 className="text-lg font-bold text-foreground mb-2">Solicitação Sincronizada!</h4>
                  <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">Retornaremos via e-mail ou WhatsApp em poucas horas.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase">Nome Completo</label>
                    <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-brand/50 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase">E-mail Corporativo</label>
                      <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-brand/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase">Telefone/WhatsApp</label>
                      <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-brand/50 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase">Mensagem Técnica (Opcional)</label>
                    <textarea rows={3} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-brand/50 transition-all resize-none" />
                  </div>
                  <button type="submit" disabled={sendingLead} className="w-full py-4 mt-2 bg-brand text-primary-foreground rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand/90 transition-all disabled:opacity-50">
                    {sendingLead ? <Loader2 className="w-5 h-5 animate-spin" /> : <>SOLICITAR ORÇAMENTO <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

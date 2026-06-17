import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Shield, 
  MessageSquare, 
  Building, 
  User, 
  Zap,
  CheckCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

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

  // Redireciona usuários logados para a página de assinatura
  useEffect(() => {
    if (user) {
      navigate('/painel/assinatura', { replace: true });
    }
  }, [user, navigate]);

  const [plans, setPlans] = useState<Plan[]>([]);
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

  // Carrega planos e assinatura do usuário logado
  useEffect(() => {
    async function fetchData() {
      try {
        const plansRes = await fetch('/api/plans');
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData.data || []);
        }

        if (user) {
          const subRes = await fetch('/api/subscriptions/me', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
          });
          if (subRes.ok) {
            const subData = await subRes.json();
            setUserSubscription(subData.data);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar planos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Calcula faturamento dinâmico do plano empresa com base nos usuários selecionados no slider
  const calculateCompanyPrice = () => {
    const basePrice = 599.90;
    if (selectedUsers <= 500) {
      return basePrice;
    }
    const extraUsers = selectedUsers - 500;
    const extraBlocks = Math.ceil(extraUsers / 100);
    return basePrice + extraBlocks * 99.90;
  };

  const handleSubscribe = async (planSlug: string) => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/planos', selectedPlan: planSlug } });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ planSlug }),
      });

      if (res.ok) {
        const data = await res.json();
        // Recarrega informações de assinatura
        const subRes = await fetch('/api/subscriptions/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setUserSubscription(subData.data);
        }
        navigate('/painel/assinatura');
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Falha ao assinar plano');
      }
    } catch (error) {
      console.error('Erro ao assinar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingLead(true);
    try {
      const res = await fetch('/api/plans/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          companyName: contactCompany,
          message: contactMessage,
        }),
      });

      if (res.ok) {
        setLeadSuccess(true);
        setTimeout(() => {
          setShowContactForm(false);
          setLeadSuccess(false);
          setContactName('');
          setContactEmail('');
          setContactPhone('');
          setContactCompany('');
          setContactMessage('');
        }, 3000);
      } else {
        alert('Erro ao enviar contato. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar lead:', error);
    } finally {
      setSendingLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start overflow-x-hidden relative bg-grid-pattern ripple-grid-mask">
      
      {/* Luz ambiente de luxo - sem mesh de IA, sutil e focada em oklch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[350px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header técnico minimalista */}
      <header className="w-full max-w-7xl px-6 py-6 flex justify-between items-center z-10 border-b border-hairline bg-background/40 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/painel')}>
          <div className="p-2 bg-brand/10 text-brand rounded-xl border border-brand/20 shadow-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-status" />
          </div>
          <span className="text-lg font-mono font-bold tracking-tight text-foreground">
            CONSULTAS<span className="text-brand">PRO</span>
          </span>
        </div>
        <button 
          onClick={() => navigate(user ? '/painel' : '/login')}
          className="px-4 py-2 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-xs font-mono font-bold transition-all"
        >
          {user ? 'ACESSAR PAINEL' : 'ENTRAR'}
        </button>
      </header>

      {/* Hero Section - Tipografia de grande impacto e whitespace de luxo */}
      <section className="text-center px-6 pt-24 pb-16 z-10 max-w-4xl relative">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted border border-border text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> PLANOS FLEXÍVEIS E ESCALÁVEIS
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-7xl font-black tracking-tight mb-8 text-foreground"
        >
          Preços claros,<br/>
          <span className="brand-text">escala previsível.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto font-mono leading-relaxed"
        >
          Ative sua assinatura mensal para gerenciar saldos, permissões de equipes e White-Label avançado. Sem asteriscos ou taxas ocultas.
        </motion.p>
      </section>

      {/* Plans Pricing Grid - Asymmetric Layout and high-contrast containers */}
      <section className="w-full max-w-7xl px-6 pb-32 z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* PLAN 1: INDIVIDUAL (GRÁTIS) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="hud-frame rounded-2xl p-8 flex flex-col justify-between hover:border-brand/30 transition-all duration-300 relative group"
        >
          <div className="hud-corners">
            <div className="hud-tl" />
            <div className="hud-tr" />
            <div className="hud-bl" />
            <div className="hud-br" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="p-3 bg-brand/5 rounded-xl text-brand border border-hairline flex items-center justify-center">
                <User className="w-5 h-5" />
              </span>
              <span className="eyebrow text-muted-foreground">
                Individual
              </span>
            </div>
            
            <h3 className="text-xl font-mono font-bold tracking-tight text-foreground mb-2">Plano Individual</h3>
            <p className="text-muted-foreground text-xs font-mono leading-relaxed mb-8">Acesso pessoal com consultas ilimitadas fazendo recargas de saldos avulsos por conta própria.</p>
            
            <div className="flex items-baseline gap-1 mb-8 border-b border-hairline pb-6">
              <span className="text-4xl font-black text-foreground">Grátis</span>
              <span className="text-muted-foreground text-xs font-mono">/sem assinatura</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>1 Usuário Operador</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Recargas de saldo diretas</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Histórico de consultas completo</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-muted-foreground/50 line-through">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                <span>Customização White-Label</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-muted-foreground/50 line-through">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                <span>Criação de Equipe/Subcontas</span>
              </li>
            </ul>
          </div>

          <button 
            onClick={() => handleSubscribe('individual-free')}
            disabled={userSubscription?.subscription?.plan?.slug === 'individual-free'}
            className={`w-full py-3.5 rounded-lg font-mono text-xs font-bold transition-all border ${
              userSubscription?.subscription?.plan?.slug === 'individual-free'
                ? 'bg-brand/10 border-brand/20 text-brand cursor-default flex items-center justify-center gap-2'
                : 'bg-secondary border-border hover:bg-secondary/80 text-foreground'
            }`}
          >
            {userSubscription?.subscription?.plan?.slug === 'individual-free' ? (
              <>PLANO ATIVO <Check className="w-4 h-4" /></>
            ) : (
              <>COMEÇAR GRÁTIS</>
            )}
          </button>
        </motion.div>

        {/* PLAN 2: EMPRESA (PREMIUM) - Com o magic border rotativo do Compozy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="magic-border-container rounded-2xl p-[1px] relative flex shadow-2xl"
        >
          <div className="hud-frame rounded-2xl p-8 flex flex-col justify-between w-full h-full relative">
            <div className="hud-corners">
              <div className="hud-tl" />
              <div className="hud-tr" />
              <div className="hud-bl" />
              <div className="hud-br" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-8">
                <span className="p-3 bg-brand/10 rounded-xl text-brand border border-brand/20 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </span>
                <span className="eyebrow text-brand font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> Empresa Premium
                </span>
              </div>
              
              <h3 className="text-xl font-mono font-bold tracking-tight text-foreground mb-2">Plano Empresa</h3>
              <p className="text-muted-foreground text-xs font-mono leading-relaxed mb-8">Gestão completa de equipes e faturamento unificado. Perfeito para escalar operações e white-label.</p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-foreground">
                  R$ {calculateCompanyPrice().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground text-xs font-mono">/mês</span>
              </div>

              {/* Slider Espectral do Compozy */}
              <div className="bg-background/80 border border-hairline rounded-xl p-4 mb-8">
                <div className="flex justify-between text-[11px] font-mono font-bold text-muted-foreground mb-2">
                  <span>LIMITE DE OPERADORES:</span>
                  <span className="text-brand">{selectedUsers} users</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="2000" 
                  step="50"
                  value={selectedUsers} 
                  onChange={(e) => setSelectedUsers(Number(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer spectral-slider"
                />
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60 mt-1.5">
                  <span>50</span>
                  <span>500 (Base)</span>
                  <span>1.000</span>
                  <span>2.000</span>
                </div>
                {selectedUsers > 500 && (
                  <div className="mt-3 text-center text-[10px] font-mono text-brand bg-brand/5 py-1 px-2 rounded border border-brand/10">
                    + R$ 99,90/mês a cada 100 usuários extras
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-8 border-t border-hairline pt-6">
                <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Até 500 usuários inclusos (escalável)</span>
                </li>
                <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Distribuição flexível de saldos</span>
                </li>
                <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Customização White-Label inclusa</span>
                </li>
                <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Logs de Auditoria de empresa</span>
                </li>
                <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span>Suporte corporativo dedicado</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={() => handleSubscribe('company-premium')}
              disabled={userSubscription?.subscription?.plan?.slug === 'company-premium'}
              className={`w-full py-4 rounded-lg font-mono text-xs font-bold transition-all ${
                userSubscription?.subscription?.plan?.slug === 'company-premium'
                  ? 'bg-brand/10 border border-brand/20 text-brand cursor-default flex items-center justify-center gap-2'
                  : 'bg-brand text-primary-foreground hover:bg-brand/90 hover:scale-[1.01] shadow-lg shadow-brand/10'
              }`}
            >
              {userSubscription?.subscription?.plan?.slug === 'company-premium' ? (
                <>PLANO ATIVO <Check className="w-4 h-4" /></>
              ) : (
                <>CONTRATAR AGORA</>
              )}
            </button>
          </div>
        </motion.div>

        {/* PLAN 3: PARCEIRO (ENTERPRISE) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="hud-frame rounded-2xl p-8 flex flex-col justify-between hover:border-brand/30 transition-all duration-300 relative group"
        >
          <div className="hud-corners">
            <div className="hud-tl" />
            <div className="hud-tr" />
            <div className="hud-bl" />
            <div className="hud-br" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="p-3 bg-brand/5 rounded-xl text-brand border border-hairline flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </span>
              <span className="eyebrow text-muted-foreground">
                Enterprise
              </span>
            </div>
            
            <h3 className="text-xl font-mono font-bold tracking-tight text-foreground mb-2">Plano Parceiro</h3>
            <p className="text-muted-foreground text-xs font-mono leading-relaxed mb-8">Foco em parceiros comerciais, franquias ou integradores de grande porte que necessitam de sandboxes multitenant.</p>
            
            <div className="flex items-baseline gap-1 mb-8 border-b border-hairline pb-6">
              <span className="text-4xl font-black text-foreground">Sob Medida</span>
              <span className="text-muted-foreground text-xs font-mono">/vendas</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Usuários Operadores Ilimitados</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Poder criar "company_admin" e "company_common"</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Templates Drawer e Integrações isoladas</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Gestão financeira e faturamento em cascata</span>
              </li>
              <li className="flex items-center gap-3 text-xs font-mono text-foreground">
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
                <span>Gerente de contas e SLA de 99.9%</span>
              </li>
            </ul>
          </div>

          <button 
            onClick={() => setShowContactForm(true)}
            className="w-full py-3.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-xs font-mono font-bold transition-all text-foreground"
          >
            FALAR COM VENDAS
          </button>
        </motion.div>

      </section>

      {/* Pop-up Formulário de Contato Lead (HUD de luxo) */}
      <AnimatePresence>
        {showContactForm && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-slate-900 border border-border rounded-2xl p-8 relative shadow-2xl overflow-hidden"
            >
              <div className="hud-corners">
                <div className="hud-tl" />
                <div className="hud-tr" />
                <div className="hud-bl" />
                <div className="hud-br" />
              </div>

              <button 
                onClick={() => setShowContactForm(false)}
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-xs font-mono font-bold p-1.5 hover:bg-muted rounded transition"
              >
                ✕ FECHAR
              </button>
              
              <div className="mb-8">
                <div className="inline-flex p-3 bg-brand/10 rounded-xl text-brand border border-brand/20 mb-4">
                  <Shield className="w-5 h-5 animate-status" />
                </div>
                <h3 className="text-xl font-mono font-bold text-foreground">Solicitar Orçamento Parceiro</h3>
                <p className="text-muted-foreground text-xs font-mono mt-1 leading-relaxed">Preencha os dados técnicos da sua franquia ou empresa para desenharmos uma proposta de alta escala.</p>
              </div>

              {leadSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="p-4 bg-brand/10 text-brand rounded-full mb-4 border border-brand/20 animate-bounce">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-mono font-bold text-foreground mb-2">Solicitação Sincronizada!</h4>
                  <p className="text-muted-foreground text-xs font-mono max-w-xs leading-relaxed">Dados integrados com o setor comercial. Retornaremos via e-mail ou WhatsApp em poucas horas.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-muted-foreground mb-1.5 uppercase">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Ex: Cláudio Tomich"
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 transition-all font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-muted-foreground mb-1.5 uppercase">E-mail Corporativo</label>
                      <input 
                        type="email" 
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Ex: claudio@empresa.com"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-muted-foreground mb-1.5 uppercase">Telefone/WhatsApp</label>
                      <input 
                        type="text" 
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Ex: (31) 99999-9999"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-muted-foreground mb-1.5 uppercase">Nome da Empresa</label>
                    <input 
                      type="text" 
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Ex: MMVI Consultoria"
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-muted-foreground mb-1.5 uppercase">Mensagem Técnica (Opcional)</label>
                    <textarea 
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Fale brevemente sobre o volume mensal de consultas cadastrais ou de crédito planejado..."
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 transition-all resize-none font-mono"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={sendingLead}
                    className="w-full py-4 mt-2 bg-brand text-primary-foreground rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand/90 transition-all disabled:opacity-50"
                  >
                    {sendingLead ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>SOLICITAR ORÇAMENTO <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

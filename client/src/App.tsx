import React, { useState, useMemo } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import {
  TrendUp as TrendingUp,
  TrendUp,
  Clock,
  Calendar,
  Check,
  ShoppingCart,
  ShoppingBag,
  Cpu,
  Terminal,
  ForkKnife,
  MapPin,
  User,
  Star,
  CaretRight,
  Plus
} from '@phosphor-icons/react';

export default function App() {
  const [activeTab, setActiveTab] = useState(['Portfólio', 'Investimentos', 'Transferências'][0]);
  const [items, setItems] = useState([
      { id: 1, name: 'Renda Fixa IPCA+ Premium', price: '12.4% a.a.', desc: 'Títulos corporativos indexados à inflação com proteção de capital e liquidez semestral.', tag: 'Seguro' },
      { id: 2, name: 'Fundo Global Equity Tech', price: '21.8% a.a.', desc: 'Alocação ativa em empresas líderes de tecnologia e IA de ponta com rebalanceamento mensal.', tag: 'Crescimento' },
      { id: 3, name: 'Ativos Privados Real Estate', price: '9.5% a.a.', desc: 'Aluguéis comerciais AAA em áreas metropolitanas premium com isenção fiscal.', tag: 'Proventos' }, { id: 99, name: 'Novo Item Customizado', price: 'Ativo', desc: 'Novo recurso ou produto adicionado sob demanda em tempo real de acordo com as instruções do usuário.', tag: 'Novidade' }
    ]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem dinâmica de lista
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, items]);


      const [contribution, setContribution] = useState(1000);
      const [term, setTerm] = useState(12);
      const interestRate = 0.012; // 1.2% ao mês

      const totalSimulated = useMemo(() => {
        let total = 0;
        for (let i = 0; i < term; i++) {
          total = (total + contribution) * (1 + interestRate);
        }
        return Math.round(total);
      }, [contribution, term]);

      const widgetJSX = (
        <section className="p-6 rounded-3xl bg-white/[0.02] border border-slate-800 space-y-4 shadow-2xl backdrop-blur-md">
          <h3 className="text-sm font-bold flex items-center gap-2 text-white">
            <TrendUp size={16} /> Simulador de Acúmulo de Capital
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] mb-1 opacity-75 uppercase tracking-wider font-mono">
                <span>Aporte Mensal</span>
                <span className="font-bold text-white">R$ {contribution.toLocaleString('pt-BR')}</span>
              </div>
              <input type="range" min="100" max="10000" step="100" value={contribution} onChange={e => setContribution(Number(e.target.value))} className="w-full accent-white cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1 opacity-75 uppercase tracking-wider font-mono">
                <span>Prazo de Simulação</span>
                <span className="font-bold text-white">{term} meses</span>
              </div>
              <input type="range" min="6" max="60" step="6" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full accent-white cursor-pointer" />
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs opacity-75 uppercase tracking-wider font-mono">Total Estimado:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">R$ {totalSimulated.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </section>
      );


  return (
    <div
      className="min-h-full w-full font-sans p-6 sm:p-10 flex flex-col relative select-none animate-in duration-300"
      style={{
        backgroundColor: '#060913',
        color: '#E2E8F0',
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.015) 0%, transparent 40%)'
      }}
    >
      <div className="max-w-5xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-between">

        {/* Header Seção com Design Glassmorphic */}
        <header className="p-6 rounded-3xl bg-white/[0.02] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-white/10 to-white/5 p-0.5 shadow-xl border border-white/10">
              <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center text-white">
                <PhosphorIcons.CreditCard size={22} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">Nexa Wealth Management</h1>
                <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded bg-white/5 text-white border border-white/10 font-mono">
                  Active Seed #4176141248
                </span>
              </div>
              <p className="text-xs opacity-75">Gestão avançada de patrimônio e investimentos globais de alta performance</p>
            </div>
          </div>

          {/* Menu de Abas */}
          <div className="flex items-center gap-1.5 p-1.5 bg-black/30 rounded-2xl border border-slate-800">
            {['Portfólio', 'Investimentos', 'Transferências'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-black shadow-lg shadow-white/5'
                    : 'opacity-60 hover:opacity-100 text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Corpo Principal split: Bento Grids & Simulators */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">

          {/* Seção Esquerda: Catálogo interativo e dinâmico */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-85 font-mono">Catálogo de Serviços Integrados</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 w-32 sm:w-44 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="p-5 rounded-3xl bg-white/[0.01] border border-slate-800 space-y-2.5 hover:border-white/10 transition-all duration-300 relative overflow-hidden group shadow-md hover:-translate-y-0.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold uppercase bg-white/5 text-white border border-white/10 px-2.5 py-1 rounded-full font-mono">
                        {item.tag}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2.5">{item.name}</h3>
                    </div>
                    {typeof item.price === 'number' ? (
                      <span className="text-xs font-bold text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">R$ {item.price}</span>
                    ) : (
                      <span className="text-xs font-bold text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{item.price}</span>
                    )}
                  </div>
                  <p className="text-xs opacity-70 leading-relaxed">{item.desc}</p>


                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-xs opacity-50 bg-black/10 border border-slate-800 rounded-3xl">Nenhum item corresponde aos critérios de pesquisa.</div>
              )}
            </div>
          </div>

          {/* Seção Direita: Widget interativo que simula ações reais */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-85 font-mono">Simulação Interativa Reativa</h2>
            {widgetJSX}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-5 rounded-3xl bg-black/10 border border-slate-800 text-[10px] opacity-60 flex items-center justify-between font-mono">
          <span>© {new Date().getFullYear()} Nexa Wealth Management · All Rights Reserved</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kvant Sandbox Execution Mode Active</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

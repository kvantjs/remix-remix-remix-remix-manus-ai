import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendUp,
  TrendUp as TrendingUp, 
  Eye, 
  EyeSlash, 
  ShieldCheck, 
  Plus, 
  MagnifyingGlass, 
  Sparkle, 
  Check, 
  Wallet,
  PiggyBank
} from '@phosphor-icons/react';

export default function AuraFintechApp() {
  const [balance, setBalance] = useState(148520.45);
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'invest'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [investmentMonths, setInvestmentMonths] = useState(24);

  const simulatedTotal = useMemo(() => {
    let total = balance * 0.4;
    const monthlyRate = Math.pow(1 + 0.125, 1 / 12) - 1;
    for (let i = 0; i < investmentMonths; i++) {
      total = (total + monthlyContribution) * (1 + monthlyRate);
    }
    return total;
  }, [balance, monthlyContribution, investmentMonths]);

  const [transactions, setTransactions] = useState([
    { id: 1, title: 'Dividendo ETF Vanguard All-World', category: 'invest', type: 'income', amount: 3420.00, date: 'Hoje, 14:22' },
    { id: 2, title: 'Stripe SaaS Payout Global', category: 'income', type: 'income', amount: 18500.00, date: 'Ontem, 09:15' },
    { id: 3, title: 'Apple Store Inc. (MacBook M3 Max)', category: 'expense', type: 'expense', amount: 24999.00, date: '02 Out, 18:30' },
    { id: 4, title: 'Aporte Tesouro IPCA+ 2035', category: 'invest', type: 'invest', amount: 5000.00, date: '30 Set, 11:00' }
  ]);

  const handleSendTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(transferAmount);
    if (!val || val <= 0 || val > balance) return;

    setBalance(prev => prev - val);
    const newTx = {
      id: Date.now(),
      title: 'Pix para ' + (transferRecipient || 'Beneficiário'),
      category: 'expense',
      type: 'expense',
      amount: val,
      date: 'Hoje, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTransactions(prev => [newTx, ...prev]);
    setTransferSuccess(true);
    setTimeout(() => {
      setTransferSuccess(false);
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferRecipient('');
    }, 1200);
  };

  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? 'US$' : '€';

  return (
    <div className="min-h-screen bg-[#070D0B] text-[#E1EBE6] font-sans selection:bg-emerald-500/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-emerald-900/30">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-[#08130F] rounded-[14px] flex items-center justify-center text-emerald-400">
                <Sparkle size={22} weight="fill" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">AURA CAPITAL</h1>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Private Banking
                </span>
              </div>
              <p className="text-xs text-emerald-400/60 font-mono">Conta Private Global · ID #849-2026</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-[#0D1A14] border border-emerald-900/40 rounded-xl p-1 text-xs font-semibold">
              {(['BRL', 'USD', 'EUR'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    currency === c ? 'bg-emerald-500 text-black shadow-md' : 'text-emerald-300/60 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus size={16} weight="bold" />
              <span>Novo Pix / TED</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-800/30 p-6 sm:p-7 shadow-2xl flex flex-col justify-between" style={{ backgroundColor: '#222222' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/60 flex items-center gap-1.5">
                  <Wallet size={16} className="text-emerald-400" />
                  Patrimônio Líquido Disponível
                </span>
                <button onClick={() => setShowBalance(!showBalance)} className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-300">
                  {showBalance ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                  {showBalance ? `${currencySymbol} ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••••••••'}
                </span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-0.5">
                  <TrendingUp size={12} /> +18.4% a.a.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-6 mt-4 border-t border-emerald-900/30">
              <button onClick={() => setIsTransferModalOpen(true)} className="p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1.5" style={{ backgroundColor: '#1a1a1a', borderColor: '#1a1a1a', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight size={16} weight="bold" />
                </div>
                <span style={{ borderColor: '#555555' }}>
                  <span style={{ borderColor: '#555555' }} className="text-[11px] font-medium text-emerald-200">Transferir</span>
                </span>
              </button>

              <button onClick={() => setBalance(prev => prev + 1000)} className="p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1.5" style={{ backgroundColor: '#1a1a1a', borderColor: '#1a1a1a', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="size-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <ArrowDownLeft size={16} weight="bold" />
                </div>
                <span className="text-[11px] font-medium text-emerald-200">Depositar</span>
              </button>

              <button onClick={() => setFilter('invest')} className="p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1.5" style={{ backgroundColor: '#1a1a1a', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2e2e2e' }}>
                <div className="size-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <TrendingUp size={16} weight="bold" />
                </div>
                <span className="text-[11px] font-medium text-emerald-200">Investir</span>
              </button>

              <button onClick={() => setFilter('all')} className="p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1.5" style={{ backgroundColor: '#1a1a1a', borderColor: '#1a1a1a', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                  <CreditCard size={16} weight="bold" />
                </div>
                <span className="text-[11px] font-medium text-emerald-200">Extrato</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-tr from-[#0F241C] via-[#0A1B14] to-[#05110D] border border-emerald-800/40 p-6 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">Aura Black Metal</span>
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div className="my-5 space-y-3 font-mono">
              <p className="text-base text-white tracking-widest font-semibold">•••• •••• •••• 9842</p>
              <div className="flex justify-between text-[11px] text-emerald-300/60">
                <span>VALIDADE: 09/31</span>
                <span>CVV: 712</span>
              </div>
            </div>
            <div className="pt-3 border-t border-emerald-900/30 flex items-center justify-between text-xs">
              <span className="text-white font-medium">CLIENTE PRIVATE</span>
              <span className="font-bold text-emerald-400">Mastercard Black</span>
            </div>
          </div>
        </div>

        {/* Compound Interest Simulator */}
        <div className="rounded-3xl bg-[#091510] border border-emerald-800/30 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PiggyBank size={18} className="text-emerald-400" />
                Simulador Dinâmico de Juros Compostos
              </h2>
              <p className="text-xs text-emerald-400/50">Projeção a 12.5% a.a. líquida</p>
            </div>
            <span className="text-xl font-extrabold text-emerald-300 font-mono">
              {currencySymbol} {simulatedTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#0C1E17] p-4 rounded-2xl border border-emerald-900/40 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-300/80">Aporte Mensal:</span>
                <span className="text-emerald-400 font-mono font-bold">{currencySymbol} {monthlyContribution}</span>
              </div>
              <input type="range" min="200" max="10000" step="100" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" />
            </div>
            <div className="bg-[#0C1E17] p-4 rounded-2xl border border-emerald-900/40 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-300/80">Horizonte de Tempo:</span>
                <span className="text-emerald-400 font-mono font-bold">{investmentMonths} meses</span>
              </div>
              <input type="range" min="6" max="120" step="6" value={investmentMonths} onChange={e => setInvestmentMonths(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="rounded-3xl bg-[#08140F] border border-emerald-900/30 p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">Extrato em Tempo Real</h3>
          <div className="divide-y divide-emerald-950/60">
            {transactions.map(tx => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">{tx.title}</h4>
                  <span className="text-[10px] text-emerald-400/50 font-mono">{tx.date}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-white/80'}`}>
                  {tx.type === 'income' ? '+' : '-'} {currencySymbol} {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#091510] border border-emerald-800/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-900/40 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkle size={16} className="text-emerald-400" />
                Transferência Pix Aura
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-emerald-400/50 hover:text-white">✕</button>
            </div>
            {transferSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="size-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check size={20} weight="bold" />
                </div>
                <h4 className="text-sm font-bold text-white">Transferência Realizada com Sucesso!</h4>
              </div>
            ) : (
              <form onSubmit={handleSendTransfer} className="space-y-3">
                <div>
                  <label className="text-xs text-emerald-300/70 block mb-1">Destinatário (Chave Pix ou Nome)</label>
                  <input type="text" required placeholder="ex: contato@fintech.io" value={transferRecipient} onChange={e => setTransferRecipient(e.target.value)} className="w-full bg-[#0D1F17] border border-emerald-900/50 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-emerald-300/70 block mb-1">Valor ({currencySymbol})</label>
                  <input type="number" step="0.01" required placeholder="0,00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full bg-[#0D1F17] border border-emerald-900/50 rounded-xl px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-xs text-white/70">Cancelar</button>
                  <button type="submit" className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs">Confirmar Envio</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
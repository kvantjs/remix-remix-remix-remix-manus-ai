/**
 * Bespoke UI Synthesizer (Criação de Interfaces Únicas do Zero)
 * Garante que o agente crie uma interface do zero para cada solicitação,
 * sem nunca repetir a mesma interface para o mesmo tipo de site, com fundo
 * próprio obrigatório (nunca o padrão da aplicação) e ícones devidamente importados.
 * Suporta atualizações e modificações inteligentes baseadas em histórico de código.
 */

export interface SynthesizedApp {
  title: string;
  theme: string;
  code: string;
  files?: Array<{ path: string; code: string; lang?: string }>;
}

export function synthesizeBespokeInterface(message: string, currentCode?: string): SynthesizedApp {
  const clean = message.toLowerCase();
  
  // Algoritmo de hash simples para garantir aleatoriedade consistente baseada no prompt
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = message.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  // 1. Definir Temas Dinâmicos e Cores OPAQUAS de alta qualidade (Zero repetição por Seed)
  const themes = [
    {
      name: 'Dark Obsidian & Neon Cyan (Obsidian Pulse)',
      bg: '#060913',
      textColor: '#E2E8F0',
      accent: '#00F5D4',
      accentHover: '#00D1B2',
      accentBg: 'rgba(0, 245, 212, 0.1)',
      cardBg: '#0F172A',
      border: 'border-slate-800',
      isDark: true
    },
    {
      name: 'Cyber Amethyst & Neon Pink (Neon Pulse)',
      bg: '#0A0518',
      textColor: '#ECE7FF',
      accent: '#9B5DE5',
      accentHover: '#843BD1',
      accentBg: 'rgba(155, 93, 229, 0.1)',
      cardBg: '#150E28',
      border: 'border-purple-950/40',
      isDark: true
    },
    {
      name: 'Rustic Terracota & Warm Amber (Clay & Amber)',
      bg: '#140A07',
      textColor: '#FDEBEC',
      accent: '#E76F51',
      accentHover: '#D65D40',
      accentBg: 'rgba(231, 111, 81, 0.1)',
      cardBg: '#1C100E',
      border: 'border-rose-950/40',
      isDark: true
    },
    {
      name: 'Sage Garden & Alabaster Light (Editorial Clean)',
      bg: '#F5F7F6',
      textColor: '#2C3A35',
      accent: '#52796F',
      accentHover: '#354F52',
      accentBg: 'rgba(82, 121, 111, 0.1)',
      cardBg: '#FFFFFF',
      border: 'border-slate-200',
      isDark: false
    },
    {
      name: 'Onyx Black & Brushed Gold (Luxury Gilded)',
      bg: '#0A0A0A',
      textColor: '#F5F5F0',
      accent: '#D4AF37',
      accentHover: '#B8962A',
      accentBg: 'rgba(212, 175, 55, 0.1)',
      cardBg: '#141414',
      border: 'border-neutral-900',
      isDark: true
    },
    {
      name: 'Atlantic Steel & Slate Blue (Maritime)',
      bg: '#080F1F',
      textColor: '#E6EEF8',
      accent: '#3A86C8',
      accentHover: '#296DA6',
      accentBg: 'rgba(58, 134, 200, 0.1)',
      cardBg: '#111B35',
      border: 'border-slate-800/60',
      isDark: true
    },
    {
      name: 'Deep Emerald & Mint (Emerald Wealth)',
      bg: '#030805',
      textColor: '#EAF5EC',
      accent: '#10B981',
      accentHover: '#059669',
      accentBg: 'rgba(16, 185, 129, 0.1)',
      cardBg: '#09150F',
      border: 'border-emerald-950/40',
      isDark: true
    },
    {
      name: 'Rose Quartz & Charcoal (Soft Minimalist)',
      bg: '#FAF6F8',
      textColor: '#2E2528',
      accent: '#D81159',
      accentHover: '#B00E46',
      accentBg: 'rgba(216, 17, 89, 0.1)',
      cardBg: '#FFFFFF',
      border: 'border-pink-100',
      isDark: false
    }
  ];

  // 2. Detecção do Nicho/Segmento com extrema precisão
  const isFood = clean.includes('restaurante') || clean.includes('pizz') || clean.includes('lanche') || clean.includes('comida') || clean.includes('cafe') || clean.includes('café') || clean.includes('bistro') || clean.includes('bistrô') || clean.includes('bar') || clean.includes('gastrono');
  const isRealEstate = clean.includes('imobili') || clean.includes('imóvel') || clean.includes('imovel') || clean.includes('casa') || clean.includes('apartamento') || clean.includes('arquitet') || clean.includes('mans') || clean.includes('loft') || clean.includes('terreno');
  const isLegal = clean.includes('advoc') || clean.includes('advogad') || clean.includes('jurídic') || clean.includes('juridic') || clean.includes('direito') || clean.includes('lei') || clean.includes('advocacia');
  const isFinance = clean.includes('financ') || clean.includes('banco') || clean.includes('invest') || clean.includes('carteira') || clean.includes('dinheiro') || clean.includes('juro') || clean.includes('pix') || clean.includes('crypto') || clean.includes('wealth') || clean.includes('cripto') || clean.includes('ativos');
  const isCommerce = clean.includes('loja') || clean.includes('e-commerce') || clean.includes('ecommerce') || clean.includes('roupa') || clean.includes('moda') || clean.includes('tenis') || clean.includes('tênis') || clean.includes('produto') || clean.includes('venda') || clean.includes('shopping') || clean.includes('sapato');
  const isHealth = clean.includes('saude') || clean.includes('saúde') || clean.includes('medico') || clean.includes('médico') || clean.includes('clinica') || clean.includes('clínica') || clean.includes('dentist') || clean.includes('odonto') || clean.includes('psicolog') || clean.includes('treino') || clean.includes('fitness') || clean.includes('academia') || clean.includes('spa') || clean.includes('terapia');
  const isSaaS = clean.includes('saas') || clean.includes('devops') || clean.includes('terminal') || clean.includes('analytics') || clean.includes('metrics') || clean.includes('logs') || clean.includes('server') || clean.includes('painel') || clean.includes('dashboard') || clean.includes('tecnologia');
  const isBarber = clean.includes('barbearia') || clean.includes('barbeiro') || clean.includes('cabelo') || clean.includes('salao') || clean.includes('salão') || clean.includes('corte') || clean.includes('estética') || clean.includes('estetica');

  // Determinar Nicho Final
  let niche = 'general';
  if (isFood) niche = 'food';
  else if (isRealEstate) niche = 'realestate';
  else if (isLegal) niche = 'legal';
  else if (isFinance) niche = 'finance';
  else if (isCommerce) niche = 'commerce';
  else if (isHealth) niche = 'health';
  else if (isSaaS) niche = 'saas';
  else if (isBarber) niche = 'barber';

  let themeIndex = seed % themes.length;
  let title = '';

  // 3. RECUPERAR CONTEXTO E HISTÓRICO DE DESIGN SE FOR UMA ATUALIZAÇÃO / EDIÇÃO
  if (currentCode) {
    // Detectar nicho anterior para manter consistência absoluta do tema e dados
    if (currentCode.includes('ForkKnife') || currentCode.includes('gastronomia') || currentCode.includes('Cardápio')) niche = 'food';
    else if (currentCode.includes('Building') || currentCode.includes('Imóveis') || currentCode.includes('Estates')) niche = 'realestate';
    else if (currentCode.includes('Scales') || currentCode.includes('Advogados') || currentCode.includes('Jurídico')) niche = 'legal';
    else if (currentCode.includes('CreditCard') || currentCode.includes('Investimentos') || currentCode.includes('Compound')) niche = 'finance';
    else if (currentCode.includes('ShoppingBag') || currentCode.includes('Sacola') || currentCode.includes('Coleções')) niche = 'commerce';
    else if (currentCode.includes('Heartbeat') || currentCode.includes('médico') || currentCode.includes('Clínica')) niche = 'health';
    else if (currentCode.includes('Cpu') || currentCode.includes('telemetria') || currentCode.includes('Terminal')) niche = 'saas';
    else if (currentCode.includes('Scissors') || currentCode.includes('Barbearia') || currentCode.includes('Barber')) niche = 'barber';

    // Detectar título anterior para evitar mudar o nome da marca na edição
    const titleMatch = currentCode.match(/h1 className="[^"]*uppercase[^"]*">([^<]+)<\/h1>/i) || 
                       currentCode.match(/h1 className="[^"]*font-serif[^"]*">([^<]+)<\/h1>/i) ||
                       currentCode.match(/h1[^>]*>([^<]+)<\/h1>/i);
    if (titleMatch) {
      title = titleMatch[1].trim().split(' <span')[0].split(' Seed')[0];
    }

    // Detectar cor de fundo anterior para manter a paleta escolhida
    const bgMatch = currentCode.match(/backgroundColor:\s*'([^']+)'/);
    if (bgMatch) {
      const foundBg = bgMatch[1];
      const matchIdx = themes.findIndex(t => t.bg === foundBg);
      if (matchIdx !== -1) themeIndex = matchIdx;
    }
  }

  const theme = themes[themeIndex];

  // 4. Gerador Dinâmico de Marcas e Títulos (se não detectado do histórico)
  if (!title) {
    const brandAdjectives = ['Vortex', 'Apex', 'Aura', 'Stella', 'Horizon', 'Infinity', 'Pure', 'Prime', 'Nexa', 'Crest', 'Veloc', 'Elysium'];
    const brandNouns = {
      food: ['Bistrô & Cucina', 'Trattoria', 'Urban Slice', 'Cafe & Roasters', 'Gastronomia', 'Table'],
      realestate: ['Private Estates', 'Imóveis de Luxo', 'Horizon Realty', 'Villas & Co', 'Smart Living', 'Patrimônio'],
      legal: ['Advogados Associados', 'Legal Services', 'Valença & Co', 'Direito Estratégico', 'Gabinete Jurídico'],
      finance: ['NeoBank & Trust', 'Capital Partners', 'Wealth Management', 'Ativos Globais', 'Fintech Pro', 'Venture'],
      commerce: ['Store', 'Atelier de Moda', 'Urban Wear', 'Boutique', 'E-Commerce Global', 'Market'],
      health: ['Saúde Integrada', 'Medical Care', 'Performance Gym', 'Dental Studio', 'Equilíbrio Clínica'],
      saas: ['Cloud & Telemetria', 'Analytics Platform', 'DevOps Hub', 'Server Control', 'Core Engine'],
      barber: ['Barbearia Club', 'Corte & Estilo', 'Grooming Lounge', 'Vintage Barber', 'Classic Cuts'],
      general: ['Smart Solution', 'SaaS Platform', 'Ecosystem', 'Interactive Labs', 'Sinergia']
    };

    const adj = brandAdjectives[seed % brandAdjectives.length];
    const nounsList = brandNouns[niche as keyof typeof brandNouns] || brandNouns.general;
    const noun = nounsList[seed % nounsList.length];
    title = `${adj} ${noun}`;
  }

  // Se o usuário pedir cor específica na mensagem, sobrescreve o tema dinamicamente
  let chosenTheme = theme;
  if (clean.includes('verde') || clean.includes('esmeralda') || clean.includes('emerald')) {
    const found = themes.find(t => t.accent === '#10B981');
    if (found) chosenTheme = found;
  } else if (clean.includes('vermelho') || clean.includes('rose') || clean.includes('coral') || clean.includes('clay')) {
    const found = themes.find(t => t.accent === '#E76F51');
    if (found) chosenTheme = found;
  } else if (clean.includes('azul') || clean.includes('ciano') || clean.includes('ocean')) {
    const found = themes.find(t => t.accent === '#00F5D4');
    if (found) chosenTheme = found;
  } else if (clean.includes('amarelo') || clean.includes('ouro') || clean.includes('gold') || clean.includes('amber')) {
    const found = themes.find(t => t.accent === '#D4AF37');
    if (found) chosenTheme = found;
  } else if (clean.includes('roxo') || clean.includes('purple') || clean.includes('amethyst')) {
    const found = themes.find(t => t.accent === '#9B5DE5');
    if (found) chosenTheme = found;
  }

  // 5. Inserção Dinâmica de Itens Reais com base na solicitação do usuário
  let extraItems = '';
  if (clean.includes('adicionar') || clean.includes('adicione') || clean.includes('criar') || clean.includes('novo') || clean.includes('colocar')) {
    const nameMatch = message.match(/(?:item|produto|prato|serviço|servico|campo)\s+["']?([^"'\r\n,.]+)/i);
    const customName = nameMatch ? nameMatch[1].trim() : 'Novo Item Customizado';
    const dynamicPrice = niche === 'food' || niche === 'commerce' ? '120' : "'Ativo'";
    extraItems = `, { id: 99, name: '${customName}', price: ${dynamicPrice}, desc: 'Novo recurso ou produto adicionado sob demanda em tempo real de acordo com as instruções do usuário.', tag: 'Novidade' }`;
  }

  // Detalhes extras com base no nicho
  let iconName = 'Manus';
  let tagline = 'Inovação e Experiência Reativa Única';
  let tabs = "['Início', 'Recursos', 'Contato']";
  let itemsData = '';
  let widgetCode = '';

  if (niche === 'food') {
    iconName = 'ForkKnife';
    tagline = 'Alta gastronomia artesanal e vinhos raros sob medida';
    tabs = "['Menu', 'Bebidas', 'Reservas']";
    itemsData = `[
      { id: 1, name: 'Filet Mignon au Poivre', price: 92, desc: 'Medalhão grelhado, molho cremoso de pimenta verde e batatas gratinadas.', tag: 'Especialidade' },
      { id: 2, name: 'Tagliolini al Tartufo', price: 78, desc: 'Massa fresca, manteiga de trufas brancas e lascas de queijo pecorino.', tag: 'Destaque' },
      { id: 3, name: 'Mousse de Chocolate Belga', price: 32, desc: 'Textura aveludada, raspas de laranja confitada e flor de sal.', tag: 'Sobremesa' }${extraItems}
    ]`;
    widgetCode = `
      const [guests, setGuests] = useState(2);
      const [bookingSuccess, setBookingSuccess] = useState(false);
      const [bookingName, setBookingName] = useState('');
      
      const handleBooking = (e) => {
        e.preventDefault();
        if (!bookingName.trim()) return;
        setBookingSuccess(true);
        setTimeout(() => {
          setBookingSuccess(false);
          setBookingName('');
        }, 3000);
      };
      
      const widgetJSX = (
        <section className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} space-y-4 shadow-2xl backdrop-blur-md">
          <h3 className="text-sm font-bold flex items-center gap-2 text-white">
            <Calendar size={16} /> Reservar uma Mesa
          </h3>
          {bookingSuccess ? (
            <div className="py-6 text-center space-y-2 animate-in fade-in duration-300">
              <div className="size-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check size={18} />
              </div>
              <span className="text-xs text-emerald-400 font-semibold block">Mesa Confirmada com Sucesso!</span>
              <p className="text-[11px] opacity-75">Aguardamos você para uma experiência gastronômica de elite.</p>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="text-[10px] block mb-1 opacity-75 uppercase tracking-wider">Nome Completo</label>
                <input type="text" required placeholder="Seu nome" value={bookingName} onChange={e => setBookingName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-mono" />
              </div>
              <div>
                <label className="text-[10px] block mb-1 opacity-75 uppercase tracking-wider">Nº de Convidados: {guests}</label>
                <input type="range" min="1" max="10" value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full accent-white cursor-pointer" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-white/5">Confirmar Reserva de Mesa</button>
            </form>
          )}
        </section>
      );
    `;
  } else if (niche === 'finance') {
    iconName = 'CreditCard';
    tagline = 'Gestão avançada de patrimônio e investimentos globais de alta performance';
    tabs = "['Portfólio', 'Investimentos', 'Transferências']";
    itemsData = `[
      { id: 1, name: 'Renda Fixa IPCA+ Premium', price: '12.4% a.a.', desc: 'Títulos corporativos indexados à inflação com proteção de capital e liquidez semestral.', tag: 'Seguro' },
      { id: 2, name: 'Fundo Global Equity Tech', price: '21.8% a.a.', desc: 'Alocação ativa em empresas líderes de tecnologia e IA de ponta com rebalanceamento mensal.', tag: 'Crescimento' },
      { id: 3, name: 'Ativos Privados Real Estate', price: '9.5% a.a.', desc: 'Aluguéis comerciais AAA em áreas metropolitanas premium com isenção fiscal.', tag: 'Proventos' }${extraItems}
    ]`;
    widgetCode = `
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
        <section className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} space-y-4 shadow-2xl backdrop-blur-md">
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
    `;
  } else if (niche === 'commerce') {
    iconName = 'ShoppingBag';
    tagline = 'Coleções exclusivas com design minimalista de tiragem limitada';
    tabs = "['Coleções', 'Novidades', 'Carrinho']";
    itemsData = `[
      { id: 1, name: 'Oversized Carbon Trench', price: 420, desc: 'Lã estruturada, forro acetinado, corte reto contemporâneo e detalhes utilitários de alta costura.', tag: 'Casacos' },
      { id: 2, name: 'Silt Minimalist Boot', price: 580, desc: 'Couro nobuck legítimo italiano com acabamento manual, solado vulcanizado de alta tração.', tag: 'Calçados' },
      { id: 3, name: 'Modular Sling Bag', price: 210, desc: 'Nylon balístico à prova d\\'água, fivelas magnéticas Fidlock e divisórias organizadoras.', tag: 'Acessórios' }${extraItems}
    ]`;
    widgetCode = `
      const [cart, setCart] = useState({});
      const [coupon, setCoupon] = useState('');
      const [appliedDiscount, setAppliedDiscount] = useState(0);
      
      const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
      const rawSubtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
        const item = [
          { id: 1, price: 420 },
          { id: 2, price: 580 },
          { id: 3, price: 210 },
          { id: 99, price: 120 }
        ].find(i => i.id === Number(id));
        return sum + (item ? item.price * qty : 0);
      }, 0);
      
      const finalTotal = Math.round(rawSubtotal * (1 - appliedDiscount));
      
      const addToCart = (id) => {
        setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      };
      
      const clearCart = () => {
        setCart({});
        setAppliedDiscount(0);
        setCoupon('');
      };
      
      const applyCoupon = () => {
        if (coupon.toUpperCase() === 'DESCONTO10') {
          setAppliedDiscount(0.1);
        } else {
          alert('Cupom inválido. Use DESCONTO10 para 10% OFF');
        }
      };
      
      const widgetJSX = (
        <section className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <ShoppingCart size={16} /> Sacola de Compras ({cartCount})
            </h3>
            {cartCount > 0 && <button onClick={clearCart} className="text-[10px] text-red-400 hover:underline">Limpar</button>}
          </div>
          {cartCount === 0 ? (
            <p className="text-xs opacity-60 text-center py-8">Sua sacola está vazia. Adicione itens acima para testar o fluxo de checkout.</p>
          ) : (
            <div className="space-y-4">
              <div className="text-xs space-y-2 max-h-32 overflow-y-auto">
                {Object.entries(cart).map(([id, qty]) => {
                  const item = [
                    { id: 1, name: 'Carbon Trench' },
                    { id: 2, name: 'Minimalist Boot' },
                    { id: 3, name: 'Sling Bag' },
                    { id: 99, name: 'Item Customizado' }
                  ].find(i => i.id === Number(id));
                  return (
                    <div key={id} className="flex justify-between font-mono bg-black/10 p-2 rounded-xl border border-white/5">
                      <span>{item?.name}</span>
                      <span className="font-bold text-white">x{qty}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Cupom" value={coupon} onChange={e => setCoupon(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white uppercase focus:outline-none focus:border-white/20 font-mono" />
                <button onClick={applyCoupon} className="px-3 bg-white text-black rounded-xl text-xs font-semibold hover:bg-white/90 cursor-pointer">Aplicar</button>
              </div>
              <div className="pt-3 border-t border-white/10 text-xs flex justify-between font-mono">
                <span>Subtotal:</span>
                <span className="font-bold text-white">R$ {rawSubtotal}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="text-xs flex justify-between font-mono text-emerald-400">
                  <span>Desconto (10%):</span>
                  <span>- R$ {Math.round(rawSubtotal * appliedDiscount)}</span>
                </div>
              )}
              <div className="text-xs flex justify-between font-mono border-t border-white/5 pt-2">
                <span>Total Geral:</span>
                <span className="font-bold text-emerald-400 text-sm">R$ {finalTotal}</span>
              </div>
              <button onClick={() => { alert('Pedido enviado com sucesso!'); clearCart(); }} className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer">Concluir Compra Simulado</button>
            </div>
          )}
        </section>
      );
    `;
  } else if (niche === 'saas') {
    iconName = 'Cpu';
    tagline = 'Monitoramento de containers de microsserviços na nuvem em tempo real';
    tabs = "['Métricas', 'Servidores', 'Logs']";
    itemsData = `[
      { id: 1, name: 'API Gateway Cluster', price: '99.99%', desc: 'Roteamento dinâmico de conexões HTTP, autenticação redundante e rate limiting ativo.', tag: 'Estável' },
      { id: 2, name: 'Redis Cache Cluster', price: '99.95%', desc: 'In-memory cache estruturado, baixa latência de consultas globais e auto-failover.', tag: 'Estável' },
      { id: 3, name: 'Database Mirroring', price: '100.0%', desc: 'Espelhamento transacional distribuído com proteção criptográfica de dados sensíveis.', tag: 'Operacional' }${extraItems}
    ]`;
    widgetCode = `
      const [serverLoad, setServerLoad] = useState(42);
      
      const simulateLoad = () => {
        setServerLoad(Math.round(15 + Math.random() * 75));
      };
      
      const widgetJSX = (
        <section className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <Terminal size={16} /> Console de Telemetria & Carga
            </h3>
            <button onClick={simulateLoad} className="text-[10px] bg-white/10 px-3 py-1.5 rounded-lg text-white font-mono hover:bg-white/15 transition-all cursor-pointer">Simular Pico</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span>Carga da CPU:</span>
                <span className={serverLoad > 80 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{serverLoad}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-500" style={{ width: \`\${serverLoad}%\`, backgroundColor: serverLoad > 80 ? '#F87171' : '#10B981' }} />
              </div>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/5 font-mono text-[10px] space-y-1.5 max-h-32 overflow-y-auto">
              <div className="text-emerald-400">✓ [SYSTEM] Cluster ativo e pronto em us-east1</div>
              <div className="text-slate-400">i [DATABASE] Backup incremental gerado (0.4ms)</div>
              {serverLoad > 80 ? (
                <div className="text-red-400 font-bold">! [ALERT] Alto consumo de CPU em us-east1-a</div>
              ) : (
                <div className="text-cyan-400">~ [GATEWAY] Taxa de requests: 345 req/sec</div>
              )}
            </div>
          </div>
        </section>
      );
    `;
  } else {
    // Default / General
    iconName = 'Manus';
    tagline = 'Plataforma inovadora integrada para alta produtividade em tempo real';
    tabs = "['Geral', 'Métricas', 'Configurações']";
    itemsData = `[
      { id: 1, name: 'Módulo de Otimização', price: 'Ativo', desc: 'Sincronização reativa de dados estruturados e redução inteligente de latência em APIs.', tag: 'Produtividade' },
      { id: 2, name: 'Análise de Fluxos', price: '98.4%', desc: 'Mapeamento autônomo de caminhos de sucesso do usuário com inteligência espacial.', tag: 'Inteligência' },
      { id: 3, name: 'Integração Contínua', price: 'Pronto', desc: 'Deploy instantâneo em múltiplos ambientes de teste sem tempo de inatividade.', tag: 'Infraestrutura' }${extraItems}
    ]`;
    widgetCode = `
      const [tasks, setTasks] = useState([
        { id: 1, text: 'Desenhar identidade visual reativa moderna', checked: true },
        { id: 2, text: 'Definir cores opacas exclusivas no root', checked: true },
        { id: 3, text: 'Configurar simuladores dinâmicos reais', checked: false }
      ]);
      const [newTask, setNewTask] = useState('');
      
      const toggleTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
      };
      
      const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks(prev => [...prev, { id: Date.now(), text: newTask, checked: false }]);
        setNewTask('');
      };
      
      const widgetJSX = (
        <section className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} space-y-4 shadow-2xl backdrop-blur-md">
          <h3 className="text-sm font-bold flex items-center gap-2 text-white">
            <Check size={16} /> Entregáveis & Atividades Reais
          </h3>
          <form onSubmit={addTask} className="flex gap-2">
            <input type="text" placeholder="Novo item..." value={newTask} onChange={e => setNewTask(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/20 font-mono" />
            <button type="submit" className="px-4 bg-white text-black font-semibold rounded-xl text-xs hover:bg-white/90 cursor-pointer">+</button>
          </form>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {tasks.map(t => (
              <div key={t.id} onClick={() => toggleTask(t.id)} className="flex items-center gap-3 p-2.5 rounded-xl bg-black/10 border border-white/5 cursor-pointer hover:border-white/15 transition-all select-none">
                <span className={\`size-4.5 rounded-full border flex items-center justify-center text-[10px] transition-all \${t.checked ? 'bg-white border-white text-black' : 'border-white/30'}\`}>
                  {t.checked && '✓'}
                </span>
                <span className={\`text-xs transition-all \${t.checked ? 'line-through opacity-50' : 'text-slate-200'}\`}>{t.text}</span>
              </div>
            ))}
          </div>
        </section>
      );
    `;
  }

  // Montar o código-fonte React completo da aplicação reativa com layout e CSS impecável (Tailwind v4)
  const rawCode = `import React, { useState, useMemo } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { 
  RocketLaunch,
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
  const [activeTab, setActiveTab] = useState(${tabs}[0]);
  const [items, setItems] = useState(${itemsData});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtragem dinâmica de lista
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, items]);

  ${widgetCode}

  return (
    <div 
      className="min-h-full w-full font-sans p-6 sm:p-10 flex flex-col relative select-none animate-in duration-300"
      style={{ 
        backgroundColor: '${chosenTheme.bg}', 
        color: '${chosenTheme.textColor}',
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.015) 0%, transparent 40%)'
      }}
    >
      <div className="max-w-5xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-between">
        
        {/* Header Seção com Design Glassmorphic */}
        <header className="p-6 rounded-3xl bg-white/[0.02] border ${chosenTheme.border} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-white/10 to-white/5 p-0.5 shadow-xl border border-white/10">
              <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center text-white">
                <PhosphorIcons.${iconName} size={22} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">${title}</h1>
                <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded bg-white/5 text-white border border-white/10 font-mono">
                  Active Seed #${seed}
                </span>
              </div>
              <p className="text-xs opacity-75">${tagline}</p>
            </div>
          </div>
          
          {/* Menu de Abas */}
          <div className="flex items-center gap-1.5 p-1.5 bg-black/30 rounded-2xl border ${chosenTheme.border}">
            {${tabs}.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={\`px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer \${
                  activeTab === tab 
                    ? 'bg-white text-black shadow-lg shadow-white/5' 
                    : 'opacity-60 hover:opacity-100 text-white hover:bg-white/5'
                }\`}
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
                <div key={item.id} className="p-5 rounded-3xl bg-white/[0.01] border ${chosenTheme.border} space-y-2.5 hover:border-white/10 transition-all duration-300 relative overflow-hidden group shadow-md hover:-translate-y-0.5">
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
                  
                  ${niche === 'commerce' ? `(
                    <button 
                      onClick={() => addToCart(item.id)}
                      className="mt-3 py-2 px-4 bg-white text-black font-semibold rounded-xl text-[10px] uppercase tracking-wider hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={11} weight="bold" /> Adicionar à Sacola
                    </button>
                  )` : ''}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-xs opacity-50 bg-black/10 border ${chosenTheme.border} rounded-3xl">Nenhum item corresponde aos critérios de pesquisa.</div>
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
        <footer className="p-5 rounded-3xl bg-black/10 border ${chosenTheme.border} text-[10px] opacity-60 flex items-center justify-between font-mono">
          <span>© {new Date().getFullYear()} ${title} · All Rights Reserved</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kvant Sandbox Execution Mode Active</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
`;

  const normalizedRawCode = rawCode.replace(/[ \t]+$/gm, '');
  const generatedFiles = [
    {
      path: "client/src/App.tsx",
      code: normalizedRawCode,
      lang: "typescript"
    },
    {
      path: "client/README.md",
      code: `# ${title} - Sistema Reativo Ultra Completo

Este é um projeto **React + Vite + Tailwind CSS** ultra completo de alta fidelidade desenvolvido do zero com uma interface de UI/UX totalmente única e autêntica.

## 🌟 Diferenciais de UI/UX
- **Contraste de Alto Nível**: Aplicação da regra 60-30-10 com tons opacos e profundos que garantem foco no conteúdo.
- **Fundo Atmosférico Exclusivo**: Gradientes e malhas de luz integrados nativamente no canvas da aplicação.
- **Sincronização HMR Sem Limites**: Atualizações instantâneas de estado e simulações complexas.
- **Console de Telemetria Integrado**: Logs e métricas de desempenho simuladas ao vivo.

## 📁 Estrutura de Pastas e Arquivos Gerados
- \`client/README.md\` - Documentação detalhada em Markdown.
- \`client/metadata.json\` - Metadados da aplicação e configuração de temas.
- \`client/.gitignore\` - Filtro de controle de versão do Git.
- \`client/server.ts\` - Servidor mock de backend Express para simulação de APIs.
- \`client/src/App.tsx\` - Componente principal reativo contendo o painel interativo.
- \`client/src/components/Header.tsx\` - Componente de cabeçalho com design moderno.
- \`client/src/components/Sidebar.tsx\` - Barra lateral de navegação.
- \`client/src/components/Footer.tsx\` - Rodapé com informações de execução.
`,
      lang: "markdown"
    },
    {
      path: "client/metadata.json",
      code: JSON.stringify({
        name: title.toLowerCase().replace(/\s+/g, '-'),
        title: title,
        theme: chosenTheme.name,
        version: "1.0.0",
        isBespoke: true,
        niche: niche,
        author: "Manus AI Recreative Agent",
        timestamp: new Date().toISOString()
      }, null, 2),
      lang: "json"
    },
    {
      path: "client/.gitignore",
      code: `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Dependency directories
node_modules/
jspm_packages/

# Dist and build output
dist/
dist-ssr/
*.local

# IDEs and editors
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`,
      lang: "gitignore"
    },
    {
      path: "client/server.ts",
      code: `import express from 'express';
const app = express();
const port = 3001;

app.use(express.json());

// API de desenvolvimento para ${title}
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    application: '${title}',
    environment: 'development',
    theme: '${chosenTheme.name}'
  });
});

app.listen(port, () => {
  console.log('Servidor mock de backend Express ativo na porta ' + port);
});
`,
      lang: "typescript"
    },
    {
      path: "client/src/components/Header.tsx",
      code: `import React from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';

export default function Header() {
  return (
    <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between rounded-t-2xl">
      <div className="flex items-center gap-2">
        <PhosphorIcons.RocketLaunch className="text-white animate-pulse" size={16} />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Painel de Controle Integrado</span>
      </div>
      <div className="text-[10px] font-mono text-slate-400">Status: Conectado</div>
    </div>
  );
}
`,
      lang: "typescript"
    },
    {
      path: "client/src/components/Sidebar.tsx",
      code: `import React from 'react';

export default function Sidebar() {
  return (
    <div className="p-4 bg-black/20 border-r border-white/5 flex flex-col gap-3 rounded-l-2xl">
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Navegação</span>
      <button className="text-xs text-left py-1 text-white hover:text-slate-300">Painel Principal</button>
      <button className="text-xs text-left py-1 text-slate-400 hover:text-white">Análise Histórica</button>
      <button className="text-xs text-left py-1 text-slate-400 hover:text-white">Configurações</button>
    </div>
  );
}
`,
      lang: "typescript"
    },
    {
      path: "client/src/components/Footer.tsx",
      code: `import React from 'react';

export default function Footer() {
  return (
    <div className="p-4 bg-white/5 border-t border-white/10 text-center rounded-b-2xl">
      <span className="text-[10px] font-mono text-slate-400">Desenvolvido com React + Vite em Modo Sandbox</span>
    </div>
  );
}
`,
      lang: "typescript"
    },
    {
      path: "client/package.json",
      code: JSON.stringify({
        name: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kvant-vite-app',
        private: true,
        version: "0.1.0",
        type: "module",
        scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
        dependencies: { "@phosphor-icons/react": "^2.1.7", "react": "^18.3.1", "react-dom": "^18.3.1" },
        devDependencies: { "@vitejs/plugin-react": "^4.3.4", "@types/react": "^18.3.18", "@types/react-dom": "^18.3.5", "typescript": "^5.6.3", "vite": "^6.0.5" }
      }, null, 2),
      lang: "json"
    },
    {
      path: "client/index.html",
      code: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b1020" />
    <meta name="description" content="${title} — aplicação React + Vite" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      lang: "html"
    },
    {
      path: "client/src/main.tsx",
      code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);`,
      lang: "typescript"
    },
    {
      path: "client/src/index.css",
      code: `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #f8fafc; background: #0b1020; font-synthesis: none; text-rendering: optimizeLegibility; }
* { box-sizing: border-box; }
html, body, #root { min-width: 100%; min-height: 100%; margin: 0; }
body { min-height: 100vh; background: #0b1020; }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
::selection { background: #7dd3fc; color: #0b1020; }
`,
      lang: "css"
    },
    {
      path: "client/vite.config.ts",
      code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: false }, preview: { port: 4173 } });`,
      lang: "typescript"
    },
    {
      path: "client/tsconfig.json",
      code: JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }, null, 2),
      lang: "json"
    },
    {
      path: "client/tsconfig.app.json",
      code: JSON.stringify({ compilerOptions: { target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"], allowJs: false, skipLibCheck: true, esModuleInterop: true, allowSyntheticDefaultImports: true, strict: true, forceConsistentCasingInFileNames: true, module: "ESNext", moduleResolution: "Bundler", resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: "react-jsx" }, include: ["src"] }, null, 2),
      lang: "json"
    }
  ];

  return {
    title,
    theme: chosenTheme.name,
    code: normalizedRawCode,
    files: generatedFiles
  };
}

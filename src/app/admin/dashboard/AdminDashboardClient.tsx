"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BusinessConfig } from '@/types/database.types';
import { businessService } from '@/services/businessService';
import { orderService } from '@/services/orderService';
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { Printer, Store, ArrowRight, Package, CheckCircle2, ChevronRight, BarChart3, ListOrdered, CookingPot, Settings, UtensilsCrossed, AlertCircle, Edit, Search } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { formatDistanceToNow, isToday } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Link from 'next/link';

interface AdminClientProps {
  initialBusinessConfig: BusinessConfig;
}

export default function AdminDashboardClient({ initialBusinessConfig }: AdminClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'visao' | 'kds' | 'menu' | 'config'>('visao');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(initialBusinessConfig.loja_aberta);
  const [orderToPrint, setOrderToPrint] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

  // -- AUTENTICAÇÃO E CHECAGEM --
  useEffect(() => {
    setMounted(true);
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        alert('Acesso Negado. Você não é um administrador.');
        window.location.href = '/';
        return;
      }
      setIsAuthorized(true);
      fetchData();
    };

    checkAdmin();
  }, []);

  const fetchData = async () => {
    try {
      // Pedidos pendentes e ocorrentes hoje
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*)), profiles(nome, telefone), addresses(*)')
        .order('created_at', { ascending: false })
        .limit(100); // Traz os ultimos 100 pra métricas rapidas
        
      if (ordersData) setOrders(ordersData);

      // Produtos
      const prodData = await productService.getAllProductsAdmin();
      if (prodData) setProducts(prodData);
      
    } catch (err) {
      console.error(err);
    }
  };

  // WEBSOCKET REALTIME
  useEffect(() => {
    if (!isAuthorized) return;

    const channel = supabase
      .channel('admin_dashboard')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' }, 
        async (payload) => {
          audioRef.current?.play().catch(() => {});
          
          toast.success('NOVO PEDIDO RECEBIDO!', {
             description: `ID: #${payload.new.id.split('-')[0].toUpperCase()} • R$ ${payload.new.total}`,
             duration: 8000,
             icon: <Store className="w-5 h-5 text-brand-terracota" />
          });
          
          const { data: fullOrder } = await supabase
             .from('orders')
             .select('*, order_items(*, products(*)), profiles(nome, telefone), addresses(*)')
             .eq('id', payload.new.id)
             .single();
             
          if (fullOrder) {
             setOrders(prev => [fullOrder, ...prev]);
          }
        }
      )
      .on(
         'postgres_changes',
         { event: 'UPDATE', schema: 'public', table: 'orders' },
         (payload) => {
           setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o));
         }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthorized]);

  const handleToggleStore = async () => {
    const newVal = !isStoreOpen;
    setIsStoreOpen(newVal); 
    toast.info(newVal ? 'Operação Online!' : 'Operação Descansando', { style: { backgroundColor: newVal ? '#6B7F60' : '#cf4c4c', color: 'white' } });
    try {
      await businessService.updateLojaStatus(newVal);
    } catch {
      setIsStoreOpen(!newVal);
      toast.error('Ocorreu um erro na nuvem.');
    }
  };

  if (!mounted || !isAuthorized) {
    return <div className="min-h-screen bg-brand-creme flex items-center justify-center font-serif text-brand-terracota text-xl">Iniciando Servidor Mestre...</div>;
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen flex bg-brand-creme font-sans overflow-hidden no-print">
        
        {/* Sidebar */}
        <aside className="w-64 bg-neutral-900 text-white flex flex-col shadow-2xl z-20 shrink-0">
           <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full border border-brand-terracota/50 flex items-center justify-center text-brand-terracota bg-neutral-800 mb-3">
                 <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h1 className="font-serif font-bold text-xl tracking-wide text-brand-terracota">Originária</h1>
              <p className="text-[10px] uppercase tracking-widest text-brand-oliva font-bold">Admin C.M.D</p>
           </div>
           
           <nav className="flex-1 p-4 space-y-2 mt-4">
              <SidebarItem icon={<BarChart3 />} label="Visão Geral" active={activeTab === 'visao'} onClick={() => setActiveTab('visao')} />
              <SidebarItem icon={<ListOrdered />} label="KDS & Pedidos" active={activeTab === 'kds'} onClick={() => setActiveTab('kds')} />
              <SidebarItem icon={<CookingPot />} label="Inventário" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
              <SidebarItem icon={<Settings />} label="Ajustes Loja" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
              
              <Link href="/admin/products" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-brand-terracota/80 hover:bg-brand-terracota/10 hover:text-brand-terracota font-bold mt-4 border border-brand-terracota/20">
                 <Edit className="w-5 h-5 text-inherit" />
                 <span>Gestão do Cardápio</span>
              </Link>
           </nav>
           
           <div className="p-4 border-t border-white/10 mt-auto">
              {/* Botão de abrir/fechar global */}
              <div className={`p-4 rounded-2xl flex flex-col gap-3 ${isStoreOpen ? 'bg-brand-oliva/10 border border-brand-oliva/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                 <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Status Operação</span>
                 <div className="flex items-center justify-between">
                    <span className={`font-bold ${isStoreOpen ? 'text-brand-oliva' : 'text-red-400'}`}>{isStoreOpen ? 'ABERTA' : 'FECHADA'}</span>
                    <button 
                      onClick={handleToggleStore} 
                      className={`w-12 h-6 rounded-full relative transition-colors ${isStoreOpen ? 'bg-brand-oliva' : 'bg-red-500/50'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isStoreOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                 </div>
              </div>
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-brand-creme relative">
           {activeTab === 'visao' && <VisaoGeralTab orders={orders} />}
           {activeTab === 'kds' && <KDSTab orders={orders} setOrders={setOrders} onPrint={(o) => { setOrderToPrint(o); setTimeout(() => window.print(), 200); }} />}
           {activeTab === 'menu' && <MenuTab products={products} setProducts={setProducts} />}
           {activeTab === 'config' && <ConfigTab config={initialBusinessConfig} />}
        </main>
      </div>

      {/* --- LAYER DE IMPRESSÃO --- */}
      {orderToPrint && (
         <div className="hidden print-only bg-white text-black text-sm p-4 w-[80mm] mx-auto absolute top-0 left-0">
            <div className="text-center pb-2 border-b border-dashed border-black mb-2">
              <h1 className="font-bold text-xl uppercase font-serif">Originária Cozinha</h1>
              <p className="text-xs">{(new Date(orderToPrint.created_at)).toLocaleString('pt-BR')}</p>
              <p className="font-mono text-lg font-bold mt-1 shrink-0"># {orderToPrint.id.split('-')[0].toUpperCase()}</p>
            </div>

            <div className="mb-2">
               <p className="font-bold">Cliente: {orderToPrint.profiles?.nome}</p>
               <p>WhatsApp: {orderToPrint.profiles?.telefone || 'Não inf.'}</p>
               <p>End: {orderToPrint.addresses?.logradouro}, {orderToPrint.addresses?.numero}</p>
               <p>Bairro: {orderToPrint.addresses?.bairro}</p>
               {orderToPrint.addresses?.referencia && <p>Ref: {orderToPrint.addresses?.referencia}</p>}
            </div>

            <div className="border-t border-b border-dashed border-black py-2 mb-2">
              {orderToPrint.order_items?.map((item: any) => (
                <div key={item.id} className="mb-2">
                   <div className="flex justify-between font-bold">
                     <span>{item.quantidade}x {item.products.nome}</span>
                   </div>
                   {item.observacoes && <p className="text-xs uppercase font-bold border border-black p-1 mt-1 break-words">&gt;&gt; OBS: {item.observacoes}</p>}
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-lg">
               <span>Total:</span>
               <span>R$ {orderToPrint.total}</span>
            </div>
            <p className="mt-1 font-bold text-lg border border-black p-1 mt-2 mb-1">PG: {orderToPrint.tipo_pagamento.toUpperCase()}</p>
            {orderToPrint.troco && <p className="font-bold">Levar troco p/ R$ {orderToPrint.troco}</p>}
         </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// SIDEBAR ITEM
// ----------------------------------------------------
function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
     <button 
       onClick={onClick} 
       className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-brand-terracota text-white font-bold shadow-md' : 'text-neutral-400 hover:bg-white/5 hover:text-white font-medium'}`}
     >
        <div className={active ? 'text-brand-creme' : 'text-inherit'}>{icon}</div>
        <span>{label}</span>
     </button>
  );
}

// ----------------------------------------------------
// TAB 1: VISÃO GERAL
// ----------------------------------------------------
function VisaoGeralTab({ orders }: { orders: any[] }) {
  
  const metrics = useMemo(() => {
    const todayOrders = orders.filter(o => isToday(new Date(o.created_at)) && o.status !== 'cancelado');
    const pendingOrders = orders.filter(o => ['pendente', 'confirmado', 'preparando'].includes(o.status));
    const revenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = todayOrders.length > 0 ? revenue / todayOrders.length : 0;

    return { todayCount: todayOrders.length, revenue, avgTicket, pendingCount: pendingOrders.length };
  }, [orders]);

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 lg:p-12 h-full overflow-y-auto w-full">
      <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-2">Visão Geral Mestre</h2>
      <p className="text-neutral-500 mb-10">Confira o comportamento da cozinha nesta operação de hoje.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
         {/* Metric Card */}
         <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center"><BarChart3 className="w-5 h-5"/></div>
               <span className="font-bold text-neutral-500 text-sm uppercase tracking-widest">Caixa Hoje</span>
            </div>
            <div className="text-3xl font-bold font-sans text-neutral-900">{formatBRL(metrics.revenue)}</div>
         </div>
         {/* Metric Card */}
         <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center"><Package className="w-5 h-5"/></div>
               <span className="font-bold text-neutral-500 text-sm uppercase tracking-widest">Pendentes</span>
            </div>
            <div className="text-3xl font-bold font-sans text-neutral-900">{metrics.pendingCount} <span className="text-sm font-medium text-neutral-400">pedidos de fogo</span></div>
         </div>
         {/* Metric Card */}
         <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-brand-terracota/10 text-brand-terracota rounded-full flex items-center justify-center"><ListOrdered className="w-5 h-5"/></div>
               <span className="font-bold text-neutral-500 text-sm uppercase tracking-widest">Volume (Hoje)</span>
            </div>
            <div className="text-3xl font-bold font-sans text-neutral-900">{metrics.todayCount} <span className="text-sm font-medium text-neutral-400">despachos</span></div>
         </div>
         {/* Metric Card */}
         <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-brand-oliva/10 text-brand-oliva rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5"/></div>
               <span className="font-bold text-neutral-500 text-sm uppercase tracking-widest">Ticket Médio</span>
            </div>
            <div className="text-3xl font-bold font-sans text-neutral-900">{formatBRL(metrics.avgTicket)}</div>
         </div>
      </div>
      
      <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
          <h3 className="font-serif font-bold text-xl text-neutral-900 mb-6">Pedidos Recentes na Superfície</h3>
          <div className="space-y-4">
             {orders.slice(0, 5).map(o => (
               <div key={o.id} className="flex justify-between items-center py-4 border-b border-brand-terracota/5 text-sm">
                  <div className="font-medium max-w-[200px] truncate">{o.profiles?.nome || 'Cliente Oculto'}</div>
                  <div className="text-neutral-500">{formatDistanceToNow(new Date(o.created_at), { locale: ptBR, addSuffix:true })}</div>
                  <div className="bg-[#f0ede6] text-neutral-600 font-bold px-3 py-1 rounded-md text-xs uppercase">{o.status}</div>
                  <div className="font-bold text-brand-terracota">{formatBRL(o.total)}</div>
               </div>
             ))}
             {orders.length === 0 && <div className="text-neutral-400 text-center py-10">Cozinha silenciosa...</div>}
          </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// TAB 2: KDS AVANÇADO
// ----------------------------------------------------
function KDSTab({ orders, setOrders, onPrint }: { orders: any[], setOrders: any, onPrint: (o: any) => void }) {
  const [filter, setFilter] = useState<'ativos' | 'entregues' | 'cancelados'>('ativos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayOrders = orders.filter(o => {
     if (filter === 'ativos') return ['pendente', 'confirmado', 'preparando', 'saiu_entrega'].includes(o.status);
     if (filter === 'entregues') return o.status === 'entregue';
     return o.status === 'cancelado';
  }).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const advanceStatus = async (orderId: string, current: string) => {
    let next = 'pendente';
    if (current === 'pendente') next = 'preparando';
    else if (current === 'preparando') next = 'saiu_entrega';
    else if (current === 'saiu_entrega') next = 'entregue';

    setOrders((prev:any[]) => prev.map(o => o.id === orderId ? { ...o, status: next } : o));
    await orderService.updateOrderStatus(orderId, next);
    toast.success('Pedido foi para: ' + next.toUpperCase());
  }

  const cancelOrder = async (orderId: string) => {
    if(!confirm("Atenção: Tem certeza que deseja CANCELAR este pedido permanentemente?")) return;
    setOrders((prev:any[]) => prev.map(o => o.id === orderId ? { ...o, status: 'cancelado' } : o));
    await orderService.updateOrderStatus(orderId, 'cancelado');
    toast.error('Pedido Cancelado');
  }

  return (
    <div className="h-full flex flex-col w-full p-8 lg:p-12">
       <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-2">Central KDS</h2>
            <p className="text-neutral-500">Expanda a linha (clicando) para ver a comanda completa e imprimir.</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-full shadow-sm border border-brand-terracota/10">
             <button onClick={() => setFilter('ativos')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'ativos' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>Em Andamento</button>
             <button onClick={() => setFilter('entregues')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'entregues' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>Finalizados</button>
             <button onClick={() => setFilter('cancelados')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'cancelados' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>Cancelados</button>
          </div>
       </div>

       <div className="flex-1 overflow-auto bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
          <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-[#f0ede6] text-neutral-600 sticky top-0 z-10">
               <tr>
                 <th className="px-6 py-4 font-bold rounded-tl-[32px]">ID</th>
                 <th className="px-6 py-4 font-bold">Cliente</th>
                 <th className="px-6 py-4 font-bold">Tempo</th>
                 <th className="px-6 py-4 font-bold">Status</th>
                 <th className="px-6 py-4 font-bold">Total</th>
                 <th className="px-6 py-4 font-bold rounded-tr-[32px]">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-brand-terracota/10 text-neutral-800">
               {displayOrders.map(order => {
                  const isExpanded = expandedId === order.id;
                  const btnLabel = order.status === 'pendente' ? 'P/ Fogo' : (order.status === 'preparando' ? 'Despachar' : 'Concluir');
                  return (
                    <React.Fragment key={order.id}>
                       <tr className={`cursor-pointer hover:bg-brand-creme/50 transition-colors ${isExpanded ? 'bg-brand-creme/50' : ''}`} onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                         <td className="px-6 py-4 font-mono font-bold">#{order.id.split('-')[0].toUpperCase()}</td>
                         <td className="px-6 py-4 font-bold">{order.profiles?.nome}</td>
                         <td className="px-6 py-4 text-neutral-500">{formatDistanceToNow(new Date(order.created_at), { locale: ptBR, addSuffix: true })}</td>
                         <td className="px-6 py-4">
                            <span className="bg-brand-terracota/10 text-brand-terracota font-bold px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider">{order.status}</span>
                         </td>
                         <td className="px-6 py-4 font-bold">R$ {order.total}</td>
                         <td className="px-6 py-4">
                             {['pendente', 'preparando', 'saiu_entrega'].includes(order.status) && (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); advanceStatus(order.id, order.status); }}
                                  className="bg-brand-terracota hover:bg-brand-terracota-dark text-white rounded-full px-4 h-8"
                                >
                                  {btnLabel} <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                             )}
                         </td>
                       </tr>
                       
                       {/* Linha Expansível de Detalhes da Comanda */}
                       {isExpanded && (
                          <tr className="bg-[#fcfbf9] border-none shadow-inner">
                            <td colSpan={6} className="px-8 py-6">
                               <div className="flex flex-col lg:flex-row gap-8">
                                  {/* Info Endereço/Cli */}
                                  <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-brand-terracota/10">
                                     <h4 className="font-serif font-bold text-brand-terracota mb-3 flex items-center gap-2"><Store className="w-4 h-4"/> Endereço de Entrega</h4>
                                     <p className="font-medium text-lg">{order.addresses?.logradouro}, {order.addresses?.numero}</p>
                                     <p className="text-neutral-500">{order.addresses?.bairro}</p>
                                     {order.addresses?.referencia && <p className="text-xs text-neutral-400 mt-2">Ref: {order.addresses?.referencia}</p>}
                                     <div className="mt-4 pt-4 border-t border-brand-terracota/10 flex flex-wrap gap-4 text-xs font-bold font-mono">
                                        <span className="bg-neutral-100 p-2 rounded">PAGAMENTO: {order.tipo_pagamento}</span>
                                        {order.troco && <span className="bg-red-50 text-red-600 p-2 rounded">TROCO PARA P/ R$ {order.troco}</span>}
                                        <span className="bg-neutral-100 p-2 rounded">WPP: {order.profiles?.telefone}</span>
                                     </div>
                                  </div>

                                  {/* Itens */}
                                  <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-brand-terracota/10">
                                     <h4 className="font-serif font-bold text-brand-terracota mb-3 flex items-center gap-2"><CookingPot className="w-4 h-4"/> Comanda Itens</h4>
                                     <div className="space-y-4">
                                       {order.order_items?.map((it:any) => (
                                         <div key={it.id}>
                                            <div className="flex items-start gap-2 text-[15px] font-medium">
                                              <span className="text-brand-terracota font-bold">{it.quantidade}x</span>
                                              <span className="whitespace-normal leading-tight">{it.products.nome}</span>
                                            </div>
                                            {it.observacoes && (
                                              <div className="ml-6 mt-1 flex items-start gap-1 text-red-600 bg-red-50 p-2 rounded-xl whitespace-normal leading-tight text-sm">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span className="font-bold">Aviso:</span> {it.observacoes}
                                              </div>
                                            )}
                                         </div>
                                       ))}
                                     </div>
                                  </div>

                                  {/* Sub-Ações */}
                                  <div className="flex flex-col gap-3 justify-center">
                                     <Button variant="outline" className="h-12 rounded-xl text-neutral-600 hover:text-black border-neutral-300" onClick={() => onPrint(order)}>
                                       <Printer className="w-4 h-4 mr-2" /> Print Térmico
                                     </Button>
                                     {order.status !== 'cancelado' && order.status !== 'entregue' && (
                                       <Button variant="destructive" className="h-12 rounded-xl" onClick={() => cancelOrder(order.id)}>
                                          Cancelar Pedido
                                       </Button>
                                     )}
                                  </div>
                               </div>
                            </td>
                          </tr>
                       )}
                    </React.Fragment>
                  )
               })}
             </tbody>
          </table>
          {displayOrders.length === 0 && <div className="text-center py-20 text-neutral-400 font-medium">Nenhum pedido atende a este filtro...</div>}
       </div>
    </div>
  )
}

// ----------------------------------------------------
// TAB 3: INVENTÁRIO (CARDÁPIO)
// ----------------------------------------------------
function MenuTab({ products, setProducts }: { products: any[], setProducts: any }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleStatus = async (id: string, current: boolean) => {
     try {
       const next = !current;
       setProducts((prev:any[]) => prev.map(p => p.id === id ? { ...p, is_available: next } : p));
       await productService.toggleProductAvailability(id, next);
       toast.success(next ? 'Disponível no app!' : 'Ocultado (Esgotado)');
     } catch(e) {
       toast.error("Erro ao alterar dispo.");
     }
  }

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
     <div className="p-8 lg:p-12 w-full h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-2">Engenharia do Cardápio</h2>
            <p className="text-neutral-500">Apagou o fogo? Esgote um item na hora para cortar das vendas do app.</p>
          </div>
          
          <div className="relative">
             <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
             <input 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Busque o prato..."
               className="h-12 pl-12 pr-6 rounded-full border border-brand-terracota/20 outline-none w-full sm:w-80 focus:ring-2 focus:ring-brand-terracota/50"
             />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10 p-2">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-neutral-400 text-xs uppercase tracking-widest border-b border-brand-terracota/10">
                <tr>
                   <th className="px-6 py-5 font-bold">Prato</th>
                   <th className="px-6 py-5 font-bold">Categoria</th>
                   <th className="px-6 py-5 font-bold">Preço Base</th>
                   <th className="px-6 py-5 font-bold text-right">Vitrine Padrão (App)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-terracota/5">
                 {filtered.map(p => (
                   <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#f0ede6] rounded-xl overflow-hidden shrink-0 border border-brand-terracota/10">
                               {p.imagem_url ? <img src={p.imagem_url} alt="X" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-serif text-[8px] text-brand-terracota/50">S/Img</div>}
                            </div>
                            <div className="font-bold text-neutral-900 max-w-[250px] truncate whitespace-normal leading-tight">{p.nome}</div>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-brand-oliva font-bold uppercase text-[11px] tracking-wide">
                         {p.category?.nome || 'Genérico'}
                      </td>
                      <td className="px-6 py-5 font-bold text-brand-terracota text-lg">
                         {formatBRL(p.preco)}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex justify-end pr-4">
                            <button 
                               onClick={() => toggleStatus(p.id, p.is_available)}
                               className={`w-11 h-6 rounded-full relative transition-colors ${p.is_available ? 'bg-brand-terracota' : 'bg-neutral-200'}`}
                            >
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${p.is_available ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                         </div>
                      </td>
                   </tr>
                 ))}
                 {filtered.length === 0 && (
                   <tr>
                      <td colSpan={5} className="text-center py-20 text-neutral-400">Nenhum prato encontrado...</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
     </div>
  );
}

// ----------------------------------------------------
// TAB 4: CONFIGURAÇÕES E BANNER
// ----------------------------------------------------
function ConfigTab({ config }: { config: BusinessConfig }) {
  const [aviso, setAviso] = useState(config.aviso_banner || '');
  const [saving, setSaving] = useState(false);

  // MOCK DE TAXAS DE ENTREGA (Exibe conceito da tela pois backend tabela não possui)
  const [fees, setFees] = useState([
     { name: 'Centro', val: 5 },
     { name: 'Jardins', val: 8 },
     { name: 'Vila Madalena', val: 10 },
     { name: 'Pinheiros', val: 12 },
  ]);

  const saveMensagem = async () => {
    setSaving(true);
    try {
      await supabase.from('business_config').update({ aviso_banner: aviso }).eq('id', config.id);
      toast.success('Mensagem alterada (Clientes verão imediatamente).');
    } catch(e) {
      toast.error('Erro de persistência.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 lg:p-12 w-full h-full overflow-y-auto">
       <div className="mb-10">
         <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-2">Ajustes da Originária</h2>
         <p className="text-neutral-500">Sintonia fina dos parâmetros de operação do aplicativo e delivery.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Box Banner */}
          <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10">
             <h3 className="font-serif font-bold text-xl text-neutral-900 mb-2">Painel Eletrônico (Vitríne)</h3>
             <p className="text-sm text-neutral-500 mb-6">Esta mensagem irá pairar sob o menu para todos os clientes.</p>

             <textarea 
               value={aviso}
               onChange={e => setAviso(e.target.value)}
               placeholder="Ex: Estamos abertos! Peça Rápido."
               className="w-full bg-[#f0ede6]/50 border border-brand-terracota/20 rounded-2xl p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-brand-terracota/50 mb-6 font-sans text-neutral-800 resize-none"
             />

             <Button onClick={saveMensagem} disabled={saving} className="bg-neutral-900 text-white rounded-full h-12 px-8 w-full">
                {saving ? 'Gravando...' : 'Aplicar Faixa Informacional'}
             </Button>
          </div>

          {/* Box Taxas (Simulation conceptual as discussed) */}
          <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/10 opacity-70">
             <div className="flex items-center gap-2 mb-2">
               <h3 className="font-serif font-bold text-xl text-neutral-900">Taxas de Entrega</h3>
               <span className="bg-brand-oliva/10 text-brand-oliva text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Preview Frontend</span>
             </div>
             <p className="text-sm text-neutral-500 mb-6">Modelação visual do módulo logístico de zonas.</p>

             <div className="space-y-3">
                {fees.map((f, i) => (
                  <div key={i} className="flex gap-4 items-center">
                     <input disabled value={f.name} className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-500" />
                     <div className="relative w-32">
                        <div className="absolute left-3 top-3.5 text-xs text-neutral-400">R$</div>
                        <input disabled value={f.val} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-4 py-3 text-sm text-neutral-500" />
                     </div>
                  </div>
                ))}
             </div>
             
             <p className="text-xs text-brand-terracota font-bold flex items-center gap-1 mt-6 bg-brand-terracota/5 p-3 rounded-lg border border-brand-terracota/10">
                <AlertCircle className="w-4 h-4"/> 
                As taxas hoje operam embarcadas internamente (Hardcoded). Solicitável no próximo deploy.
             </p>
          </div>

       </div>
    </div>
  )
}

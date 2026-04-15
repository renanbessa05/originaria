"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Package, Truck, Home, ArrowLeft, ChefHat } from 'lucide-react';
import Link from 'next/link';

const STATUS_STEPS = [
  { id: 'pendente', label: 'Recebido', icon: Package },
  { id: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
  { id: 'preparando', label: 'Em Preparo', icon: ChefHat },
  { id: 'saiu_entrega', label: 'A Caminho', icon: Truck },
  { id: 'entregue', label: 'Entregue', icon: Home },
];

export default function OrderTracking() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Busca status inicial do banco
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantidade,
            preco_unitario,
            products (nome)
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (!error && data) setOrder(data);
      setLoading(false);
    };
    
    fetchOrder();

    // Inscreve no Supabase Realtime (WebSocket) para updates em tempo real!
    const channel = supabase
      .channel(`tracking_${orderId}`)
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${orderId}` 
        }, 
        (payload) => {
          setOrder((prev: any) => ({ ...prev, status: payload.new.status }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
       <div className="min-h-screen bg-brand-creme flex items-center justify-center font-serif text-brand-terracota">
         Localizando o pedido...
       </div>
    );
  }

  if (!order) {
    return (
       <div className="min-h-screen bg-brand-creme flex items-center justify-center font-serif text-brand-terracota">
         Pedido não encontrado na nossa cozinha.
       </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.status) || 0;
  const isCancelled = order.status === 'cancelado';

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div className="min-h-screen bg-brand-creme pb-20 font-sans">
      <header className="bg-white border-b border-brand-terracota/10 px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between mb-10 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-brand-terracota hover:text-[#825b3e] transition font-bold text-sm tracking-wide uppercase group">
           <div className="bg-brand-creme p-1.5 rounded-full group-hover:bg-brand-terracota/10 transition-colors">
              <ArrowLeft className="w-5 h-5" /> 
           </div>
           Cardápio
        </Link>
        <span className="font-serif font-black text-brand-terracota text-xl tracking-tight hidden sm:block">Originária</span>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-full border border-brand-terracota flex items-center justify-center text-brand-terracota bg-white shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            </div>
           <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-neutral-900 mb-2">Acompanhe sua entrega</h1>
           <p className="text-neutral-500 font-medium text-[15px]">Comanda ID: <span className="text-brand-terracota font-bold">#{order.id.split('-')[0].toUpperCase()}</span></p>
        </div>

        {isCancelled ? (
          <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-[32px] text-center shadow-sm mb-10">
            <h2 className="text-2xl font-serif font-bold mb-3">Pedido Cancelado</h2>
            <p className="text-lg">Infelizmente este pedido precisou ser cancelado pela nossa cozinha.</p>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/5 relative mb-10">
             
             {/* Stepper Vertical Container */}
             <div className="relative pl-6 sm:pl-0">
               {/* Linha do lado esquerdo para mobile, ou central p/ Desktop (aqui faremos vertical left pra manter elegância boutique) */}
               <div className="absolute left-[39px] sm:left-[39px] top-6 bottom-10 w-0.5 bg-brand-creme z-0 rounded-full" />
               <motion.div 
                 className="absolute left-[39px] sm:left-[39px] top-6 w-0.5 bg-brand-terracota z-0 rounded-full origin-top"
                 initial={{ height: 0 }}
                 animate={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                 transition={{ duration: 1, ease: "easeInOut" }}
               />
               
               <div className="space-y-8 sm:space-y-12 relative z-10 pl-16">
                 <AnimatePresence>
                   {STATUS_STEPS.map((step, index) => {
                     const isCompleted = index <= currentStepIndex;
                     const isActive = index === currentStepIndex;
                     const isFuture = index > currentStepIndex;
                     const Icon = step.icon;

                     return (
                       <motion.div 
                          key={step.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 }}
                          className="flex items-center gap-6"
                       >
                          {/* Bolinha do Stepper fixa à esquerda */}
                          <div className={`
                            absolute left-0 flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm transition-all duration-700
                            ${isActive ? 'bg-brand-terracota border-brand-terracota/20 text-white scale-110 shadow-[0_0_20px_rgba(156,110,76,0.3)]' : ''}
                            ${isCompleted && !isActive ? 'bg-brand-oliva border-brand-oliva text-white' : ''}
                            ${isFuture ? 'bg-white border-brand-creme text-neutral-300' : ''}
                          `}>
                             <Icon className={`w-5 h-5 ${isFuture ? 'text-neutral-300' : 'text-white'}`} />
                          </div>
                          
                          {/* Conteúdo Textual */}
                          <div className="flex flex-col py-2">
                            <span className={`font-serif text-2xl mb-1 transition-colors duration-500 font-bold ${isActive ? 'text-brand-terracota' : isCompleted ? 'text-neutral-900' : 'text-neutral-300'}`}>
                              {step.label}
                            </span>
                            
                            <AnimatePresence>
                              {isActive && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="text-[13px] text-brand-oliva uppercase tracking-widest font-bold flex items-center gap-2"
                                >
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-oliva opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-oliva"></span>
                                  </span>
                                  Atualizando status
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                       </motion.div>
                     );
                   })}
                 </AnimatePresence>
               </div>
             </div>
          </div>
        )}

        {/* Resumo da Compra Rápido */}
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-brand-terracota/5 text-center">
            <h2 className="text-xl font-serif font-bold text-neutral-900 mb-6 pb-4 border-b border-brand-terracota/10">Resumo da Compra</h2>
            <div className="text-left mb-6">
               {order.order_items.map((item: any, i: number) => (
                 <div key={i} className="flex justify-between items-center text-[15px] mb-3">
                   <span className="text-neutral-800"><span className="text-brand-terracota font-bold mr-2">{item.quantidade}x</span> {item.products.nome}</span>
                   <span className="font-medium">{formatPrice(item.preco_unitario * item.quantidade)}</span>
                 </div>
               ))}
               <div className="flex justify-between items-center text-[15px] mb-3 text-neutral-500">
                   <span>Taxa de Entrega</span>
                   <span className="font-medium">{formatPrice(order.taxa_entrega)}</span>
               </div>
            </div>
            
            <div className="flex flex-col items-center justify-center border-t border-brand-terracota/10 pt-6">
                <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1">Total a Pagar</span>
                <span className="text-4xl font-black text-brand-terracota leading-none">{formatPrice(order.total)}</span>
                {order.tipo_pagamento === 'pix' && (
                  <span className="bg-brand-terracota/10 text-brand-terracota text-xs font-bold px-3 py-1 rounded-full mt-3">Pago via PIX</span>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

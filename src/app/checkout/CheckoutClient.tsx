"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/hooks/useCart';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/database.types';
import { ShoppingBag, ChevronLeft, QrCode, Copy } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const BAIRRO_FEES: Record<string, number> = {
  'Centro': 5.0,
  'Jardins': 8.0,
  'Vila Madalena': 10.0,
  'Pinheiros': 12.0
};

const checkoutSchema = z.object({
  fullName: z.string().min(3, "Nome completo obrigatório"),
  whatsapp: z.string().min(14, "WhatsApp inválido"), // (XX) XXXXX-XXXX = 15 chars approx
  logradouro: z.string().min(5, "Rua obrigatória"),
  numero: z.string().min(1, "Obrigatório"),
  bairro: z.string().min(1, "Obrigatório"),
  referencia: z.string().optional(),
  tipo_pagamento: z.enum(["pix", "cartao", "dinheiro"]),
  troco: z.string().optional(),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

interface Props {
  businessConfig: BusinessConfig;
}

export default function CheckoutClient({ businessConfig }: Props) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // States para PIX
  const [showPixModal, setShowPixModal] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null);

  const cart = useCart();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { tipo_pagamento: 'pix' }
  });

  const watchBairro = watch('bairro');
  const watchTipoPag = watch('tipo_pagamento');
  
  const deliveryFee = BAIRRO_FEES[watchBairro] || 0;
  const totalPrice = cart.totalPrice() + deliveryFee;

  // Aplica máscara de WhatsApp (XX) XXXXX-XXXX
  const applyWhatsappMask = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    return v;
  };

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login';
      } else {
        setUser(user);
        setIsAuthChecking(false);
      }
    });
  }, []);

  if (!mounted || isAuthChecking) {
    return <div className="min-h-screen bg-brand-creme flex items-center justify-center font-serif text-brand-terracota">Preparando a mesa...</div>;
  }

  // Validação Loja Fechada
  if (!businessConfig.loja_aberta) {
    return (
      <div className="min-h-screen bg-brand-creme flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-full border border-brand-terracota flex items-center justify-center text-brand-terracota bg-white shadow-sm">
           <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
        </div>
        <h1 className="text-4xl font-serif font-bold text-brand-terracota mb-4">A Origem Descansa Hoje</h1>
        <p className="text-neutral-600 max-w-md text-lg leading-relaxed mb-8 font-sans">
          Nossa cozinha está temporariamente fechada para novos preparos. Voltamos em breve com nossos pratos exclusivos!
        </p>
        <Link href="/">
          <Button className="bg-brand-terracota text-white hover:bg-brand-terracota-dark rounded-full px-8 h-12 shadow-[0_4px_14px_rgba(156,110,76,0.3)]">
             Ver o Cardápio Seco
          </Button>
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-creme flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-brand-terracota/10">
          <ShoppingBag className="w-16 h-16 text-brand-terracota/30" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-6 text-neutral-900">Sua comanda está vazia</h2>
        <Link href="/">
          <Button className="bg-brand-terracota text-white hover:bg-[#825b3e] rounded-full px-8 h-14 text-base shadow-md">Voltar à Experiência</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Montar payload (Data nula para entrega imediata)
      const payload = {
        p_user_id: user.id,
        p_total: totalPrice,
        p_tipo_pagamento: data.tipo_pagamento,
        p_troco: data.troco ? parseFloat(data.troco) : null,
        p_agendamento_data: null, // Sistema simplificado (Imediato)
        p_logradouro: data.logradouro,
        p_numero: data.numero,
        p_bairro: data.bairro,
        p_referencia: data.referencia || null,
        p_taxa_entrega: deliveryFee,
        p_items: cart.items.map(item => ({
          product_id: item.product.id,
          quantidade: item.quantidade,
          preco_unitario: item.product.preco,
          observacoes: item.observacoes
        }))
      };

      // 2. Executar inserção e baixa de estoque atômicos
      const orderId = await orderService.processCheckout(payload);
      
      cart.clearCart();
      
      // Lógica PIX ou Redirecionamento 
      if (data.tipo_pagamento === 'pix') {
        setGeneratedOrderId(orderId);
        setShowPixModal(true);
      } else {
        window.location.href = `/orders/${orderId}`;
      }
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar seu pedido. O estoque pode estar esgotado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div className="min-h-screen bg-brand-creme pb-20 font-sans">
      <header className="bg-white border-b border-brand-terracota/10 px-4 sm:px-6 lg:px-8 py-5 flex items-center mb-10 sticky top-0 z-10 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-brand-terracota hover:text-[#825b3e] transition font-bold text-sm tracking-wide uppercase group">
           <div className="bg-brand-creme p-1.5 rounded-full group-hover:bg-brand-terracota/10 transition-colors">
              <ChevronLeft className="w-5 h-5" /> 
           </div>
           Alterar Pedido
        </Link>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Formulário */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="mb-10">
               <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-neutral-900 mb-3">Finalizar Comanda</h1>
               <p className="text-neutral-500 text-lg">Seu pedido será preparado com o máximo cuidado.</p>
            </div>
            
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-sm mb-8 font-medium border border-red-100 flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {errorMsg}
              </div>
            )}

            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              
              {/* Delivery Data */}
              <section className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/5">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-brand-terracota/10">
                  <span className="w-8 h-8 rounded-full bg-brand-terracota/10 text-brand-terracota flex items-center justify-center font-bold text-sm">1</span>
                  <h2 className="text-2xl font-serif font-bold text-neutral-900">Seus Dados e Endereço</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Nome Completo</label>
                    <input {...register('fullName')} className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all" placeholder="Como deseja ser chamado?" />
                    {errors.fullName && <span className="text-red-500 text-xs mt-1 block">{errors.fullName.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">WhatsApp</label>
                    <input 
                      {...register('whatsapp')} 
                      onChange={(e) => {
                         const masked = applyWhatsappMask(e.target.value);
                         setValue('whatsapp', masked);
                      }}
                      placeholder="(DD) 90000-0000"
                      className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all" 
                    />
                    {errors.whatsapp && <span className="text-red-500 text-xs mt-1 block">{errors.whatsapp.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-5">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Logradouro / Rua</label>
                    <input {...register('logradouro')} placeholder="Rua do Prato Fundo" className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all" />
                    {errors.logradouro && <span className="text-red-500 text-xs mt-1 block">{errors.logradouro.message}</span>}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Número</label>
                    <input {...register('numero')} placeholder="123" className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all" />
                    {errors.numero && <span className="text-red-500 text-xs mt-1 block">{errors.numero.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                     <label className="block text-sm font-bold text-neutral-700 mb-2">Bairro</label>
                     <div className="relative">
                        <select {...register('bairro')} className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all appearance-none cursor-pointer">
                          <option value="">Onde entregamos?</option>
                          <option value="Centro">Centro</option>
                          <option value="Jardins">Jardins</option>
                          <option value="Pinheiros">Pinheiros</option>
                          <option value="Outro">Outro</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brand-terracota">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                     </div>
                     {errors.bairro && <span className="text-red-500 text-xs mt-1 block">{errors.bairro.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Referência (Opcional)</label>
                    <input {...register('referencia')} placeholder="Perto do antigo teatro..." className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all" />
                  </div>
                </div>
              </section>

              {/* Payment Section */}
              <section className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/5">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-brand-terracota/10">
                  <span className="w-8 h-8 rounded-full bg-brand-terracota/10 text-brand-terracota flex items-center justify-center font-bold text-sm">2</span>
                  <h2 className="text-2xl font-serif font-bold text-neutral-900">Método de Pagamento</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <label className={`border rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${watchTipoPag === 'pix' ? 'border-brand-terracota bg-brand-terracota/5 ring-1 ring-brand-terracota shadow-sm scale-[1.02]' : 'border-neutral-200 hover:border-brand-terracota/40 hover:bg-neutral-50 grayscale-[0.5]'}`}>
                    <input type="radio" value="pix" {...register('tipo_pagamento')} className="sr-only" />
                    <div className={`p-3 rounded-full ${watchTipoPag === 'pix' ? 'bg-brand-terracota text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                       <span className={`block font-bold mb-1 ${watchTipoPag === 'pix' ? 'text-brand-terracota' : 'text-neutral-700'}`}>Pix</span>
                       <span className="text-xs text-neutral-500">Aprovação imediata</span>
                    </div>
                  </label>
                  
                  <label className={`border rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${watchTipoPag === 'cartao' ? 'border-brand-terracota bg-brand-terracota/5 ring-1 ring-brand-terracota shadow-sm scale-[1.02]' : 'border-neutral-200 hover:border-brand-terracota/40 hover:bg-neutral-50 grayscale-[0.5]'}`}>
                    <input type="radio" value="cartao" {...register('tipo_pagamento')} className="sr-only" />
                    <div className={`p-3 rounded-full ${watchTipoPag === 'cartao' ? 'bg-brand-terracota text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <div className="text-center">
                       <span className={`block font-bold mb-1 ${watchTipoPag === 'cartao' ? 'text-brand-terracota' : 'text-neutral-700'}`}>Cartão</span>
                       <span className="text-xs text-neutral-500">Pague na entrega</span>
                    </div>
                  </label>
                  
                  <label className={`border rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${watchTipoPag === 'dinheiro' ? 'border-brand-terracota bg-brand-terracota/5 ring-1 ring-brand-terracota shadow-sm scale-[1.02]' : 'border-neutral-200 hover:border-brand-terracota/40 hover:bg-neutral-50 grayscale-[0.5]'}`}>
                    <input type="radio" value="dinheiro" {...register('tipo_pagamento')} className="sr-only" />
                    <div className={`p-3 rounded-full ${watchTipoPag === 'dinheiro' ? 'bg-brand-terracota text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="text-center">
                       <span className={`block font-bold mb-1 ${watchTipoPag === 'dinheiro' ? 'text-brand-terracota' : 'text-neutral-700'}`}>Dinheiro Vivo</span>
                       <span className="text-xs text-neutral-500">Troco na entrega</span>
                    </div>
                  </label>
                </div>
                
                <AnimatePresence>
                  {watchTipoPag === 'dinheiro' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <label className="block text-sm font-bold text-neutral-700 mb-2">Troco para quanto?</label>
                        <div className="relative w-full sm:w-1/2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-500 font-bold">R$</div>
                          <input type="number" step="0.01" {...register('troco')} placeholder="100.00" className="w-full border border-neutral-200 bg-brand-creme/50 rounded-2xl pl-10 pr-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none transition-all font-sans" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

            </form>
          </div>

          {/* Resumo do Pedido Side (Direita) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/5 sticky top-32">
              <h2 className="text-2xl font-serif font-bold mb-6 pb-4 border-b border-brand-terracota/10">Resumo da Compra</h2>
              
              <div className="space-y-4 mb-8">
                {cart.items.map(item => (
                  <div key={item.cartItemId} className="flex justify-between text-[15px]">
                    <div className="flex-1 flex flex-col pr-4">
                       <span className="text-neutral-800 font-medium font-serif leading-tight">
                         <span className="text-brand-terracota mr-1">{item.quantidade}x</span> {item.product.nome}
                       </span>
                    </div>
                    <span className="font-bold shrink-0">{formatPrice(item.product.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-brand-terracota/10 space-y-3 mb-6 bg-brand-creme/40 p-4 rounded-2xl">
                <div className="flex justify-between text-sm text-neutral-600 font-medium">
                  <span>Subtotal da cesta</span>
                  <span>{formatPrice(cart.totalPrice())}</span>
                </div>
                <div className="flex justify-between text-sm text-neutral-600 font-medium">
                  <span>Entrega ({watchBairro || 'N/A'})</span>
                  <span className="text-brand-oliva font-bold">{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Pendente'}</span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-brand-terracota/10 pt-6 mb-8">
                <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Total Pedido</span>
                <span className="text-4xl font-black text-brand-terracota leading-none">{formatPrice(totalPrice)}</span>
              </div>

              <Button 
                type="submit" 
                form="checkout-form"
                disabled={isSubmitting} 
                className="w-full h-16 text-[15px] font-bold rounded-[24px] bg-brand-terracota hover:bg-[#825b3e] text-white shadow-[0_8px_20px_rgb(156,110,76,0.3)] transition-all flex justify-between items-center px-8"
              >
                <span>{isSubmitting ? 'Iniciando o preparo...' : 'Finalizar Pedido'}</span>
                {!isSubmitting && (
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                )}
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* PIX Modal */}
      <AnimatePresence>
        {showPixModal && generatedOrderId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 30 }}
               animate={{ scale: 1, y: 0 }}
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
               className="bg-brand-creme rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-brand-terracota/20"
             >
                <div className="bg-brand-terracota p-8 text-center text-brand-creme relative">
                   <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-8 h-8 text-white" />
                   </div>
                   <h2 className="text-2xl font-serif font-bold text-white">Pagamento Pix</h2>
                   <p className="opacity-90 mt-2 font-sans">Seu pedido já está no sistema!</p>
                </div>
                
                <div className="p-8 text-center">
                   <div className="w-48 h-48 bg-white mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-200 border-dashed">
                      <QrCode className="w-24 h-24 text-neutral-300" />
                      <span className="absolute text-xs font-bold font-serif text-brand-terracota max-w-[100px] text-center bg-white/80 p-2">QR Code Originária</span>
                   </div>
                   
                   <p className="text-sm text-neutral-500 mb-2">No valor de</p>
                   <p className="text-3xl font-black text-brand-terracota mb-6">{formatPrice(totalPrice)}</p>

                   <div className="bg-white border border-brand-terracota/20 rounded-2xl p-4 flex items-center justify-between mb-8">
                      <span className="text-sm font-mono truncate mr-4 text-neutral-600">00020126580014br.gov.bcb.pix0136...</span>
                      <button className="text-brand-terracota flex items-center gap-1 font-bold text-sm bg-brand-terracota/10 px-3 py-1.5 rounded-full hover:bg-brand-terracota hover:text-white transition-colors">
                         <Copy className="w-4 h-4" /> Copiar
                      </button>
                   </div>

                   <Link href={`/orders/${generatedOrderId}`}>
                      <Button className="w-full h-14 bg-brand-terracota text-white hover:bg-brand-terracota-dark rounded-full font-bold shadow-md">
                         Já paguei, ir para o Rastreio
                      </Button>
                   </Link>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

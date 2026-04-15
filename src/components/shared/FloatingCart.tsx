"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { ShoppingBag, X, Trash2, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';

export default function FloatingCart() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const cart = useCart();
  const itemsCount = cart.totalItems();
  const totalPrice = cart.totalPrice();

  // Lidando com erro de hidratação (persist localStorage)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <>
      {/* Botão Flutuante (Floating Cart) - Estilo Premium Terracota */}
      <AnimatePresence>
        {itemsCount > 0 && !isOpen && (
          <motion.div
            initial={{ y: 150, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 150, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] bg-brand-terracota text-brand-creme rounded-[28px] shadow-[0_12px_30px_rgba(156,110,76,0.3)] p-4 px-5 flex items-center justify-between cursor-pointer hover:bg-[#825b3e] transition-all z-40"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-brand-creme/20 p-2.5 rounded-full backdrop-blur-sm">
                <ShoppingBag className="w-5 h-5" />
                <motion.span 
                  key={itemsCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-1 -right-1 bg-brand-oliva text-brand-creme text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm"
                >
                  {itemsCount}
                </motion.span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] leading-tight text-white mb-0.5">Sua Comanda</span>
                <span className="text-xs text-brand-creme/80 tracking-wide">Finalizar pedido</span>
              </div>
            </div>
            <span className="font-bold text-lg text-white bg-white/10 px-4 py-2 rounded-2xl">{formatPrice(totalPrice)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet (Painel Lateral) - Tema Originária */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 transition-colors"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-brand-creme shadow-2xl z-50 flex flex-col font-sans"
            >
              <div className="p-6 pb-4 flex items-center justify-between bg-brand-creme border-b border-brand-terracota/10">
                <div className="flex flex-col">
                   <h2 className="text-2xl font-serif font-bold text-neutral-900 flex items-center gap-2">
                     <UtensilsCrossed className="w-5 h-5 text-brand-terracota" />
                     Sua Comanda
                   </h2>
                   <span className="text-xs text-brand-oliva font-bold uppercase tracking-widest mt-1">
                      Originária Cozinha
                   </span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2.5 bg-neutral-200/50 hover:bg-neutral-200 rounded-full transition-colors group">
                  <X className="w-5 h-5 text-neutral-600 group-hover:text-black" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {cart.items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                    <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                       <ShoppingBag className="w-12 h-12 text-neutral-300" />
                    </div>
                    <p className="font-medium text-neutral-500">Sua comanda está vazia</p>
                    <p className="text-sm mt-2 text-center text-neutral-400 px-8">Adicione nossos pratos e viva uma experiência premium.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <AnimatePresence>
                      {cart.items.map((item) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95, height: 0 }}
                          animate={{ opacity: 1, scale: 1, height: 'auto' }}
                          exit={{ opacity: 0, scale: 0.95, height: 0 }}
                          key={item.cartItemId} 
                          className="flex gap-4 bg-white p-4 rounded-[24px] shadow-sm border border-brand-terracota/5"
                        >
                          <div className="w-20 h-20 bg-[#f0ede6] rounded-[16px] overflow-hidden shrink-0">
                            {item.product.imagem_url ? (
                              <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-brand-terracota/30 font-serif text-xs italic">
                                  Sem Img
                               </div>
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-semibold text-neutral-900 text-[15px] leading-snug font-serif">
                                {item.product.nome}
                              </h4>
                              <button onClick={() => cart.removeItem(item.cartItemId)} className="text-neutral-400 hover:text-red-500 transition-colors shrink-0 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="text-xs text-neutral-500 mt-1 h-5 line-clamp-1 italic">
                              {item.observacoes && `Obs: ${item.observacoes}`}
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-2">
                              <div className="flex items-center gap-3 bg-neutral-100 rounded-full p-1 border border-neutral-200/50">
                                <button 
                                  onClick={() => cart.updateQuantity(item.cartItemId, item.quantidade - 1)}
                                  className="p-1.5 rounded-full hover:bg-white text-brand-terracota transition-colors shadow-sm"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-sm w-4 text-center">{item.quantidade}</span>
                                <button 
                                  onClick={() => cart.updateQuantity(item.cartItemId, item.quantidade + 1)}
                                  className="p-1.5 rounded-full hover:bg-white text-brand-terracota transition-colors shadow-sm"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="font-bold text-brand-terracota text-sm">
                                {formatPrice(item.product.preco * item.quantidade)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {cart.items.length > 0 && (
                <div className="p-6 bg-white border-t border-brand-terracota/10">
                  <div className="flex justify-between items-end mb-6 text-lg">
                    <span className="font-medium text-neutral-500 text-sm tracking-wide uppercase">Total da Comanda</span>
                    <span className="font-black text-brand-terracota text-3xl leading-none">{formatPrice(totalPrice)}</span>
                  </div>
                  <Link href="/checkout" onClick={() => setIsOpen(false)}>
                    <Button className="w-full h-16 text-[15px] rounded-[24px] bg-brand-terracota hover:bg-[#825b3e] text-white shadow-[0_8px_20px_rgb(156,110,76,0.25)] transition-all flex items-center justify-center gap-2 group">
                      <span className="font-bold">Prosseguir para o Checkout</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  
  const addItem = useCart((state) => state.addItem);

  // Reset states when closed or a new product is selected
  useEffect(() => {
    if (isOpen) {
      setQuantidade(1);
      setObservacoes('');
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleAdd = () => {
    addItem(product, quantidade, observacoes);
    onClose();
  };

  const increment = () => {
    if (product.estoque_quantidade > 0 && quantidade >= product.estoque_quantidade) return;
    setQuantidade(q => q + 1);
  };

  const decrement = () => {
    setQuantidade(q => Math.max(1, q - 1));
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-md z-50 transition-colors"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-brand-creme rounded-[32px] shadow-2xl z-50 overflow-hidden border border-brand-terracota/10"
          >
            {/* Header / Imagem */}
            <div className="relative h-56 bg-[#f0ede6]">
              {product.imagem_url ? (
                <img 
                  src={product.imagem_url} 
                  alt={product.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-terracota/40 font-serif italic text-lg">
                  Originária Cozinha
                </div>
              )}
              {/* Fade gradient towards bottom of image */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-creme/90 to-transparent z-10" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2.5 bg-neutral-900/20 hover:bg-neutral-900/40 text-white rounded-full backdrop-blur-md transition-all z-20 group"
              >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-8 pt-4 pb-8 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {product.category && (
                 <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-bold text-brand-oliva mb-3 bg-brand-oliva/10 px-3 py-1 rounded-full">
                   {product.category.nome}
                 </span>
              )}
              <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-3 leading-tight">{product.nome}</h2>
              <p className="text-neutral-500 text-[15px] mb-8 pb-8 border-b border-brand-terracota/10 leading-relaxed font-sans">
                {product.descricao}
              </p>

              {/* Controles: Quantidade */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="block font-bold text-neutral-900">Quantidade</span>
                  <span className="text-xs text-neutral-500 mt-0.5">Ajuste se for pedir mais</span>
                </div>
                <div className="flex items-center gap-5 bg-white border border-brand-terracota/10 rounded-full p-1.5 shadow-sm">
                  <button onClick={decrement} className="p-2.5 rounded-full hover:bg-brand-creme text-brand-terracota transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-6 text-center text-lg">{quantidade}</span>
                  <button onClick={increment} className="p-2.5 rounded-full hover:bg-brand-creme text-brand-terracota transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-neutral-900 mb-2">
                  Observações p/ Chef
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Tirar a cebola, enviar talheres..."
                  className="w-full rounded-2xl border border-brand-terracota/10 bg-white px-5 py-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-terracota/50 focus:border-brand-terracota transition-all font-sans placeholder:text-neutral-400"
                  rows={3}
                />
              </div>

              {/* Ação */}
              <Button onClick={handleAdd} className="w-full h-16 text-[15px] rounded-[24px] flex justify-between px-8 bg-brand-terracota hover:bg-[#825b3e] text-white shadow-[0_8px_20px_rgb(156,110,76,0.25)] transition-all group">
                <span className="font-bold">Adicionar à Comanda</span>
                <span className="font-medium bg-white/20 px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform">{formatPrice(product.preco * quantidade)}</span>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

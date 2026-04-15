"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, Category, BusinessConfig } from '@/types/database.types';
import { Plus } from 'lucide-react';
import ProductModal from '@/components/shared/ProductModal';
import FloatingCart from '@/components/shared/FloatingCart';

interface MenuClientProps {
  products: Product[];
  categories: Category[];
  businessConfig: BusinessConfig;
}

export default function MenuClient({ products, categories, businessConfig }: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(`cat-${id}`);
    if (element) {
      const topOff = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: topOff, behavior: 'smooth' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative pb-32 font-sans">
      {/* Header Premium */}
      <header className="mb-14 flex flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-2 w-full pt-6">
           <div className="flex flex-col items-center gap-3">
             {/* Logo Fallback Premium */}
             <div className="w-16 h-16 rounded-full border border-brand-terracota flex items-center justify-center text-brand-terracota shadow-sm bg-brand-creme">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
             </div>
             <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-brand-terracota mt-2">Originária</h1>
           </div>
           
           <p className="text-[11px] sm:text-xs uppercase tracking-[0.5em] font-bold text-brand-oliva mt-4">
              Cozinha
           </p>
           <p className="italic text-base text-brand-terracota/90 font-serif mt-3 pt-4 border-t border-brand-terracota/20 w-48 mx-auto">
             Cuidado que Alimenta
           </p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <span className={`px-5 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase shadow-sm transition-colors ${businessConfig.loja_aberta ? 'bg-brand-oliva text-brand-creme' : 'bg-[#EDE9E4] text-brand-terracota border border-brand-terracota/30'}`}>
            {businessConfig.loja_aberta ? 'Aberto Agora' : 'Loja Fechada'}
          </span>
          {businessConfig.aviso_banner && (
            <p className="text-sm font-medium text-brand-terracota/80 max-w-md">{businessConfig.aviso_banner}</p>
          )}
        </div>
      </header>

      {/* Categorias / Filtro Premium */}
      <div className="overflow-x-auto pb-6 mb-8 scrollbar-hide py-2">
        <div className="flex space-x-3 px-1 md:justify-center">
          <button
            onClick={() => scrollToCategory('all')}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              activeCategory === 'all' 
                ? 'bg-brand-terracota text-brand-creme shadow-[0_4px_14px_rgba(156,110,76,0.3)] scale-105' 
                : 'bg-brand-creme border border-brand-terracota/10 text-brand-terracota hover:bg-brand-terracota/5 hover:border-brand-terracota/30'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat.id 
                  ? 'bg-brand-terracota text-brand-creme shadow-[0_4px_14px_rgba(156,110,76,0.3)] scale-105' 
                  : 'bg-brand-creme border border-brand-terracota/10 text-brand-terracota hover:bg-brand-terracota/5 hover:border-brand-terracota/30'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem por Categorias Agrupadas */}
      <div className="flex flex-col gap-12">
        {categories.map(category => {
          const catProducts = products.filter(p => p.categoria_id === category.id);
          
          if (catProducts.length === 0) return null;

          return (
            <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-8">
                 <h2 className="text-3xl font-serif text-brand-terracota font-bold">{category.nome}</h2>
                 <div className="flex-1 h-px bg-brand-terracota/10"></div>
              </div>

              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              >
                <AnimatePresence mode='popLayout'>
                  {catProducts.map((product, index) => {
                    const isSoldOut = !product.is_available || product.estoque_quantidade === 0;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                        key={product.id}
                        className={`bg-brand-creme border border-brand-terracota/10 rounded-[28px] overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(156,110,76,0.12)] transition-all duration-500 relative group flex flex-col ${isSoldOut ? 'opacity-60 grayscale-[0.3]' : ''}`}
                      >
                        <div className="relative h-[240px] bg-neutral-200 cursor-pointer overflow-hidden" onClick={() => !isSoldOut && setSelectedProduct(product)}>
                          {product.imagem_url ? (
                            <img 
                              src={product.imagem_url} 
                              alt={product.nome}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/E5E0DA/9C6E4C?text=Originaria' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-terracota/40 font-serif italic bg-[#f0ede6]">
                              Originária Cozinha
                            </div>
                          )}

                          {isSoldOut && (
                            <div className="absolute inset-0 bg-brand-creme/60 backdrop-blur-sm flex items-center justify-center z-20">
                               <span className="bg-neutral-900 text-brand-creme px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide shadow-lg">
                                 Esgotado
                               </span>
                            </div>
                          )}
                        </div>

                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="font-serif font-bold text-2xl text-neutral-900 leading-tight mb-3 group-hover:text-brand-terracota transition-colors">{product.nome}</h3>
                          <p className="text-neutral-500 text-[15px] mb-5 line-clamp-3 leading-relaxed flex-1">
                            {product.descricao || 'Sem descrição'}
                          </p>
                          
                          <div className="mt-auto flex items-center justify-between pt-5 border-t border-brand-terracota/10">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-1">Preço</span>
                              <span className="text-2xl font-bold text-brand-terracota font-sans">
                                {formatPrice(product.preco)}
                              </span>
                            </div>
                            
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => !isSoldOut && setSelectedProduct(product)}
                              disabled={isSoldOut}
                              className="relative rounded-[20px] w-14 h-14 p-0 flex items-center justify-center bg-brand-terracota text-brand-creme shadow-md disabled:opacity-50 group/btn transition-all"
                            >
                              <Plus className="w-6 h-6 z-10 relative" />
                              <motion.div 
                                className="absolute inset-0 bg-[#825b3e] rounded-[20px] z-0 opacity-0 group-hover/btn:opacity-100 blur-md pointer-events-none"
                                animate={{ scale: [1, 1.4, 1.2], opacity: [0, 0.4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                style={{ transformOrigin: "center" }} 
                              />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
          )
        })}
      </div>

      {products.length === 0 && (
         <div className="text-center py-20 bg-brand-creme rounded-[32px] border border-brand-terracota/10 mt-8">
           <svg className="w-16 h-16 mx-auto text-brand-terracota/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
           </svg>
           <p className="text-brand-terracota/60 font-medium text-lg">Nosso cardápio está passando por atualizações.</p>
         </div>
      )}

      {/* Modal e Carrinho Flutuante */}
      <ProductModal 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
      <FloatingCart />
    </div>
  );
}

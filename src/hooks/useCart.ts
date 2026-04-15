import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/database.types';

export interface CartItem {
  cartItemId: string; // ID único da linha do carrinho para permitir produtos iguais com obs diferentes
  product: Product;
  quantidade: number;
  observacoes: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantidade: number, observacoes: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantidade: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantidade, observacoes) => {
        set((state) => {
          // Busca se já existe um item EXATAMENTE com o mesmo produto e a mesma observação
          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === product.id && item.observacoes === observacoes
          );

          if (existingItemIndex > -1) {
             const newItems = [...state.items];
             const item = newItems[existingItemIndex];
             // Validação de estoque
             const novoCount = item.quantidade + quantidade;
             if (novoCount > product.estoque_quantidade && product.estoque_quantidade > 0) {
               item.quantidade = product.estoque_quantidade;
             } else {
               item.quantidade = novoCount;
             }
             return { items: newItems };
          }
          
          return { items: [...state.items, {
            cartItemId: Math.random().toString(36).substring(7), // Cria ID para a key do React
            product,
            quantidade,
            observacoes
          }]};
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) }));
      },

      updateQuantity: (cartItemId, quantidade) => {
         set((state) => ({
            items: state.items.map((item) => {
               if (item.cartItemId === cartItemId) {
                 const estoque = item.product.estoque_quantidade;
                 let finalQtd = quantidade;
                 // Se o estoque é maior que zero, obriga respeitar o limite.
                 // (estoque == 0 significa na nossa v1 que tá esgotado ou indefinido, mas a view já bloqueia comprar se <=0)
                 if (estoque > 0 && finalQtd > estoque) {
                    finalQtd = estoque;
                 }
                 return { ...item, quantidade: Math.max(1, finalQtd) }; // não desce de 1.
               }
               return item;
            })
         }));
      },

      clearCart: () => set({ items: [] }),

      // Calculados via funções normais (Zustand pattern)
      totalItems: () => get().items.reduce((acc, item) => acc + item.quantidade, 0),
      totalPrice: () => get().items.reduce((acc, item) => acc + (item.product.preco * item.quantidade), 0),
    }),
    {
      name: 'originaria-cart-storage', // chave do localStorage
    }
  )
);

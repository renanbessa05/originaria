"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product, Category } from '@/types/database.types';
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { Search, Plus, Edit2, Trash2, Image as ImageIcon, ChevronLeft, AlertCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';

const productSchema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  descricao: z.string().optional(),
  precoString: z.string().min(1, "Preço é obrigatório"),
  categoria_id: z.string().uuid("Válido apenas UUID"),
  imagem_url: z.string().optional(),
  estoque_quantidade: z.number().min(0, "Mínimo zero"),
  is_available: z.boolean(),
});
type ProductForm = z.infer<typeof productSchema>;

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
       is_available: true,
       estoque_quantidade: 999
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodData, catData] = await Promise.all([
         productService.getAllProductsAdmin(),
         productService.getCategories()
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (e) {
      toast.error('Erro ao buscar dados do cardápio.');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
     setEditingId(null);
     reset({
       nome: '', descricao: '', precoString: '',
       categoria_id: categories[0]?.id || '',
       imagem_url: '', estoque_quantidade: 999,
       is_available: true
     });
     setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
     setEditingId(p.id);
     reset({
       nome: p.nome,
       descricao: p.descricao || '',
       precoString: p.preco.toFixed(2).replace('.', ','),
       categoria_id: p.categoria_id || categories[0]?.id || '',
       imagem_url: p.imagem_url || '',
       estoque_quantidade: p.estoque_quantidade,
       is_available: p.is_available
     });
     setIsModalOpen(true);
  };

  const handleDelete = async (id: string, nome: string) => {
     if(!confirm(`Tem certeza que deseja excluir o prato "${nome}"?`)) return;
     
     try {
       await productService.deleteProduct(id);
       setProducts(prev => prev.filter(p => p.id !== id));
       toast.success('Prato ecluído com sucesso!');
     } catch(e: any) {
       // Tratamento robusto para Foreign Key
       if (e.message?.includes('foreign key constraint') || e.message?.includes('violates foreign key')) {
         toast.error(`"${nome}" não pode ser apagado pois está no histórico de pedidos. Transformando em INATIVO.`);
         // Force Soft Delete
         await productService.toggleProductAvailability(id, false);
         setProducts(prev => prev.map(p => p.id === id ? { ...p, is_available: false } : p));
       } else {
         toast.error('Ocorreu um erro ao excluir.');
       }
     }
  };

  const onSubmit = async (data: ProductForm) => {
     // Conversão robusta de dinheiro brl para float ("38,90" -> 38.90)
     const cleanPriceStr = data.precoString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
     const numericPrice = parseFloat(cleanPriceStr);

     if(isNaN(numericPrice) || numericPrice <= 0) {
        toast.error("Formato de preço inválido.");
        return;
     }

     const payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        nome: data.nome,
        descricao: data.descricao || null,
        preco: numericPrice,
        categoria_id: data.categoria_id,
        imagem_url: data.imagem_url || null,
        estoque_quantidade: data.estoque_quantidade,
        is_available: data.is_available,
        tipo: 'fixo' // Default p/ Originária no momento
     };

     try {
       if (editingId) {
         const updated = await productService.updateProduct(editingId, payload);
         setProducts(prev => prev.map(p => p.id === editingId ? { ...updated, category: categories.find(c => c.id === updated.categoria_id) } as Product : p));
         toast.success('Produto salvo!');
       } else {
         const created = await productService.createProduct(payload);
         // Adiciona no topo
         setProducts(prev => [{ ...created, category: categories.find(c => c.id === created.categoria_id) } as Product, ...prev]);
         toast.success('Novo prato no cardápio!');
       }
       setIsModalOpen(false);
     } catch (e) {
       toast.error('Erro ao salvar no banco de dados.');
     }
  };

  const filtered = products.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
     return <div className="min-h-screen bg-brand-creme flex items-center justify-center font-serif text-brand-terracota">Acessando o Estoque...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-creme font-sans pb-20">
       <Toaster position="top-right" />
       
       <header className="bg-white border-b border-brand-terracota/10 px-4 sm:px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
         <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 hover:bg-neutral-100 rounded-full transition">
               <ChevronLeft className="w-5 h-5 text-brand-terracota" />
            </Link>
            <div>
               <h1 className="font-serif font-black text-brand-terracota text-xl tracking-tight">Cozinha (Produtos)</h1>
               <p className="text-xs text-neutral-400">Gestão Master</p>
            </div>
         </div>
         <Button onClick={openNewModal} className="bg-brand-terracota hover:bg-brand-terracota-dark text-white rounded-full hidden sm:flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Prato
         </Button>
       </header>

       <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
             <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar catálogo..."
                  className="w-full h-12 pl-12 pr-6 rounded-full border border-brand-terracota/20 bg-white outline-none focus:ring-2 focus:ring-brand-terracota/50"
                />
             </div>
             
             <Button onClick={openNewModal} className="bg-brand-terracota hover:bg-[#825b3e] text-white rounded-full sm:hidden flex items-center gap-2">
               <Plus className="w-4 h-4" /> Novo Prato
             </Button>
          </div>

          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-brand-terracota/5 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-[#f0ede6]/50 text-neutral-500 text-xs font-bold uppercase tracking-widest border-b border-brand-terracota/10">
                     <tr>
                        <th className="px-6 py-5">Prato</th>
                        <th className="px-6 py-5">Categoria</th>
                        <th className="px-6 py-5">Preço</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5 text-right">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-brand-terracota/5 text-neutral-800">
                     {filtered.map(p => (
                       <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-brand-terracota/10 flex items-center justify-center">
                                  {p.imagem_url ? <img src={p.imagem_url} alt="img" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-neutral-300" />}
                               </div>
                               <div className="font-bold text-neutral-900 max-w-[200px] truncate whitespace-normal leading-tight">{p.nome}</div>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-brand-oliva text-[11px] uppercase tracking-wide">
                             {p.category?.nome || 'N/A'}
                          </td>
                          <td className="px-6 py-4 font-bold text-brand-terracota text-base">
                             R$ {p.preco.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full ${p.is_available ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-500'}`}>
                               {p.is_available ? 'Ativo' : 'Oculto'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button onClick={() => openEditModal(p)} className="p-2 text-neutral-400 hover:text-brand-terracota bg-neutral-50 hover:bg-brand-terracota/10 rounded-full transition"><Edit2 className="w-4 h-4" /></button>
                               <button onClick={() => handleDelete(p.id, p.nome)} className="p-2 text-neutral-400 hover:text-red-500 bg-neutral-50 hover:bg-red-50 rounded-full transition"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          </td>
                       </tr>
                     ))}
                     {filtered.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-20 text-neutral-400">Nenhum produto atende a sua busca.</td></tr>
                     )}
                   </tbody>
                </table>
             </div>
          </div>
       </main>

       {/* CUSTOM DIALOG MODAL (Without external lib dependencies to prevent crashes) */}
       {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
             <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-brand-terracota/20 relative">
                <div className="sticky top-0 bg-white/90 backdrop-blur-md px-8 py-6 border-b border-brand-terracota/10 flex justify-between items-center z-10">
                   <h2 className="text-2xl font-serif font-bold text-brand-terracota">
                      {editingId ? 'Editar Prato' : 'Adicionar Prato'}
                   </h2>
                   <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-full font-bold">X</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                         <label className="block text-sm font-bold text-neutral-700 mb-2">Nome Comercial do Prato</label>
                         <input {...register('nome')} placeholder="Ex: Salada Originária" className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none" />
                         {errors.nome && <span className="text-red-500 text-xs mt-1 block">{errors.nome.message}</span>}
                      </div>

                      <div className="md:col-span-2">
                         <label className="block text-sm font-bold text-neutral-700 mb-2">Descrição (Opcional)</label>
                         <textarea {...register('descricao')} placeholder="Uma breve poesia sobre os ingredientes..." className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none resize-none h-24" />
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-neutral-700 mb-2">Preço (R$)</label>
                         <input {...register('precoString')} placeholder="38,90" className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none font-mono" />
                         {errors.precoString && <span className="text-red-500 text-xs mt-1 block">{errors.precoString.message}</span>}
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-neutral-700 mb-2">Categoria</label>
                         <select {...register('categoria_id')} className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none appearance-none">
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                         </select>
                         {errors.categoria_id && <span className="text-red-500 text-xs mt-1 block">{errors.categoria_id.message}</span>}
                      </div>

                      <div className="md:col-span-2">
                         <label className="block text-sm font-bold text-neutral-700 mb-2">URL da Imagem de Vitrine</label>
                         <div className="flex items-center gap-3">
                            <div className="bg-neutral-100 p-3.5 rounded-2xl text-neutral-400"><ImageIcon className="w-5 h-5"/></div>
                            <input {...register('imagem_url')} placeholder="https://..." className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none" />
                         </div>
                         <p className="text-xs text-neutral-400 mt-2">Dica: Por enquanto cole o link direto da imagem hospedada.</p>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-neutral-700 mb-2">Estoque (Qtd)</label>
                         <input type="number" {...register('estoque_quantidade', { valueAsNumber: true })} className="w-full bg-brand-creme/50 border border-neutral-200 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-brand-terracota/50 outline-none" />
                      </div>

                      <div className="flex items-center justify-between bg-neutral-50 px-5 py-3.5 rounded-2xl border border-neutral-200">
                         <div>
                            <span className="block text-sm font-bold text-neutral-700">Disponível no Site?</span>
                            <span className="text-xs text-neutral-500">Deixe invisível se faltar ingrediente.</span>
                         </div>
                         <input type="checkbox" {...register('is_available')} className="w-6 h-6 accent-brand-terracota cursor-pointer" />
                      </div>
                   </div>

                   <div className="pt-6 mt-6 border-t border-brand-terracota/10 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-full px-6 h-12 text-neutral-600 border-neutral-200">
                        Cancelar
                      </Button>
                      <Button type="submit" className="rounded-full px-8 h-12 bg-brand-terracota hover:bg-brand-terracota-dark text-white font-bold shadow-md">
                        {editingId ? 'Salvar Edição' : 'Lançar Prato'}
                      </Button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}

import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/types/database.types';

export const productService = {
  /**
   * Busca todos os produtos ativos, juntamente com suas categorias. (Vitrine)
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('is_available', true);

    if (error) {
      console.error('Erro ao buscar produtos:', error.message);
      throw new Error('Não foi possível carregar os produtos.');
    }

    return data as unknown as Product[];
  },

  /**
   * Busca TODO o inventário (Ativo e Inativo) para Gestão
   */
  async getAllProductsAdmin(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar inventário:', error.message);
      throw new Error('Não foi possível carregar os produtos do Admin.');
    }

    return data as unknown as Product[];
  },

  /**
   * Altera a disponibilidade (is_available) de um produto instantaneamente
   */
  async toggleProductAvailability(productId: string, isAvailable: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update({ is_available: isAvailable })
      .eq('id', productId);
      
    if (error) {
       console.error('Erro no Toggle Produto', error);
       throw new Error(error.message);
    }
    return true;
  },

  /**
   * Atualiza o preço ou estoque base
   */
  async updateProductBasic(productId: string, updates: Partial<Product>): Promise<boolean> {
     const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
      
     if (error) {
        console.error('Erro no Update Produto', error);
        throw new Error(error.message);
     }
     return true;
  },

  /**
   * Busca apenas as categorias que estão ativas.
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('ativa', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error.message);
      throw new Error('Não foi possível carregar as categorias.');
    }

    return data as Category[];
  },

  /**
   * Cria um novo produto no catálogo.
   */
  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
     const { data: newProd, error } = await supabase
       .from('products')
       .insert([data])
       .select('*')
       .single();

     if (error) {
       console.error('Erro ao criar produto:', error);
       throw new Error(error.message);
     }
     return newProd as unknown as Product;
  },

  /**
   * Atualiza as informações completas de um produto.
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
     const { data, error } = await supabase
       .from('products')
       .update(updates)
       .eq('id', id)
       .select('*')
       .single();

     if (error) {
        console.error('Erro ao editar produto:', error);
        throw new Error(error.message);
     }
     return data as unknown as Product;
  },

  /**
   * Deleta do banco. Na falha por foreign key (fk_... referenciado no history_orders),
   * o consumer catch() fará o 'soft delete' setando is_available = false.
   */
  async deleteProduct(id: string): Promise<boolean> {
     const { error } = await supabase
       .from('products')
       .delete()
       .eq('id', id);

     if (error) {
       console.error('Erro ao excluir:', error);
       throw error;
     }

     return true;
  }
};

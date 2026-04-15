import { supabase } from '@/lib/supabase';

interface CheckoutPayload {
  p_user_id: string;
  p_total: number;
  p_tipo_pagamento: string;
  p_troco: number | null;
  p_agendamento_data: string | null;
  p_logradouro: string;
  p_numero: string;
  p_bairro: string;
  p_referencia: string | null;
  p_taxa_entrega: number;
  p_items: Array<{
    product_id: string;
    quantidade: number;
    preco_unitario: number;
    observacoes: string | null;
  }>;
}

export const orderService = {
  async processCheckout(payload: CheckoutPayload): Promise<string> {
    const { data, error } = await supabase.rpc('process_checkout', payload);
    
    if (error) {
      console.error('Checkout RPC Error', error);
      throw new Error(error.message);
    }
    
    return data as string;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (error) {
       console.error('Update Status Error:', error);
       throw new Error(error.message);
    }
    return true;
  }
};

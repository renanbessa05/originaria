import { supabase } from '@/lib/supabase';
import type { BusinessConfig } from '@/types/database.types';

export const businessService = {
  async getConfig(): Promise<BusinessConfig> {
    const { data, error } = await supabase
      .from('business_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
       console.error('Erro ao buscar configuração', error);
       // Retorna um fallback amigável pra não quebrar a tela
       return { loja_aberta: false, horario_inicio: null, horario_fim: null, aviso_banner: null, id: 1, created_at: '', updated_at: '' };
    }
    return data as BusinessConfig;
  },

  async updateLojaStatus(loja_aberta: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('business_config')
      .update({ loja_aberta })
      .eq('id', 1);
    
    if (error) {
      console.error('Erro ao atualizar status da loja', error);
      throw new Error(error.message);
    }
    return true;
  }
};

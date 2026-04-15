import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ou Anon Key não estão definidos nas variáveis de ambiente. Verifique o arquivo .env.local');
}

// Cria uma única instância (Singleton) do cliente supabase para ser reaproveitada 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

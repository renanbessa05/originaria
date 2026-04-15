export type UserRole = 'admin' | 'customer';
export type ProductType = 'fixo' | 'personalizado';
export type OrderStatus = 'pendente' | 'confirmado' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado';

export interface Profile {
  id: string; // UUID
  email: string;
  nome: string;
  telefone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string; // UUID
  nome: string;
  slug: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string; // UUID
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: string | null;
  estoque_quantidade: number;
  is_available: boolean;
  tipo: ProductType;
  created_at: string;
  updated_at: string;
  category?: Category; // Relation
}

export interface Address {
  id: string; // UUID
  user_id: string;
  logradouro: string;
  numero: string;
  bairro: string;
  referencia: string | null;
  taxa_entrega_base: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string; // UUID
  user_id: string;
  status: OrderStatus;
  total: number;
  tipo_pagamento: string;
  troco: number | null;
  agendamento_data: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[]; // Relation
}

export interface OrderItem {
  id: string; // UUID
  order_id: string;
  product_id: string | null;
  quantidade: number;
  preco_unitario: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  product?: Product; // Relation
}

export interface BusinessConfig {
  id: number;
  loja_aberta: boolean;
  horario_inicio: string | null; // TIME
  horario_fim: string | null; // TIME
  aviso_banner: string | null;
  created_at: string;
  updated_at: string;
}

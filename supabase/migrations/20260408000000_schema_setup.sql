-- ==========================================
-- 0. EXTENSIONS & ENUMS
-- ==========================================

-- Criação dos tipos ENUM para padronizar valores
CREATE TYPE user_role AS ENUM ('admin', 'customer');
CREATE TYPE product_type AS ENUM ('fixo', 'personalizado');
CREATE TYPE order_status AS ENUM (
  'pendente', 
  'confirmado', 
  'preparando', 
  'saiu_entrega', 
  'entregue', 
  'cancelado'
);

-- ==========================================
-- 1. UTILITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role = 'admin'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. TABLES CREATION
-- ==========================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  role user_role DEFAULT 'customer'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  imagem_url TEXT,
  categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  estoque_quantidade INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  tipo product_type NOT NULL DEFAULT 'fixo'::product_type,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  bairro TEXT NOT NULL,
  referencia TEXT,
  taxa_entrega_base DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status order_status DEFAULT 'pendente'::order_status NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  tipo_pagamento TEXT NOT NULL,
  troco DECIMAL(10, 2),
  agendamento_data TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE business_config (
  id INTEGER PRIMARY KEY DEFAULT 1, 
  loja_aberta BOOLEAN DEFAULT true,
  horario_inicio TIME,
  horario_fim TIME,
  aviso_banner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_row_only CHECK (id = 1)
);


-- ==========================================
-- 3. TRIGGERS (updated_at)
-- ==========================================
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_business_config_updated_at BEFORE UPDATE ON business_config FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

-- --> PROFILES
CREATE POLICY "Usuários veem o próprio perfil, admin vê todos" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Usuários atualizam o próprio perfil, admin atualiza todos" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- --> CATEGORIES
CREATE POLICY "Categorias são públicas para leitura" ON categories FOR SELECT USING (true);
CREATE POLICY "Apenas admin manipula categorias (INSERT)" ON categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Apenas admin manipula categorias (UPDATE)" ON categories FOR UPDATE USING (is_admin());
CREATE POLICY "Apenas admin manipula categorias (DELETE)" ON categories FOR DELETE USING (is_admin());

-- --> PRODUCTS
CREATE POLICY "Produtos são públicos para leitura" ON products FOR SELECT USING (true);
CREATE POLICY "Apenas admin manipula produtos (INSERT)" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Apenas admin manipula produtos (UPDATE)" ON products FOR UPDATE USING (is_admin());
CREATE POLICY "Apenas admin manipula produtos (DELETE)" ON products FOR DELETE USING (is_admin());

-- --> ADDRESSES
CREATE POLICY "Usuários manipulam próprios endereços (SELECT)" ON addresses FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Usuários manipulam próprios endereços (INSERT)" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Usuários manipulam próprios endereços (UPDATE)" ON addresses FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Usuários manipulam próprios endereços (DELETE)" ON addresses FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- --> ORDERS
CREATE POLICY "Usuários manipulam próprios pedidos (SELECT)" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Usuários criam próprios pedidos (INSERT)" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Usuários atualizam próprios pedidos (UPDATE)" ON orders FOR UPDATE USING (auth.uid() = user_id OR is_admin()); 

-- --> ORDER_ITEMS
CREATE POLICY "Acesso aos items do pedido (SELECT)" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "Acesso aos items do pedido (INSERT)" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "Acesso aos items do pedido (UPDATE)" ON order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
);

-- --> BUSINESS_CONFIG
CREATE POLICY "Configurações da loja públicas (SELECT)" ON business_config FOR SELECT USING (true);
CREATE POLICY "Configurações da loja via admin (UPDATE)" ON business_config FOR UPDATE USING (is_admin());
CREATE POLICY "Configurações da loja via admin (INSERT)" ON business_config FOR INSERT WITH CHECK (is_admin());

-- ==========================================
-- 5. TRIGGER ON AUTH.USERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'customer'::user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 6. POPULANDO DADOS INICIAIS
-- ==========================================
INSERT INTO business_config (id, loja_aberta, horario_inicio, horario_fim, aviso_banner) 
VALUES (1, true, '09:00', '18:00', 'Bem-vindo(a) à nossa marmitaria premium!');

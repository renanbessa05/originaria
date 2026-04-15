-- 20260408000005_premium_seed.sql
-- Transformando o Menu Genérico na Autêntica "Originária Cozinha"

-- 1. Renomeando categorias existentes
UPDATE public.categories SET nome = 'Vegano Premium', slug = 'vegano-premium' WHERE slug = 'marmitas-fitness';
UPDATE public.categories SET nome = 'Pratos Protéicos', slug = 'pratos-proteicos' WHERE slug = 'comida-caseira';

-- Inserindo novas
INSERT INTO public.categories (nome, slug) VALUES ('Low Carb', 'low-carb') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.categories (nome, slug) VALUES ('Bebidas', 'bebidas') ON CONFLICT (slug) DO NOTHING;

-- 2. Refinando Produtos Base
UPDATE public.products 
SET 
  nome = 'Risoto de Cogumelos Frescos Trufado', 
  descricao = 'Arroz arbório finalizado lentamente com mix de cogumelos selvagens (shimeji e paris), azeite trufado e uma generosa crosta de parmesão curado.',
  preco = 46.90
WHERE slug = 'frango-batata-doce';

UPDATE public.products 
SET 
  nome = 'Salmão Defumado com Vegetais Salteados', 
  descricao = 'Posta de salmão chileno selada na brasa de carvalho, acompanhada de aspargos crocantes, tomates cereja confit e cenouras baby no azeite extravirgem.',
  preco = 58.50
WHERE slug = 'strogonoff-carne';

-- 3. Inserindo novo Prato Premium
INSERT INTO public.products (nome, slug, descricao, preco, categoria_id, imagem_url, is_available, estoque_quantidade)
SELECT 
  'Frango Grelhado com Cuscuz Marroquino',
  'frango-grelhado-cuscuz',
  'Suculento peito de frango caipira acompanhado de cuscuz marroquino hidratado em especiarias e seleção premium de legumes na manteiga ghee.',
  38.90,
  id,
  'https://images.unsplash.com/photo-1598514982205-f36b96d1e8dd?auto=format&fit=crop&q=80',
  true,
  20
FROM public.categories WHERE slug = 'pratos-proteicos' LIMIT 1;

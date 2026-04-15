-- Inserindo categorias Iniciais
INSERT INTO categories (nome, slug, ativa) VALUES 
('Pratos Protéicos', 'pratos-proteicos', true),
('Low Carb', 'low-carb', true),
('Vegano Premium', 'vegano-premium', true);

-- Inserindo produtos premium com relações de categorias dinâmicas
WITH cat_proteico AS (SELECT id FROM categories WHERE slug = 'pratos-proteicos' LIMIT 1),
     cat_lowcarb AS (SELECT id FROM categories WHERE slug = 'low-carb' LIMIT 1),
     cat_vegano AS (SELECT id FROM categories WHERE slug = 'vegano-premium' LIMIT 1)
INSERT INTO products (nome, descricao, preco, imagem_url, categoria_id, estoque_quantidade, is_available) VALUES
('Frango Suíno Marroquino', 'Frango suculento marinado em ervas finas acompanhado de cuscuz marroquino com amêndoas e damasco.', 38.90, 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=600&auto=format&fit=crop', (SELECT id FROM cat_proteico), 10, true),
('Salmão Defumado com Aspargos', 'Filé de salmão fresco defumado em lenha de macieira, servido com aspargos salteados na manteiga ghee.', 54.90, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=600&auto=format&fit=crop', (SELECT id FROM cat_lowcarb), 5, true),
('Risoto de Cogumelos Trufados', 'Risoto cremoso com mix de cogumelos frescos (Paris, Shitake, Shimeji), finalizado com azeite de trufas brancas.', 45.00, 'https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?q=80&w=600&auto=format&fit=crop', (SELECT id FROM cat_vegano), 8, true),
('Bife Ancho com Brócolis', 'Corte especial de Ancho grelhado ao ponto, com flores de brócolis tostadas com alho e sal marinho.', 62.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop', (SELECT id FROM cat_lowcarb), 0, false); -- Exemplo de produto simulado como ESGOTADO!

-- Remote Procedure Call (RPC) para processamento de Checkout Atômico
-- Evita a "condição de corrida" manipulando o estoque dentro de uma transação garantida pelo Postgres.

CREATE OR REPLACE FUNCTION process_checkout(
  p_user_id UUID,
  p_total DECIMAL(10,2),
  p_tipo_pagamento TEXT,
  p_troco DECIMAL(10,2),
  p_agendamento_data TIMESTAMPTZ,
  p_logradouro TEXT,
  p_numero TEXT,
  p_bairro TEXT,
  p_referencia TEXT,
  p_taxa_entrega DECIMAL(10,2),
  p_items jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Permite burlar o RLS restritamente durante esta função para assegurar o processo atômico
AS $$
DECLARE
  v_order_id UUID;
  v_item jsonb;
  v_product_id UUID;
  v_qtd INTEGER;
  v_preco DECIMAL(10,2);
  v_obs TEXT;
  v_estoque_atual INTEGER;
BEGIN
  -- 1. Cria o Endereço para histórico do Cliente
  INSERT INTO addresses (user_id, logradouro, numero, bairro, referencia, taxa_entrega_base)
  VALUES (p_user_id, p_logradouro, p_numero, p_bairro, p_referencia, p_taxa_entrega);

  -- 2. Cria o Pedido (Order) Inicial como "Pendente"
  INSERT INTO orders (user_id, status, total, tipo_pagamento, troco, agendamento_data)
  VALUES (p_user_id, 'pendente'::order_status, p_total, p_tipo_pagamento, p_troco, p_agendamento_data)
  RETURNING id INTO v_order_id;

  -- 3. Itera o carrinho inserindo os items e abatendo do estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qtd := (v_item->>'quantidade')::INTEGER;
    v_preco := (v_item->>'preco_unitario')::DECIMAL;
    v_obs := v_item->>'observacoes';

    -- Atualiza e Debita Estoque atrelado por segurança Lock de Linha SQL
    UPDATE products
    SET estoque_quantidade = estoque_quantidade - v_qtd
    WHERE id = v_product_id
    RETURNING estoque_quantidade INTO v_estoque_atual;

    -- Se algum produto negativar o estoque, joga erro (Abortando a transação inteira)
    IF v_estoque_atual < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_product_id;
    END IF;

    -- Se zerou exatamente, marca ele para indisponível
    IF v_estoque_atual = 0 THEN
      UPDATE products SET is_available = false WHERE id = v_product_id;
    END IF;

    -- Registra o item
    INSERT INTO order_items (order_id, product_id, quantidade, preco_unitario, observacoes)
    VALUES (v_order_id, v_product_id, v_qtd, v_preco, NULLIF(v_obs, ''));

  END LOOP;

  -- Retorna o Ticket da compra
  RETURN v_order_id;
END;
$$;

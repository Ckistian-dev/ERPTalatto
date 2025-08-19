-- Lógica 1: Placa Adesiva de Parede Mármore Flexível
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Placas Adesivas Mármore Flexível', 'Regras para o produto PLACA ADESIVA DE PAREDE MARMORE FLEXIVEL 60x30 cm.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 10, 'condicao_gatilho', 'MAIOR_IGUAL_A', 'valor_gatilho', '120',
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 0.125), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 2)),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    ),
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 5, 'condicao_gatilho', 'MENOR_QUE', 'valor_gatilho', '120',
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRimento_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 0.25), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 2)),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '/'), JSON_OBJECT('tipo', 'numero', 'valor', 2), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 1))
    )
  )
));

-- Lógica 2: Painéis Ripados (Geral)
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painéis Ripados (Geral)', 'Para os painéis: MADEIRA PLASTICA, ALTA RESISTENCIA, EASY, CANELADO, REDONDO, SHIPLAP MDF.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 1, 'condicao_gatilho', 'SEMPRE', 'valor_gatilho', null,
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_PROPORCIONAL')), -- A lógica original era uma regra de 3 exata
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    )
  )
));

-- Lógica 3: Painel Ripado Estrutural
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painel Ripado Estrutural', 'Regra específica para o Painel Ripado Estrutural.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 1, 'condicao_gatilho', 'SEMPRE', 'valor_gatilho', null,
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '/'), JSON_OBJECT('tipo', 'numero', 'valor', 1.8)),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'numero', 'valor', 3)),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    )
  )
));

-- Lógica 4: Painel Ripado Compacto
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painel Ripado Compacto', 'Regra para o Painel Ripado Compacto, similar à geral.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 1, 'condicao_gatilho', 'SEMPRE', 'valor_gatilho', null,
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_PROPORCIONAL')),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    )
  )
));

-- Lógica 5: Painel Ripado Versátil (Vertical, MP, Redondo)
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painel Ripado Versátil (Grupo 1)', 'Para os painéis: VERSATIL VERTICAL 110 cm, VERSATIL MP, VERSATIL VERTICAL REDONDO 270 cm.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 10, 'condicao_gatilho', 'MAIOR_QUE', 'valor_gatilho', '3', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_EMBALAGEM')), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM')), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))),
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 9, 'condicao_gatilho', 'IGUAL_A', 'valor_gatilho', '3', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 1.2), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 5)), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 5.5)), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 5.5))),
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 8, 'condicao_gatilho', 'IGUAL_A', 'valor_gatilho', '2', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 1.2), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 4)), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 7.5)), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 7.5))),
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 7, 'condicao_gatilho', 'IGUAL_A', 'valor_gatilho', '1', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 1.2), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 3.6)), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 9)), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 9)))
  )
));

-- Lógica 6: Painel Versátil (Modular e outros)
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painel Versátil (Grupo 2)', 'Para os painéis: VERSATIL VERTICAL 27 cm, VERSATIL VERTICAL REDONDO 27 cm, VERSATIL MODULAR.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 10, 'condicao_gatilho', 'ENTRE', 'valor_gatilho', '5,13', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM')), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))),
    JSON_OBJECT('id_regra', UUID(), 'prioridade', 5, 'condicao_gatilho', 'MENOR_IGUAL_A', 'valor_gatilho', '4', 'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')), 'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')), 'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM'), JSON_OBJECT('tipo', 'operador', 'valor', '-'), JSON_OBJECT('tipo', 'numero', 'valor', 2)), 'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM')))
  )
));

-- Lógica 7: Painel de Pedra PU
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Painel de Pedra PU', 'Regra específica para o Painel de Pedra PU.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 1, 'condicao_gatilho', 'SEMPRE', 'valor_gatilho', null,
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'QTD_RESTANTE'), JSON_OBJECT('tipo', 'operador', 'valor', '*'), JSON_OBJECT('tipo', 'numero', 'valor', 1.6), JSON_OBJECT('tipo', 'operador', 'valor', '+'), JSON_OBJECT('tipo', 'numero', 'valor', 2)),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    )
  )
));

-- Lógica 8: Produtos Diversos (Padrão)
INSERT INTO embalagem (nome, descricao, regras) VALUES
('Lógica Padrão para Itens Diversos', 'Regra genérica para produtos como KITS, FRASES, BRISES, etc. que usam a embalagem padrão proporcional.', JSON_OBJECT(
  'regras', JSON_ARRAY(
    JSON_OBJECT(
      'id_regra', UUID(), 'prioridade', 1, 'condicao_gatilho', 'SEMPRE', 'valor_gatilho', null,
      'formula_peso', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'PESO_PROPORCIONAL')),
      'formula_comprimento', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'COMPRIMENTO_EMBALAGEM')),
      'formula_altura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'ALTURA_EMBALAGEM')),
      'formula_largura', JSON_ARRAY(JSON_OBJECT('tipo', 'variavel', 'valor', 'LARGURA_EMBALAGEM'))
    )
  )
));
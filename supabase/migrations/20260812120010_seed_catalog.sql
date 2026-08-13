-- ============================================================
-- SERVICE — Seed do catálogo canônico (ADR-014)
-- Cidades-alvo: São Paulo, Sul e grandes metrópoles/capitais
-- com melhores economias (mercado-alvo confirmado 2026-08-12).
-- Categorias: lista da spec §0.
-- ============================================================

insert into public.cities (ibge_code, name, state, slug, is_launch) values
  ('3550308', 'São Paulo',       'SP', 'sao-paulo',    true),
  ('3304557', 'Rio de Janeiro',  'RJ', 'rio-de-janeiro', false),
  ('3106200', 'Belo Horizonte',  'MG', 'belo-horizonte', false),
  ('4106902', 'Curitiba',        'PR', 'curitiba',      true),
  ('4205407', 'Florianópolis',   'SC', 'florianopolis', false),
  ('4314902', 'Porto Alegre',    'RS', 'porto-alegre',  false),
  ('5300108', 'Brasília',        'DF', 'brasilia',      false),
  ('5208707', 'Goiânia',         'GO', 'goiania',       false),
  ('3509502', 'Campinas',        'SP', 'campinas',      false),
  ('3518800', 'Guarulhos',       'SP', 'guarulhos',     false),
  ('3548500', 'Santos',          'SP', 'santos',        false)
on conflict (ibge_code) do nothing;

insert into public.service_categories (slug, name, sort_order) values
  ('diaristas',         'Diaristas',          1),
  ('faxina',            'Faxina',             2),
  ('limpeza-pos-obra',  'Limpeza pós-obra',   3),
  ('pintor',            'Pintura',            4),
  ('pequenos-reparos',  'Pequenos reparos',   5),
  ('eletricista',       'Eletricista',        6),
  ('encanador',         'Encanador',          7),
  ('chaveiro',          'Chaveiro',           8),
  ('montagem',          'Montagem',           9),
  ('manutencao',        'Manutenção',        10),
  ('jardinagem',        'Jardinagem',        11),
  ('outros',            'Outros serviços',   12)
on conflict (slug) do nothing;

-- Seed data pro pawnshop
-- Hesla jsou hashována pomocí SHA-256 (viz app/lib/auth.server.ts)
-- admin / admin123  -> 240be518fabd2724dc1bde3c63fbd8c6  (SHA-256 of "admin123")

-- Poznámka: pro seed je jednodušší vložit uživatele přes aplikaci.
-- Zde vložíme výchozího admina s heslem "admin123" (SHA-256):
INSERT OR IGNORE INTO users (username, password_hash, role, display_name)
VALUES ('admin', '240be518fabd2724dc1bde3c63fbd8c6', 'admin', 'Administrátor');

-- Kategorie (barvy přibližně podle screenshotu)
INSERT OR IGNORE INTO categories (name, color, sort_order) VALUES
  ('Běžné věci',  '#3b82f6', 1),
  ('Zbraně',      '#ef4444', 2),
  ('Činnosti',    '#f59e0b', 3),
  ('Zahradnictví','#22c55e', 4),
  ('Chemikálie',  '#a855f7', 5),
  ('Drogy',       '#ec4899', 6),
  ('Drahokamy',   '#06b6d4', 7);

-- Ukázkové produkty
INSERT OR IGNORE INTO products (name, category_id, buy_price, sell_price, icon) VALUES
  ('Železo',          1, 50,  80,  '🔩'),
  ('Plast',           1, 30,  50,  '🧱'),
  ('Dřevo',           1, 40,  70,  '🪵'),
  ('Lahve',           1, 20,  35,  '🍾'),
  ('Pistole',         2, 200, 350, '🔫'),
  ('Puška',           2, 300, 500, '🔫'),
  ('Nůž',             2, 80,  140, '🔪'),
  ('Sekera',          3, 60,  100, '🪓'),
  ('Krumpáč',         3, 70,  120, '⛏️'),
  ('Semínka',         4, 25,  45,  '🌱'),
  ('Hnojivo',         4, 35,  60,  '🪴'),
  ('Láhev chemie',    5, 90,  150, '🧪'),
  ('Léky',            6, 120, 200, '💊'),
  ('Diamant',         7, 500, 800, '💎'),
  ('Rubín',           7, 400, 650, '💎');

-- Создаем новую таблицу
CREATE TABLE items_new (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    model_path VARCHAR(500) NOT NULL,
    preview_image VARCHAR(500) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    stats JSONB DEFAULT '{}',
    default_quantity INTEGER DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Копируем данные из старой таблицы
INSERT INTO items_new (id, name, rarity, model_path, preview_image, item_type, default_quantity, created_at, updated_at)
SELECT id, name, rarity, '' as model_path, '' as preview_image, 'unknown' as item_type, default_quantity, created_at, updated_at
FROM items;

-- Удаляем старую таблицу
DROP TABLE items;

-- Переименовываем новую таблицу
ALTER TABLE items_new RENAME TO items;

ALTER TABLE items ADD COLUMN model_path VARCHAR(500);
ALTER TABLE items ADD COLUMN preview_image VARCHAR(500);
ALTER TABLE items ADD COLUMN item_type VARCHAR(50);
ALTER TABLE items ADD COLUMN stats JSONB DEFAULT '{}';

UPDATE items SET 
    model_path = '', 
    preview_image = '', 
    item_type = 'unknown'
WHERE model_path IS NULL;

ALTER TABLE items ALTER COLUMN model_path SET NOT NULL;
ALTER TABLE items ALTER COLUMN preview_image SET NOT NULL;
ALTER TABLE items ALTER COLUMN item_type SET NOT NULL; 
USE ks_daigou;

INSERT INTO products
  (id, name, subtitle, category, cover_url, images, description, price, market_price, stock, sales, status, sort, version)
VALUES
  (1, '盒马同款鲜切水果杯', '当日鲜切 约350g', 'FOOD', 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600', JSON_ARRAY('https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=900'), '适合办公室和宿舍的鲜切水果组合。', 1290, 1590, 200, 0, 'ON_SALE', 100, 0),
  (2, '朴朴同款低温鲜奶', '950ml 冷藏配送', 'DRINK', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600', JSON_ARRAY('https://images.unsplash.com/photo-1563636619-e9143da7973b?w=900'), '低温保鲜，集中采购后统一配送。', 1680, 1980, 180, 0, 'ON_SALE', 90, 0),
  (3, '山姆同款瑞士卷', '家庭分享装', 'FOOD', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', JSON_ARRAY('https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900'), '柔软蛋糕卷，适合拼单代购。', 3980, 4590, 120, 0, 'ON_SALE', 80, 0),
  (4, '每日蔬菜组合', '3-4人份', 'FRESH', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600', JSON_ARRAY('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900'), '包含叶菜、根茎和菌菇，按当天采购情况微调。', 2990, 3590, 150, 0, 'ON_SALE', 70, 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  subtitle = VALUES(subtitle),
  category = VALUES(category),
  cover_url = VALUES(cover_url),
  images = VALUES(images),
  description = VALUES(description),
  price = VALUES(price),
  market_price = VALUES(market_price),
  stock = VALUES(stock),
  status = VALUES(status),
  sort = VALUES(sort);

INSERT INTO users (id, openid, nickname, status)
VALUES (1, 'dev_tester', '测试用户', 1)
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), status = VALUES(status);

INSERT INTO addresses (id, user_id, name, phone, community_name, building_no, unit_no, room_no, is_default)
VALUES (1, 1, '测试用户', '13800000000', '阳光花园', '1', '2', '301', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  phone = VALUES(phone),
  community_name = VALUES(community_name),
  building_no = VALUES(building_no),
  unit_no = VALUES(unit_no),
  room_no = VALUES(room_no),
  is_default = VALUES(is_default);

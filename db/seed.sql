INSERT INTO products (id, name) VALUES
  ('x1', '充电器 X1'),
  ('x2', '充电器 X2');

INSERT INTO documents (id, product_id, title, version) VALUES
  ('x1-manual', 'x1', '充电器 X1 说明书', '1.0'),
  ('x2-manual', 'x2', '充电器 X2 说明书', '1.0');

-- 功率只放在参数表里，不写进手册正文，用来练习 getSpec。
INSERT INTO specs (product_id, name, value) VALUES
  ('x1', '电池容量', '5000mAh'),
  ('x1', '额定功率', '20W'),
  ('x2', '电池容量', '8000mAh'),
  ('x2', '额定功率', '30W');

-- 练习库。重复执行会清空对话和手册切片。
-- embedding 维度必须和嵌入模型一致。默认 BAAI/bge-m3 是 1024 维。

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS doc_chunks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS specs;
DROP TABLE IF EXISTS products;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products (id),
  title TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE doc_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents (id),
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024) NOT NULL
);

CREATE TABLE specs (
  product_id TEXT NOT NULL REFERENCES products (id),
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (product_id, name)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations (id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_trace JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

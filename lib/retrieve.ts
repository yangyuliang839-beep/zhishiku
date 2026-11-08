import { embedQuery } from "./ai";
import { sql } from "./db";
import { vectorLiteral } from "./vector";

export type ChunkHit = {
  heading: string;
  content: string;
  documentTitle: string;
  score: number;
};

export type SpecHit = {
  name: string;
  value: string;
};

export async function searchChunks(productId: string, query: string) {
  // 向量字面量只含数字。参数写成 `$1::vector` 时，当前数据库连接会报 prepared statement 错误。
  const vector = sql.unsafe(`'${vectorLiteral(await embedQuery(query))}'::vector`);
  const rows = await sql<
    {
      heading: string;
      content: string;
      document_title: string;
      score: string;
    }[]
  >`
    SELECT c.heading, c.content, d.title AS document_title,
           1 - (c.embedding <=> ${vector}) AS score
    FROM doc_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.product_id = ${productId}
    ORDER BY c.embedding <=> ${vector}
    LIMIT 5
  `;

  return rows.map((row) => ({
    heading: row.heading,
    content: row.content,
    documentTitle: row.document_title,
    score: Number(row.score),
  }));
}

export async function getSpec(productId: string, name: string) {
  const keyword = name.replace(/[%_]/g, "");
  const rows = await sql<SpecHit[]>`
    SELECT name, value
    FROM specs
    WHERE product_id = ${productId}
      AND (name = ${name} OR name ILIKE ${"%" + keyword + "%"})
    ORDER BY (name = ${name}) DESC, name
    LIMIT 1
  `;
  return rows[0] ?? null;
}

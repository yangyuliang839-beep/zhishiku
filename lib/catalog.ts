import { sql } from "./db";

export async function loadCatalog() {
  const products = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM products ORDER BY id
  `;
  const documents = await sql<
    { id: string; product_id: string; title: string; version: string }[]
  >`
    SELECT id, product_id, title, version FROM documents ORDER BY id
  `;
  const headings = await sql<{ document_id: string; heading: string }[]>`
    SELECT document_id, heading FROM doc_chunks ORDER BY id
  `;
  const specs = await sql<
    { product_id: string; name: string; value: string }[]
  >`
    SELECT product_id, name, value FROM specs ORDER BY name
  `;

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    documents: documents
      .filter((document) => document.product_id === product.id)
      .map((document) => ({
        id: document.id,
        title: document.title,
        version: document.version,
        headings: headings
          .filter((heading) => heading.document_id === document.id)
          .map((heading) => heading.heading),
      })),
    specs: specs
      .filter((spec) => spec.product_id === product.id)
      .map((spec) => ({ name: spec.name, value: spec.value })),
  }));
}

export async function requireProduct(productId: string) {
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM products WHERE id = ${productId}
  `;
  return rows[0] ?? null;
}

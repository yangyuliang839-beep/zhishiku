import fs from "node:fs";
import path from "node:path";
import { embedDocuments } from "../lib/ai";
import { sql } from "../lib/db";
import { parseManual } from "../lib/manual";
import { vectorLiteral } from "../lib/vector";

async function main() {
  const contentDir = path.join(process.cwd(), "content");
  const fileNames = fs
    .readdirSync(contentDir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  for (const fileName of fileNames) {
    const manual = parseManual(
      fs.readFileSync(path.join(contentDir, fileName), "utf8"),
      fileName,
    );
    const embeddings = await embedDocuments(
      manual.sections.map((section) => `${section.heading}\n${section.content}`),
    );

    await sql`
      INSERT INTO documents (id, product_id, title, version)
      VALUES (${manual.id}, ${manual.productId}, ${manual.title}, ${manual.version})
      ON CONFLICT (id) DO UPDATE
      SET product_id = EXCLUDED.product_id,
          title = EXCLUDED.title,
          version = EXCLUDED.version
    `;
    await sql`DELETE FROM doc_chunks WHERE document_id = ${manual.id}`;

    for (const [index, section] of manual.sections.entries()) {
      const vector = sql.unsafe(`'${vectorLiteral(embeddings[index])}'::vector`);
      await sql`
        INSERT INTO doc_chunks (id, document_id, heading, content, embedding)
        VALUES (
          ${`${manual.id}-${index + 1}`},
          ${manual.id},
          ${section.heading},
          ${section.content},
          ${vector}
        )
      `;
    }

    console.log(`${manual.title}：写入 ${manual.sections.length} 段`);
  }

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

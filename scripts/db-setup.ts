import fs from "node:fs";
import path from "node:path";
import { sql } from "../lib/db";

async function waitForDatabase() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

async function main() {
  await waitForDatabase();
  for (const fileName of ["schema.sql", "seed.sql"]) {
    const file = path.join(process.cwd(), "db", fileName);
    await sql.unsafe(fs.readFileSync(file, "utf8"));
    console.log(`已执行 ${fileName}`);
  }
  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

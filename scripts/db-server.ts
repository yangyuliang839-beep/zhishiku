import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = 54329;
const dataDir = path.join(process.cwd(), ".pgdata");
const db = new PGlite({
  dataDir,
  extensions: { vector },
});
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port,
  maxConnections: 10,
});

async function main() {
  await server.start();
  console.log(`本机 PostgreSQL 已启动：127.0.0.1:${port}`);
  console.log("数据目录：.pgdata");
  console.log("SQL 与 Docker 里的 PostgreSQL + pgvector 相同。已安装 Docker 时也可以改用 docker compose up -d。");
}

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

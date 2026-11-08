import postgres from "postgres";
import { loadEnv } from "./env";

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("缺少 DATABASE_URL。复制 .env.example 为 .env.local。");
}

export const sql = postgres(url, {
  max: 1,
  prepare: false,
});

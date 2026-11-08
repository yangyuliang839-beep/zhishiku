import fs from "node:fs";
import path from "node:path";

export function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  process.loadEnvFile(file);
}

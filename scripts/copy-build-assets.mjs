import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");

async function main() {
  const sourceSchemaPath = resolve(PROJECT_ROOT, "src/codex/result-schema.json");
  const targetSchemaPath = resolve(PROJECT_ROOT, "dist/codex/result-schema.json");

  await mkdir(dirname(targetSchemaPath), { recursive: true });
  await cp(sourceSchemaPath, targetSchemaPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

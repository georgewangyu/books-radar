import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const feedRoot = path.join(process.cwd(), "feeds");

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = (await collectMarkdownFiles(feedRoot)).sort();

  if (files.length === 0) {
    throw new Error("No Books Radar feed files found. Run npm run feed:weekly first.");
  }

  const latest = files.at(-1);
  const text = await readFile(latest, "utf8");

  process.stdout.write(text);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

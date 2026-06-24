import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir =
  process.env.GEORGESBOOKS_DIR || path.resolve(root, "..", "georgesbooks", "books");
const outputPath = path.join(root, "data", "books.json");

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = {};

  if (!match) {
    return fields;
  }

  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    fields[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }

  return fields;
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`(?:^|\\n)## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
  );

  return match?.[1]?.trim() || "";
}

function paragraphs(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function firstParagraph(markdown, heading, fallback = "") {
  return paragraphs(section(markdown, heading))[0] || fallback;
}

function listItems(text) {
  return text
    .split("\n")
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function fencedMarkdown(markdown) {
  const block = section(markdown, "Books Radar Markdown");
  const match = block.match(/```(?:md|markdown)?\n([\s\S]*?)\n```/i);
  return match?.[1]?.trimEnd() || "";
}

function buildFallbackMarkdown(fields, bestFor, nextStep) {
  return `# ${fields.title}

Author: ${fields.author}
Shelf: ${fields.shelf}

Why George recommends it:
${firstParagraph(fields.rawMarkdown, "Why George Recommends It")}

Best for:
${bestFor.map((item) => `- ${item}`).join("\n")}

Next step:
${nextStep}
`;
}

function toBook(markdown, sourcePath) {
  const fields = parseFrontmatter(markdown);
  const required = ["id", "title", "author", "shelf", "cadence", "status"];
  const missing = required.filter((field) => !fields[field]);

  if (missing.length > 0) {
    throw new Error(`${sourcePath} missing frontmatter fields: ${missing.join(", ")}`);
  }

  fields.rawMarkdown = markdown;

  const bestFor = listItems(section(markdown, "Best For"));
  const notes = listItems(section(markdown, "Notes"));
  const nextStep = firstParagraph(markdown, "Next Reading Action");
  const publicMarkdown = fencedMarkdown(markdown) || buildFallbackMarkdown(fields, bestFor, nextStep);

  return {
    id: fields.id,
    title: fields.title,
    author: fields.author,
    shelf: fields.shelf,
    cadence: fields.cadence,
    status: fields.status,
    year: fields.year || "",
    pages: fields.pages || "",
    summary: firstParagraph(markdown, "Summary"),
    whyRead: firstParagraph(markdown, "Why George Recommends It"),
    bestFor,
    notes,
    nextStep,
    sourceName: fields.source_name || "George shelf",
    sourceUrl: fields.source_url || "",
    markdown: `${publicMarkdown}\n`,
    radarOrder: Number.parseInt(fields.radar_order || "9999", 10),
  };
}

async function main() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  const books = [];
  const seenIds = new Set();

  for (const file of markdownFiles) {
    const sourcePath = path.join(sourceDir, file);
    const markdown = await readFile(sourcePath, "utf8");
    const book = toBook(markdown, sourcePath);

    if (seenIds.has(book.id)) {
      throw new Error(`Duplicate book id: ${book.id}`);
    }

    seenIds.add(book.id);
    books.push(book);
  }

  books.sort((left, right) => left.radarOrder - right.radarOrder || left.title.localeCompare(right.title));

  const publicBooks = books.map(({ radarOrder, ...book }) => book);
  await writeFile(outputPath, `${JSON.stringify(publicBooks, null, 2)}\n`, "utf8");

  console.log(`Synced ${publicBooks.length} books from ${sourceDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

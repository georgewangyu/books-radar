import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir =
  process.env.GEORGESBOOKS_DIR || path.resolve(root, "..", "georgesbooks", "books");
const outputPath = path.join(root, "data", "books.json");
const checkOnly = process.argv.includes("--check");

const unsafePublicPatterns = [
  { label: "TODO marker", pattern: /\bTODO\b/i },
  { label: "placeholder text", pattern: /\bplaceholder\b/i },
  { label: "scaffold text", pattern: /\bscaffold(?:ed|ing)?\b/i },
  { label: "Apple Books reference", pattern: /\bApple Books\b/i },
  { label: "annotation count language", pattern: /\bannotations?\b/i },
  { label: "highlight count language", pattern: /\bhighlights?\b/i },
  { label: "import log language", pattern: /\bimport(?:ed|er|ing|s)?\b/i },
  { label: "raw Apple Books export heading", pattern: /## Highlights, Notes, And Bookmarks/i },
  { label: "private Apple Books draft marker", pattern: /Private Apple Books/i },
  { label: "Apple Books asset id", pattern: /apple_books_asset_id/i },
  { label: "local filesystem path", pattern: /\/Users\// },
  { label: "dotenv or token path", pattern: /\.(?:env|tokens)\b/i },
  { label: "secret assignment", pattern: /\b(?:api[_-]?key|secret|password|GITHUB_TOKEN)\s*=/i },
  { label: "email address", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
];

const publicQualityPatterns = [
  { label: "awkward AI shelf article", pattern: /\bas a ai\b/i },
  { label: "lowercase AI shelf label", pattern: /\bai & future\b/ },
  { label: "duplicated generated sentence", pattern: /\bThis The useful move\b/i },
  {
    label: "duplicated recommendation sentence",
    pattern: /It also gives George[\s\S]{0,300}?It also gives George[\s\S]{0,300}?It also gives George/i,
  },
];

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

function sectionProse(markdown, heading, fallback = "") {
  return paragraphs(section(markdown, heading)).join("\n\n") || fallback;
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

function wrapMarkdownText(text, width = 88) {
  return paragraphs(text)
    .map((paragraph) => {
      const lines = [];
      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        if (!line) {
          line = word;
        } else if (`${line} ${word}`.length <= width) {
          line = `${line} ${word}`;
        } else {
          lines.push(line);
          line = word;
        }
      }

      if (line) {
        lines.push(line);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function wordCount(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function assertMinimumWords(errors, field, text, minimum) {
  const words = wordCount(text);

  if (words < minimum) {
    errors.push(`${field} is too thin: ${words} words, expected at least ${minimum}`);
  }
}

function validatePublicText(errors, label, text) {
  for (const { label: patternLabel, pattern } of unsafePublicPatterns) {
    if (pattern.test(text)) {
      errors.push(`${label} contains ${patternLabel}`);
    }
  }

  for (const { label: patternLabel, pattern } of publicQualityPatterns) {
    if (pattern.test(text)) {
      errors.push(`${label} contains ${patternLabel}`);
    }
  }
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

function buildPublicMarkdown(book) {
  return `# ${book.title}

Author: ${book.author}
Shelf: ${book.shelf}

Summary:
${wrapMarkdownText(book.fullSummary)}

Why George recommends it:
${wrapMarkdownText(book.whyRead)}

Best for:
${book.bestFor.map((item) => `- ${item}`).join("\n")}

George notes:
${book.notes.map((item) => `- ${item}`).join("\n")}

Next step:
${wrapMarkdownText(book.nextStep)}
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

  const book = {
    id: fields.id,
    title: fields.title,
    author: fields.author,
    shelf: fields.shelf,
    cadence: fields.cadence,
    status: fields.status,
    year: fields.year || "",
    pages: fields.pages || "",
    summary: firstParagraph(markdown, "Summary"),
    fullSummary: sectionProse(markdown, "Summary"),
    whyRead: firstParagraph(markdown, "Why George Recommends It"),
    bestFor,
    notes,
    nextStep,
    sourceName: fields.source_name || "George shelf",
    sourceUrl: fields.source_url || "",
    markdown: "",
    radarOrder: Number.parseInt(fields.radar_order || "9999", 10),
  };

  book.markdown = `${buildPublicMarkdown(book)}\n`;
  return book;
}

function validateBookSource(book, markdown, sourcePath) {
  const errors = [];
  assertMinimumWords(errors, "Summary", book.fullSummary, 90);
  assertMinimumWords(errors, "Why George Recommends It", book.whyRead, 45);
  assertMinimumWords(errors, "Next Reading Action", book.nextStep, 10);

  if (book.bestFor.length < 3) {
    errors.push(`Best For has ${book.bestFor.length} items, expected at least 3`);
  }

  if (book.notes.length < 4) {
    errors.push(`Notes has ${book.notes.length} items, expected at least 4`);
  }

  for (const [index, note] of book.notes.entries()) {
    assertMinimumWords(errors, `Notes item ${index + 1}`, note, 8);
  }

  assertMinimumWords(errors, "Books Radar Markdown", book.markdown, 180);

  validatePublicText(
    errors,
    "public book source",
    [
      book.summary,
      book.fullSummary,
      book.whyRead,
      book.nextStep,
      ...book.bestFor,
      ...book.notes,
      book.markdown,
    ].join("\n\n"),
  );

  return errors.map((error) => `${sourcePath}: ${error}`);
}

async function main() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  const books = [];
  const seenIds = new Set();
  const validationErrors = [];

  for (const file of markdownFiles) {
    const sourcePath = path.join(sourceDir, file);
    const markdown = await readFile(sourcePath, "utf8");
    const book = toBook(markdown, sourcePath);

    if (seenIds.has(book.id)) {
      throw new Error(`Duplicate book id: ${book.id}`);
    }

    validationErrors.push(...validateBookSource(book, markdown, sourcePath));

    seenIds.add(book.id);
    books.push(book);
  }

  if (validationErrors.length > 0) {
    throw new Error(`Book source validation failed:\n- ${validationErrors.join("\n- ")}`);
  }

  books.sort((left, right) => left.radarOrder - right.radarOrder || left.title.localeCompare(right.title));

  const publicBooks = books.map(({ radarOrder, ...book }) => book);
  if (!checkOnly) {
    await writeFile(outputPath, `${JSON.stringify(publicBooks, null, 2)}\n`, "utf8");
  }

  console.log(`${checkOnly ? "Validated" : "Synced"} ${publicBooks.length} books from ${sourceDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

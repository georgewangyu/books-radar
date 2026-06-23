import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const home = os.homedir();
const appleEpochMs = Date.UTC(2001, 0, 1);

const defaults = {
  annotationDb: path.join(
    home,
    "Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation/AEAnnotation_v10312011_1727_local.sqlite",
  ),
  libraryDb: path.join(
    home,
    "Library/Containers/com.apple.iBooksX/Data/Documents/BKLibrary/BKLibrary-1-091020131601.sqlite",
  ),
  iCloudBooksDir: path.join(home, "Library/Mobile Documents/iCloud~com~apple~iBooks/Documents"),
  outputDir: path.join(root, "imports/apple-books/drafts"),
  rawDir: path.join(root, "imports/apple-books/raw"),
  resolveUnknownLimit: 80,
};

function parseArgs(argv) {
  const args = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--annotation-db" && next) {
      args.annotationDb = path.resolve(next);
      index += 1;
    } else if (arg === "--library-db" && next) {
      args.libraryDb = path.resolve(next);
      index += 1;
    } else if (arg === "--icloud-books-dir" && next) {
      args.iCloudBooksDir = path.resolve(next);
      index += 1;
    } else if (arg === "--output-dir" && next) {
      args.outputDir = path.resolve(next);
      index += 1;
    } else if (arg === "--raw-dir" && next) {
      args.rawDir = path.resolve(next);
      index += 1;
    } else if (arg === "--resolve-unknown-limit" && next) {
      args.resolveUnknownLimit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--skip-epub-scan") {
      args.resolveUnknownLimit = 0;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: npm run import:apple-books -- [options]

Options:
  --annotation-db <path>           Apple Books annotation SQLite database
  --library-db <path>              Apple Books library SQLite database
  --icloud-books-dir <path>        Synced iCloud Books documents folder
  --output-dir <path>              Markdown draft output folder
  --raw-dir <path>                 Raw import summary output folder
  --resolve-unknown-limit <n>      Max unresolved assets to infer from EPUB text
  --skip-epub-scan                 Only use Apple Books library metadata
`);
}

async function copySqliteBundle(source, tempDir, name) {
  if (!existsSync(source)) {
    throw new Error(`Missing Apple Books database: ${source}`);
  }

  const target = path.join(tempDir, name);
  await cp(source, target);

  for (const suffix of ["-wal", "-shm"]) {
    const companion = `${source}${suffix}`;
    if (existsSync(companion)) {
      await cp(companion, `${target}${suffix}`);
    }
  }

  return target;
}

function sqliteJson(dbPath, sql) {
  const output = execFileSync("sqlite3", [dbPath, "-json", sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  }).trim();

  return output ? JSON.parse(output) : [];
}

function compactText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForSearch(value) {
  return compactText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || fallback;
}

function appleDate(seconds) {
  if (seconds === null || seconds === undefined || seconds === "") return "";

  const date = new Date(appleEpochMs + Number(seconds) * 1000);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function annotationKind(type) {
  if (type === 2) return "highlight";
  if (type === 1) return "bookmark";
  if (type === 3) return "bookmark";
  return `type-${type}`;
}

async function collectFiles(dir, predicate, maxDepth = 8, depth = 0) {
  if (depth > maxDepth) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, predicate, maxDepth, depth + 1)));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function parseOpf(epubDir) {
  const opfFiles = await collectFiles(epubDir, (file) => file.toLowerCase().endsWith(".opf"), 5);
  const opfPath = opfFiles[0];

  if (!opfPath) {
    return {
      title: path.basename(epubDir, path.extname(epubDir)),
      author: "",
    };
  }

  const xml = await readFile(opfPath, "utf8");
  const title = decodeXml(xml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]).trim();
  const author = decodeXml(xml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1]).trim();

  return {
    title: title || path.basename(epubDir, path.extname(epubDir)),
    author,
  };
}

async function findEpubCandidates(iCloudBooksDir) {
  if (!existsSync(iCloudBooksDir)) return [];

  const entries = await readdir(iCloudBooksDir, { withFileTypes: true });
  const epubDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().endsWith(".epub"))
    .map((entry) => path.join(iCloudBooksDir, entry.name));

  const candidates = [];

  for (const epubDir of epubDirs) {
    candidates.push({
      dir: epubDir,
      metadata: await parseOpf(epubDir),
      text: null,
    });
  }

  return candidates;
}

async function candidateText(candidate) {
  if (candidate.text !== null) return candidate.text;

  const textFiles = await collectFiles(
    candidate.dir,
    (file) => /\.(html?|xhtml|xml|opf|ncx|txt)$/i.test(file),
    8,
  );
  const chunks = [];

  for (const file of textFiles) {
    const info = await stat(file);
    if (info.size > 1024 * 1024) continue;
    chunks.push(await readFile(file, "utf8"));
  }

  candidate.text = normalizeForSearch(decodeXml(chunks.join(" ")));
  return candidate.text;
}

function snippetsFor(annotations) {
  const snippets = [];

  for (const annotation of annotations) {
    for (const field of ["selectedText", "representativeText", "chapter"]) {
      const normalized = normalizeForSearch(annotation[field]);
      if (normalized.length >= 48) {
        snippets.push(normalized.slice(0, 180));
      }
    }
  }

  return [...new Set(snippets)].sort((left, right) => right.length - left.length).slice(0, 8);
}

async function inferMetadataFromEpubs(annotations, candidates) {
  const snippets = snippetsFor(annotations);
  if (snippets.length === 0) return null;

  for (const candidate of candidates) {
    const text = await candidateText(candidate);

    if (snippets.some((snippet) => text.includes(snippet))) {
      return {
        ...candidate.metadata,
        source: "epub-scan",
        path: candidate.dir,
      };
    }
  }

  return null;
}

function groupByAsset(annotations) {
  const groups = new Map();

  for (const annotation of annotations) {
    const group = groups.get(annotation.assetId) || [];
    group.push(annotation);
    groups.set(annotation.assetId, group);
  }

  return groups;
}

function renderAnnotation(annotation, index) {
  const created = appleDate(annotation.created);
  const modified = appleDate(annotation.modified);
  const selectedText = compactText(annotation.selectedText);
  const note = compactText(annotation.note);
  const representativeText = compactText(annotation.representativeText);
  const chapter = compactText(annotation.chapter);
  const parts = [`### ${index}. ${annotationKind(annotation.type)}`];

  if (created) parts.push(`- Created: ${created}`);
  if (modified && modified !== created) parts.push(`- Modified: ${modified}`);
  if (chapter) parts.push(`- Section: ${chapter}`);
  if (annotation.location) parts.push(`- Location: \`${annotation.location}\``);

  if (selectedText) {
    parts.push("", `> ${selectedText.replace(/\n/g, "\n> ")}`);
  } else if (representativeText) {
    parts.push("", `Context: ${representativeText}`);
  }

  if (note) {
    parts.push("", `George note: ${note}`);
  }

  return parts.join("\n");
}

function renderMarkdown({ assetId, metadata, annotations, generatedAt }) {
  const title = metadata.title || `Apple Books Asset ${assetId.slice(0, 8)}`;
  const author = metadata.author || "Unknown";
  const highlights = annotations.filter((annotation) => compactText(annotation.selectedText)).length;
  const notes = annotations.filter((annotation) => compactText(annotation.note)).length;
  const bookmarks = annotations.filter((annotation) => !compactText(annotation.selectedText) && !compactText(annotation.note)).length;

  return `---
source: "apple-books"
privacy: "private-draft"
title: ${yamlString(title)}
author: ${yamlString(author)}
apple_books_asset_id: ${yamlString(assetId)}
metadata_source: ${yamlString(metadata.source || "asset-id")}
annotation_count: ${annotations.length}
highlight_count: ${highlights}
note_count: ${notes}
bookmark_count: ${bookmarks}
generated_at: ${yamlString(generatedAt)}
---

# ${title}

Author: ${author}

> Private Apple Books draft. Rewrite before copying anything into the public Books Radar shelf.

## Public Recommendation Draft

- Why George recommends it: TODO
- Best for: TODO
- Next reading action: TODO
- Public note to copy into \`data/books.json\`: TODO

## Import Summary

- Apple Books asset ID: \`${assetId}\`
- Metadata source: ${metadata.source || "asset-id"}
- Annotation count: ${annotations.length}
- Highlights with selected text: ${highlights}
- Notes: ${notes}
- Bookmarks / location-only rows: ${bookmarks}

## Highlights, Notes, And Bookmarks

${annotations.map((annotation, index) => renderAnnotation(annotation, index + 1)).join("\n\n")}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tempDir = path.join(os.tmpdir(), `books-radar-apple-books-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  await mkdir(args.outputDir, { recursive: true });
  await mkdir(args.rawDir, { recursive: true });

  try {
    const annotationDb = await copySqliteBundle(args.annotationDb, tempDir, "annotations.sqlite");
    const libraryDb = await copySqliteBundle(args.libraryDb, tempDir, "library.sqlite");
    const generatedAt = new Date().toISOString();

    const libraryRows = sqliteJson(
      libraryDb,
      `select
        ZASSETID as assetId,
        ZTITLE as title,
        ZAUTHOR as author,
        ZGENRE as genre,
        ZPATH as path,
        ZREADINGPROGRESS as readingProgress
      from ZBKLIBRARYASSET
      where ZASSETID is not null;`,
    );
    const metadataByAsset = new Map(
      libraryRows.map((row) => [
        row.assetId,
        {
          title: row.title,
          author: row.author,
          genre: row.genre,
          path: row.path,
          readingProgress: row.readingProgress,
          source: "library-db",
        },
      ]),
    );

    const annotations = sqliteJson(
      annotationDb,
      `select
        ZANNOTATIONASSETID as assetId,
        ZANNOTATIONTYPE as type,
        ZANNOTATIONSTYLE as style,
        ZANNOTATIONCREATIONDATE as created,
        ZANNOTATIONMODIFICATIONDATE as modified,
        ZANNOTATIONLOCATION as location,
        ZANNOTATIONNOTE as note,
        ZANNOTATIONREPRESENTATIVETEXT as representativeText,
        ZANNOTATIONSELECTEDTEXT as selectedText,
        ZFUTUREPROOFING5 as chapter,
        ZANNOTATIONUUID as uuid
      from ZAEANNOTATION
      where coalesce(ZANNOTATIONDELETED, 0) = 0
      order by ZANNOTATIONASSETID, ZANNOTATIONCREATIONDATE;`,
    ).filter((annotation) => annotation.assetId);

    const groups = groupByAsset(annotations);
    const sortedGroups = [...groups.entries()].sort((left, right) => right[1].length - left[1].length);
    const unresolved = sortedGroups.filter(([assetId]) => !metadataByAsset.has(assetId));
    const candidates = args.resolveUnknownLimit > 0 ? await findEpubCandidates(args.iCloudBooksDir) : [];

    let inferredCount = 0;
    for (const [assetId, group] of unresolved.slice(0, args.resolveUnknownLimit)) {
      const inferred = await inferMetadataFromEpubs(group, candidates);
      if (inferred) {
        metadataByAsset.set(assetId, inferred);
        inferredCount += 1;
      }
    }

    const written = [];
    for (const [assetId, group] of sortedGroups) {
      const metadata = metadataByAsset.get(assetId) || {
        title: `Apple Books Asset ${assetId.slice(0, 8)}`,
        author: "Unknown",
        source: "asset-id",
      };
      const slug = slugify(metadata.title, `asset-${assetId.slice(0, 12).toLowerCase()}`);
      const fileName = `${slug}-${assetId.slice(0, 8).toLowerCase()}.md`;
      const filePath = path.join(args.outputDir, fileName);

      await writeFile(filePath, renderMarkdown({ assetId, metadata, annotations: group, generatedAt }), "utf8");
      written.push({
        file: path.relative(root, filePath),
        assetId,
        title: metadata.title,
        author: metadata.author,
        metadataSource: metadata.source,
        annotations: group.length,
      });
    }

    const summary = {
      generatedAt,
      outputDir: path.relative(root, args.outputDir),
      rawDir: path.relative(root, args.rawDir),
      annotationRows: annotations.length,
      booksWithAnnotations: groups.size,
      libraryMetadataRows: libraryRows.length,
      libraryResolvedBooks: sortedGroups.filter(([assetId]) => metadataByAsset.get(assetId)?.source === "library-db").length,
      epubInferredBooks: inferredCount,
      unresolvedBooks: sortedGroups.filter(([assetId]) => !metadataByAsset.has(assetId)).length,
      written,
    };

    await writeFile(path.join(args.rawDir, "last-import-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...summary, written: written.length }, null, 2));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

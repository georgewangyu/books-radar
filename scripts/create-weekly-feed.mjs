import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const booksPath = path.join(root, "data", "books.json");
const memoryPath = path.join(root, "memory", "seen-book-ids.json");
const feedRoot = path.join(root, "feeds");
const maxFeatured = 7;

function localDate() {
  if (process.env.BOOKS_RADAR_FEED_DATE) {
    return process.env.BOOKS_RADAR_FEED_DATE;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

async function readBooks() {
  return JSON.parse(await readFile(booksPath, "utf8"));
}

async function readSeenIds() {
  if (process.env.BOOKS_RADAR_FEED_RESET === "1") {
    return new Set();
  }

  try {
    const raw = await readFile(memoryPath, "utf8");
    const parsed = JSON.parse(raw);

    return new Set(Array.isArray(parsed.bookIds) ? parsed.bookIds : []);
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Set();
    }

    throw error;
  }
}

function bookScore(book) {
  let score = 0;
  if (book.status === "featured") score += 5;
  if (book.cadence === "daily") score += 3;
  if (book.cadence === "weekly") score += 2;
  if (/engineering|models|design|judgment|taste/i.test(book.shelf)) score += 1;
  return score;
}

function selectFeatured(books, seenIds) {
  const publicBooks = books.filter((book) => book.status !== "draft");
  const newBooks = publicBooks.filter((book) => !seenIds.has(book.id));
  const pool = newBooks.length > 0 ? newBooks : publicBooks;

  return {
    featured: [...pool]
      .sort((left, right) => bookScore(right) - bookScore(left) || left.title.localeCompare(right.title))
      .slice(0, maxFeatured),
    hasNewBooks: newBooks.length > 0,
    newBookCount: newBooks.length,
  };
}

function dailyRotation(featured) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return days.map((day, index) => ({
    day,
    book: featured[index % featured.length],
  }));
}

function oneLine(value) {
  return value.replace(/\s+/g, " ").trim();
}

function renderFeed({ date, books, featured, hasNewBooks, newBookCount }) {
  const shelves = new Set(books.map((book) => book.shelf));
  const rotation = dailyRotation(featured);
  const bookIds = featured.map((book) => book.id);

  return `# Books Radar Weekly Feed - ${date}

Updated from the public Books Radar shelf.

<!-- books-radar-feed-version: 1 -->
<!-- featured-book-ids: ${bookIds.join(", ")} -->

## Summary

- Catalog count: ${books.length} books across ${shelves.size} shelves.
- New books since the last feed: ${hasNewBooks ? newBookCount : 0}.
- Featured this week: ${featured.length}.
- Feed mode: ${hasNewBooks ? "new books first" : "rotation from the existing shelf"}.

## Featured Books

${featured
  .map(
    (book) => `- [${book.title}](https://booksradar.snackoverflowgeorge.com/books/${book.id})
  - Author: ${book.author}
  - Shelf: ${book.shelf}
  - Cadence: ${book.cadence}
  - Why it matters: ${oneLine(book.summary)}
  - Source: ${book.sourceUrl}`,
  )
  .join("\n\n")}

## Daily Recommendation Rotation

Use these as lightweight daily picks until the next weekly refresh.

${rotation.map((entry) => `- ${entry.day}: [${entry.book.title}](https://booksradar.snackoverflowgeorge.com/books/${entry.book.id})`).join("\n")}

## Agent Setup Prompt

Ask your agent:

\`\`\`text
Use Books Radar. Read the latest weekly feed, choose one book for me,
summarize why George recommends it, and give me one concrete reading prompt.
\`\`\`

## Daily Outlook Prompt

For a compact daily recommendation, ask:

\`\`\`text
Use Books Radar and give me today's pick. Keep it compact:
book, why now, best for, and one next reading action.
\`\`\`

## Source Receipts

${featured.map((book) => `- ${book.sourceUrl}`).join("\n")}
`;
}

async function main() {
  const date = localDate();
  const [year, month] = date.split("-");
  const books = await readBooks();
  const seenIds = await readSeenIds();
  const selection = selectFeatured(books, seenIds);
  const feedDir = path.join(feedRoot, year, month);
  const feedPath = path.join(feedDir, `${date}.md`);

  await mkdir(feedDir, { recursive: true });
  await mkdir(path.dirname(memoryPath), { recursive: true });
  await writeFile(feedPath, renderFeed({ date, books, seenIds, ...selection }), "utf8");
  await writeFile(
    memoryPath,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        bookCount: books.length,
        bookIds: books.map((book) => book.id).sort(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        feedPath,
        featuredCount: selection.featured.length,
        hasNewBooks: selection.hasNewBooks,
        newBookCount: selection.newBookCount,
        bookCount: books.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

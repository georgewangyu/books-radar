"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/books";
import { cadences, getTodaysBook, shelves, statuses } from "@/lib/books";

type Status = "idle" | "submitting" | "success" | "error";
type SortMode = "radar" | "title" | "shelf" | "newest";

type ErrorResponse = {
  error?: string;
  issues?: Record<string, string[] | undefined>;
};

type Props = {
  books: Book[];
};

const submissionTypes = [
  ["submit-book", "Submit book"],
  ["request-book", "Request book"],
  ["improve-note", "Improve note"],
] as const;

const sortOptions: Array<[SortMode, string]> = [
  ["radar", "Radar order"],
  ["title", "A-Z"],
  ["shelf", "Shelf"],
  ["newest", "Newest first"],
];

const issueLabels: Record<string, string> = {
  title: "Book title",
  outcome: "Why this fits",
  notes: "Rough note",
  context: "Link or context",
  handle: "Handle",
};

const skillInstallCommand =
  "npx skills add georgewangyu/books-radar --skill books-radar -g";

const creatorLinks = [
  ["GitHub", "https://github.com/georgewangyu"],
  ["X", "https://x.com/georgewangyu"],
  ["Email", "mailto:hellogeorgehq@gmail.com"],
  ["Instagram", "https://www.instagram.com/snackoverflowgeorge/"],
  ["TikTok", "https://www.tiktok.com/@snackoverflowgeorge"],
  ["YouTube", "https://www.youtube.com/@snackoverflowgeorge"],
  ["LinkedIn", "https://www.linkedin.com/in/georgewangyu/"],
] as const;

function statusRank(book: Book) {
  if (book.status === "featured") return 3;
  if (book.status === "ready") return 2;
  return 1;
}

function sortBooks(items: Book[], sortMode: SortMode) {
  if (sortMode === "title") {
    return [...items].sort((left, right) => left.title.localeCompare(right.title));
  }

  if (sortMode === "shelf") {
    return [...items].sort(
      (left, right) =>
        left.shelf.localeCompare(right.shelf) ||
        right.status.localeCompare(left.status) ||
        left.title.localeCompare(right.title),
    );
  }

  if (sortMode === "newest") {
    return [...items].sort((left, right) => right.year.localeCompare(left.year));
  }

  return [...items].sort(
    (left, right) =>
      statusRank(right) - statusRank(left) ||
      left.cadence.localeCompare(right.cadence) ||
      left.title.localeCompare(right.title),
  );
}

async function errorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Something went wrong. Try again or send the idea another way.";
  }

  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(
    ([field, messages]) =>
      (messages || []).map((message) => `${issueLabels[field] || field}: ${message}`),
  );

  return fieldMessages.length > 0
    ? fieldMessages.join(" ")
    : body?.error || "Please check the form and try again.";
}

export function BooksRadarApp({ books }: Props) {
  const todaysBook = getTodaysBook();
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState("All");
  const [cadence, setCadence] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("radar");
  const [selectedId, setSelectedId] = useState(todaysBook.id);
  const [submissionType, setSubmissionType] = useState("request-book");
  const [formStatus, setFormStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return books.filter((book) => {
      const matchesShelf = shelf === "All" || book.shelf === shelf;
      const matchesCadence = cadence === "All" || book.cadence === cadence;
      const matchesStatus = status === "All" || book.status === status;
      const haystack = [
        book.title,
        book.author,
        book.shelf,
        book.cadence,
        book.status,
        book.summary,
        book.fullSummary,
        book.whyRead,
        book.bestFor.join(" "),
        book.notes.join(" "),
        book.markdown,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesShelf &&
        matchesCadence &&
        matchesStatus &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [books, cadence, query, shelf, status]);

  const sortedBooks = useMemo(
    () => sortBooks(filteredBooks, sortMode),
    [filteredBooks, sortMode],
  );
  const selectedBook =
    books.find((book) => book.id === selectedId) || sortedBooks[0] || todaysBook;

  useEffect(() => {
    if (sortedBooks.length > 0 && !sortedBooks.some((book) => book.id === selectedId)) {
      setSelectedId(sortedBooks[0].id);
    }
  }, [selectedId, sortedBooks]);

  async function copyBookNote(book: Book) {
    await navigator.clipboard.writeText(book.markdown);
    setCopied(book.id);
    window.setTimeout(() => setCopied(""), 1400);
  }

  async function copySetupCommand() {
    await navigator.clipboard.writeText(skillInstallCommand);
    setCopied("setup-command");
    window.setTimeout(() => setCopied(""), 1400);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormStatus("submitting");
    setError("");

    const form = new FormData(formElement);
    const payload = {
      submissionType: String(form.get("submissionType") || submissionType),
      visibility: String(form.get("visibility") || "public"),
      title: String(form.get("title") || ""),
      outcome: String(form.get("outcome") || ""),
      notes: String(form.get("notes") || ""),
      context: String(form.get("context") || ""),
      handle: String(form.get("handle") || ""),
      website: String(form.get("website") || ""),
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setFormStatus("error");
        setError(await errorMessageFor(response));
        return;
      }

      formElement.reset();
      setSubmissionType("request-book");
      setFormStatus("success");
    } catch {
      setFormStatus("error");
      setError("Something went wrong. Try again or send the idea another way.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="mark">BR</span>
          <span>Books Radar</span>
        </a>
        <nav className="nav-pills" aria-label="Page navigation">
          <a href="#catalog">Catalog</a>
          <a href="#today">Today</a>
          <a href="#request">Request</a>
        </nav>
        <a className="primary nav-submit" href="#request">
          Request a recommendation
        </a>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy-block">
          <h1 id="page-title">Books Radar</h1>
          <p className="hero-line">Read what compounds.</p>
          <p className="hero-copy">
            Daily and weekly book recommendations from George, without turning
            reading into a social network.
          </p>
          <nav className="creator-links" aria-label="George links">
            {creatorLinks.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <aside className="hero-note" id="today">
          <span>Today's pick</span>
          <strong>{todaysBook.title}</strong>
          <p>{todaysBook.summary}</p>
          <button
            className="text-button"
            onClick={() => setSelectedId(todaysBook.id)}
            type="button"
          >
            Open note
          </button>
        </aside>
      </section>

      <section className="agent-setup" aria-labelledby="agent-setup-title">
        <div>
          <h2 id="agent-setup-title">Get one recommendation in your agent.</h2>
          <p>
            Install the skill for daily or weekly picks, a compact reading note,
            and a small prompt for what to do with the book next.
          </p>
        </div>
        <div className="setup-command">
          <code>{skillInstallCommand}</code>
          <div className="setup-actions">
            <button onClick={copySetupCommand} type="button">
              {copied === "setup-command" ? "Copied" : "Copy command"}
            </button>
            <a href="#catalog">Browse the shelf</a>
          </div>
        </div>
      </section>

      <section className="book-grid" id="catalog" aria-label="Books catalog">
        <aside className="book-nav" aria-label="Catalog filters">
          <p className="rail-title">Shelf</p>
          <div className="rail-list">
            {["All", ...shelves].map((item) => (
              <button
                className={shelf === item ? "rail-item active" : "rail-item"}
                key={item}
                onClick={() => setShelf(item)}
                type="button"
              >
                <span>{item}</span>
                <span>
                  {item === "All"
                    ? books.length
                    : books.filter((book) => book.shelf === item).length}
                </span>
              </button>
            ))}
          </div>

          <p className="rail-title lower">Cadence</p>
          <div className="rail-list">
            {["All", ...cadences].map((item) => (
              <button
                className={cadence === item ? "rail-item active" : "rail-item"}
                key={item}
                onClick={() => setCadence(item)}
                type="button"
              >
                <span>{item}</span>
                <span>
                  {item === "All"
                    ? books.length
                    : books.filter((book) => book.cadence === item).length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="book-main" aria-label="Books">
          <div className="catalog-toolbar">
            <label className="search-input">
              <span className="sr-only">Search books</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search books, authors, shelves..."
              />
            </label>
            <div className="toolbar-selects" aria-label="Catalog filters">
              <label className="select-control">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  {sortOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="select-control">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="All">All status</option>
                  {statuses.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="list-meta">
            <span>
              {sortedBooks.length} matching books
              {sortedBooks.length > 0 ? ` / ${books.length} on the shelf` : ""}
            </span>
            <span className="sort-note">
              {sortOptions.find(([value]) => value === sortMode)?.[1]}
            </span>
            {(query || shelf !== "All" || cadence !== "All" || status !== "All") && (
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setShelf("All");
                  setCadence("All");
                  setStatus("All");
                  setSortMode("radar");
                }}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="book-columns">
            <div className="book-table">
              {sortedBooks.length > 0 ? (
                sortedBooks.map((book) => (
                  <article
                    className={selectedBook.id === book.id ? "book-row selected" : "book-row"}
                    id={book.id}
                    key={book.id}
                    onFocus={() => setSelectedId(book.id)}
                    onMouseEnter={() => setSelectedId(book.id)}
                  >
                    <Link
                      className="book-row-main"
                      href={`/books/${book.id}`}
                    >
                      <span className="book-kicker">
                        {book.shelf} / {book.cadence}
                      </span>
                      <span className="book-title">{book.title}</span>
                      <span className="book-author">by {book.author}</span>
                      <span className="book-desc">{book.summary}</span>
                    </Link>
                    <button
                      className="copy book-copy"
                      onClick={() => copyBookNote(book)}
                      type="button"
                    >
                      {copied === book.id ? "Copied" : "Copy note"}
                    </button>
                    <Link className="text-button row-open" href={`/books/${book.id}`}>
                      Open
                    </Link>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h2>No matching books</h2>
                  <p>Try clearing a filter or request the recommendation you expected.</p>
                </div>
              )}
            </div>

            <aside className="book-detail" aria-label="Selected book detail">
              <div className="detail-heading">
                <span>{selectedBook.status}</span>
                <strong>{selectedBook.cadence}</strong>
              </div>
              <h2>{selectedBook.title}</h2>
              <p className="detail-author">by {selectedBook.author}</p>
              <p>{selectedBook.whyRead}</p>
              <div className="mini-meta-grid">
                <div>
                  <span>Shelf</span>
                  <strong>{selectedBook.shelf}</strong>
                </div>
                <div>
                  <span>Year</span>
                  <strong>{selectedBook.year}</strong>
                </div>
                <div>
                  <span>Length</span>
                  <strong>{selectedBook.pages} pages</strong>
                </div>
              </div>
              <div className="note-list">
                <span>George note</span>
                {selectedBook.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
              <div className="next-step">
                <span>Next step</span>
                <p>{selectedBook.nextStep}</p>
              </div>
              <div className="detail-actions">
                <button
                  className="primary"
                  onClick={() => copyBookNote(selectedBook)}
                  type="button"
                >
                  {copied === selectedBook.id ? "Copied" : "Copy note"}
                </button>
                <Link href={`/books/${selectedBook.id}`}>Full note</Link>
              </div>
            </aside>
          </div>
        </section>
      </section>

      <section className="request-section" id="request">
        <div>
          <h2>Request a recommendation</h2>
          <p>
            Ask for a book, suggest one for the shelf, or improve a note. Public
            candidate is the default; private review is available for rougher
            ideas.
          </p>
        </div>

        <form className="submit-form" onSubmit={onSubmit}>
          <input className="trap" name="website" tabIndex={-1} autoComplete="off" />
          <input name="submissionType" type="hidden" value={submissionType} />

          <section className="field field-wide">
            <span className="label">Request type</span>
            <div className="chips">
              {submissionTypes.map(([value, label]) => (
                <button
                  className={submissionType === value ? "chip active" : "chip"}
                  key={value}
                  onClick={() => setSubmissionType(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <label className="field">
            <span className="label">Issue route</span>
            <select name="visibility" defaultValue="public">
              <option value="public">Public candidate</option>
              <option value="private">Private review</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Handle optional</span>
            <input name="handle" placeholder="@handle or leave blank" />
          </label>

          <label className="field field-wide">
            <span className="label">Book title</span>
            <input
              name="title"
              placeholder="Book, author, or reading problem"
              minLength={4}
              maxLength={120}
              required
            />
          </label>

          <label className="field field-wide">
            <span className="label">Why this fits</span>
            <textarea
              name="outcome"
              placeholder="What should this help someone understand, decide, or build?"
              minLength={10}
              maxLength={1200}
              required
            />
          </label>

          <label className="field field-wide">
            <span className="label">Rough note</span>
            <textarea
              name="notes"
              placeholder="Paste context, a short note, or what kind of recommendation you want..."
              minLength={10}
              maxLength={2500}
              required
            />
          </label>

          <label className="field field-wide">
            <span className="label">Link or context</span>
            <input name="context" placeholder="Optional book page, post, list, or note" />
          </label>

          <div className="actions field-wide">
            <button disabled={formStatus === "submitting"} type="submit">
              {formStatus === "submitting" ? "Sending..." : "Create request"}
            </button>
          </div>

          {formStatus === "success" ? (
            <div className="notice success field-wide">
              Request sent. If it has signal, it goes into the Books Radar queue.
            </div>
          ) : null}

          {formStatus === "error" ? (
            <div className="notice error field-wide">{error}</div>
          ) : null}
        </form>
      </section>
    </main>
  );
}

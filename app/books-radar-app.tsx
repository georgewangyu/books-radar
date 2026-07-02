"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/books";
import { getTodaysBook, shelves, statuses } from "@/lib/books";

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

const skillInstallCommands = [
  {
    id: "books-radar",
    label: "Recommendation skill",
    command: "npx skills add georgewangyu/books-radar --skill books-radar -g",
  },
  {
    id: "books-radar-reading-guide",
    label: "Reading guide skill",
    command:
      "npx skills add georgewangyu/books-radar --skill books-radar-reading-guide -g",
  },
] as const;
const skillRepoUrl = "https://github.com/georgewangyu/books-radar";
const leadStorageKey = "books-radar-install-unlocked";
const pageSize = 12;

const creatorLinks = [
  ["GitHub", "https://github.com/georgewangyu"],
  ["X", "https://x.com/georgewangyu"],
  ["Email", "mailto:hellogeorgehq@gmail.com"],
  ["Instagram", "https://www.instagram.com/snackoverflowgeorge/"],
  ["TikTok", "https://www.tiktok.com/@snackoverflowgeorge"],
  ["YouTube", "https://www.youtube.com/@snackoverflowgeorge"],
  ["LinkedIn", "https://www.linkedin.com/in/georgewangyu/"],
] as const;

const leadLabels: Record<string, string> = {
  email: "Email",
  name: "Name",
};

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

async function leadErrorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Could not unlock the install command. Try again in a moment.";
  }

  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(
    ([field, messages]) =>
      (messages || []).map((message) => `${leadLabels[field] || field}: ${message}`),
  );

  return fieldMessages.length > 0
    ? fieldMessages.join(" ")
    : body?.error || "Please check the fields and try again.";
}

export function BooksRadarApp({ books }: Props) {
  const todaysBook = getTodaysBook();
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("radar");
  const [selectedId, setSelectedId] = useState(todaysBook.id);
  const [submissionType, setSubmissionType] = useState("request-book");
  const [formStatus, setFormStatus] = useState<Status>("idle");
  const [leadStatus, setLeadStatus] = useState<Status>("idle");
  const [leadUnlocked, setLeadUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");
  const [copied, setCopied] = useState("");
  const [page, setPage] = useState(1);
  const shelfCounts = useMemo(
    () =>
      new Map<string, number>(
        shelves.map((item) => [
          item,
          books.filter((book) => book.shelf === item).length,
        ]),
      ),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return books.filter((book) => {
      const matchesShelf = shelf === "All" || book.shelf === shelf;
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
        matchesStatus &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [books, query, shelf, status]);

  const sortedBooks = useMemo(
    () => sortBooks(filteredBooks, sortMode),
    [filteredBooks, sortMode],
  );
  const pageCount = Math.max(1, Math.ceil(sortedBooks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedBooks.length);
  const visibleBooks = sortedBooks.slice(pageStart, pageEnd);
  const selectedBook =
    visibleBooks.find((book) => book.id === selectedId) ||
    visibleBooks[0] ||
    sortedBooks[0] ||
    todaysBook;

  useEffect(() => {
    setPage(1);
  }, [query, shelf, sortMode, status]);

  useEffect(() => {
    if (visibleBooks.length > 0 && !visibleBooks.some((book) => book.id === selectedId)) {
      setSelectedId(visibleBooks[0].id);
    }
  }, [selectedId, visibleBooks]);

  useEffect(() => {
    setLeadUnlocked(window.localStorage.getItem(leadStorageKey) === "true");
  }, []);

  async function copyBookNote(book: Book) {
    await navigator.clipboard.writeText(book.markdown);
    setCopied(book.id);
    window.setTimeout(() => setCopied(""), 1400);
  }

  async function copySetupCommand(command: string, id: string) {
    await navigator.clipboard.writeText(command);
    setCopied(`setup-command-${id}`);
    window.setTimeout(() => setCopied(""), 1400);
  }

  async function onLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLeadStatus("submitting");
    setLeadError("");

    const form = new FormData(formElement);
    const payload = {
      email: String(form.get("email") || ""),
      name: String(form.get("name") || ""),
      website: String(form.get("website") || ""),
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setLeadStatus("error");
        setLeadError(await leadErrorMessageFor(response));
        return;
      }

      window.localStorage.setItem(leadStorageKey, "true");
      setLeadUnlocked(true);
      setLeadStatus("success");
    } catch {
      setLeadStatus("error");
      setLeadError("Could not unlock the install command. Try again in a moment.");
    }
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
        <a className="brand" href="/">
          <span className="mark">BR</span>
          <span>Books Radar</span>
        </a>
        <nav className="nav-pills" aria-label="Page navigation">
          <a href="#catalog">Catalog</a>
          <a href="/queue">Explore</a>
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
          <div className="creator-links-block">
            <p className="creator-links-title">Created by George</p>
            <nav className="creator-links" aria-label="George links">
              {creatorLinks.map(([label, href]) => (
                <a href={href} key={label}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        <aside className="hero-note" id="today">
          <span>Today's pick</span>
          <strong>{todaysBook.title}</strong>
          <p>{todaysBook.summary}</p>
          <Link
            className="text-button"
            href={`/books/${todaysBook.id}`}
          >
            Open note
          </Link>
        </aside>
      </section>

      <section className="agent-setup" aria-labelledby="agent-setup-title">
        <div>
          <h2 id="agent-setup-title">Get Books Radar in your agent.</h2>
          <p>
            Install the recommendation skill for daily or weekly picks, or add
            the reading guide for spoiler-aware book maps and read-depth decisions.
          </p>
        </div>
        {leadUnlocked ? (
          <div className="setup-command" aria-live="polite">
            {skillInstallCommands.map((skill) => (
              <div className="setup-command-row" key={skill.id}>
                <span>{skill.label}</span>
                <code>{skill.command}</code>
                <button
                  onClick={() => copySetupCommand(skill.command, skill.id)}
                  type="button"
                >
                  {copied === `setup-command-${skill.id}` ? "Copied" : "Copy command"}
                </button>
              </div>
            ))}
            <div className="setup-actions">
              <a href={skillRepoUrl}>Star the repo</a>
              <a href="#catalog">Browse the shelf</a>
            </div>
            <p className="setup-support">
              Star Books Radar to save it and support the project.
            </p>
          </div>
        ) : (
          <form className="unlock-form" onSubmit={onLeadSubmit}>
            <input className="trap" name="website" tabIndex={-1} autoComplete="off" />
            <label>
              <span>Name</span>
              <input
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </label>
            <button disabled={leadStatus === "submitting"} type="submit">
              {leadStatus === "submitting" ? "Unlocking..." : "Unlock install command"}
            </button>
            <p className="unlock-note">
              Unlocks the skill command and occasional Radar updates. No spam.
            </p>
            {leadStatus === "error" ? (
              <div className="notice error">{leadError}</div>
            ) : null}
          </form>
        )}
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
                    : shelfCounts.get(item) ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="book-main" aria-label="Books">
          <div className="mobile-filter-bar" aria-label="Compact catalog filters">
            <label className="select-control">
              <span>Shelf</span>
              <select
                aria-label="Shelf filter"
                value={shelf}
                onChange={(event) => setShelf(event.target.value)}
              >
                <option value="All">All shelves ({books.length})</option>
                {shelves.map((item) => (
                  <option value={item} key={item}>
                    {item} ({shelfCounts.get(item) ?? 0})
                  </option>
                ))}
              </select>
            </label>
          </div>

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
              {sortedBooks.length > 0
                ? ` / showing ${pageStart + 1}-${pageEnd}`
                : ""}
            </span>
            <span className="sort-note">
              {sortOptions.find(([value]) => value === sortMode)?.[1]}
            </span>
            {(query || shelf !== "All" || status !== "All") && (
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setShelf("All");
                  setStatus("All");
                  setSortMode("radar");
                  setPage(1);
                }}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="book-columns">
            <div className="book-list-panel">
              <div className="book-table">
                {visibleBooks.length > 0 ? (
                  visibleBooks.map((book) => (
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

              {sortedBooks.length > pageSize ? (
                <nav className="pagination" aria-label="Book pagination">
                  <button
                    className="page-button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="page-status">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    className="page-button"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
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

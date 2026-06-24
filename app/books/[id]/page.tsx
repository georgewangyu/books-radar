import Link from "next/link";
import { notFound } from "next/navigation";
import { books, getBookById } from "@/lib/books";
import { CopyMarkdownButton } from "./copy-markdown-button";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return books.map((book) => ({ id: book.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    return {
      title: "Book not found | Books Radar",
    };
  }

  return {
    title: `${book.title} | Books Radar`,
    description: book.summary,
  };
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="mark">BR</span>
          <span>Books Radar</span>
        </Link>
        <nav className="nav-pills" aria-label="Book page navigation">
          <Link href="/">Catalog</Link>
          <Link href="/#today">Today</Link>
          <Link href="/#request">Request</Link>
        </nav>
        <Link className="primary nav-submit" href="/#request">
          Request a recommendation
        </Link>
      </header>

      <article className="book-page">
        <section className="book-page-hero">
          <div>
            <p className="meta-line">
              {book.shelf} / {book.cadence} / {book.year}
            </p>
            <h1>{book.title}</h1>
            <p className="detail-author">by {book.author}</p>
            <p className="hero-copy">{book.summary}</p>
          </div>
          <aside className="book-page-meta">
            <span className={`status status-${book.status}`}>{book.status}</span>
            <div className="mini-meta">
              <span>Length</span>
              <strong>{book.pages} pages</strong>
            </div>
            <div className="mini-meta">
              <span>Source</span>
              <a href={book.sourceUrl}>{book.sourceName}</a>
            </div>
          </aside>
        </section>

        <section className="book-page-grid">
          <div className="book-page-section">
            <h2>Why read it</h2>
            <p>{book.whyRead}</p>
          </div>
          <div className="book-page-section">
            <h2>Best for</h2>
            <ul>
              {book.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="book-page-section">
          <h2>George note</h2>
          {book.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </section>

        <section className="book-page-section markdown-section">
          <div className="markdown-heading">
            <div>
              <p className="meta-line">Shareable note</p>
              <h2>Copyable Markdown</h2>
            </div>
            <CopyMarkdownButton markdown={book.markdown} />
          </div>
          <pre className="markdown-recipe">
            <code>{book.markdown}</code>
          </pre>
        </section>
      </article>
    </main>
  );
}

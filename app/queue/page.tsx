import type { Metadata } from "next";
import Link from "next/link";
import { books } from "@/lib/books";
import { readingQueue } from "@/lib/reading-queue";
import { ExploreTabs } from "./explore-tabs";

export const metadata: Metadata = {
  title: "Explore Books | Books Radar",
  description:
    "Explore Books Radar reading candidates across general reading and sci-fi worldview tabs.",
  alternates: {
    canonical: "/queue",
  },
};

export default function QueuePage() {
  const sciFiBooks = books.filter(
    (book) => book.shelf === "Science Fiction" || book.shelf === "Speculative Fiction",
  );

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="mark">BR</span>
          <span>Books Radar</span>
        </Link>
        <nav className="nav-pills" aria-label="Page navigation">
          <Link href="/#catalog">Catalog</Link>
          <Link className="active" href="/queue">
            Explore
          </Link>
          <Link href="/#today">Today</Link>
          <Link href="/#request">Request</Link>
        </nav>
        <Link className="primary nav-submit" href="/#request">
          Request a recommendation
        </Link>
      </header>

      <section className="reading-queue reading-queue-page" aria-labelledby="queue-title">
        <div className="queue-heading">
          <div>
            <p className="section-kicker">Explore</p>
            <h1 id="queue-title">Books to think with next</h1>
          </div>
          <p>
            Browse the next reading candidates by intent: general books for
            business, positioning, and product judgment, or sci-fi for worldview
            and future-model building.
          </p>
        </div>
        <ExploreTabs generalBooks={readingQueue} sciFiBooks={sciFiBooks} />
      </section>
    </main>
  );
}

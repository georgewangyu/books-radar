import type { Metadata } from "next";
import Link from "next/link";
import { readingQueue } from "@/lib/reading-queue";

export const metadata: Metadata = {
  title: "Books to Explore Next | Books Radar",
  description:
    "Candidate books George is considering before they become full Books Radar notes.",
  alternates: {
    canonical: "/queue",
  },
};

export default function QueuePage() {
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
            <p className="section-kicker">Reading queue</p>
            <h1 id="queue-title">Books to explore next</h1>
          </div>
          <p>
            Candidate reads before they become full Books Radar notes: conversion books
            for turning audience into a product path, plus future-facing fiction and AI
            books for new product ideas.
          </p>
        </div>
        <div className="queue-grid">
          {readingQueue.map((book, index) => (
            <article className="queue-card" key={book.id}>
              <div className="queue-card-top">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{book.lane}</strong>
              </div>
              <h2>{book.title}</h2>
              <p className="queue-author">by {book.author}</p>
              <p>{book.reason}</p>
              <div className="queue-read-for">
                <span>Read for</span>
                <p>{book.readFor}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

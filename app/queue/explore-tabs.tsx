"use client";

import { useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/books";
import type { ReadingQueueBook } from "@/lib/reading-queue";

type Props = {
  generalBooks: ReadingQueueBook[];
  sciFiBooks: Book[];
};

type ExploreTab = "general" | "sci-fi";

const tabs: Array<[ExploreTab, string]> = [
  ["general", "General reading"],
  ["sci-fi", "Sci-fi"],
];

export function ExploreTabs({ generalBooks, sciFiBooks }: Props) {
  const [activeTab, setActiveTab] = useState<ExploreTab>("general");

  return (
    <div className="explore-tabs">
      <div className="explore-tablist" role="tablist" aria-label="Explore sections">
        {tabs.map(([value, label]) => (
          <button
            aria-controls={`${value}-panel`}
            aria-selected={activeTab === value}
            className={activeTab === value ? "explore-tab active" : "explore-tab"}
            id={`${value}-tab`}
            key={value}
            onClick={() => setActiveTab(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "general" ? (
        <section
          aria-labelledby="general-tab"
          className="explore-panel"
          id="general-panel"
          role="tabpanel"
        >
          <div className="queue-grid">
            {generalBooks.map((book, index) => (
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
      ) : (
        <section
          aria-labelledby="sci-fi-tab"
          className="explore-panel"
          id="sci-fi-panel"
          role="tabpanel"
        >
          <div className="sci-fi-panel-heading">
            <div>
              <p className="section-kicker">Worldview sci-fi</p>
              <h2>Science fiction for stronger models</h2>
            </div>
            <p>
              Books for stretching intuitions about civilization, AI, institutions,
              identity, and the long-term shape of technology.
            </p>
          </div>
          <div className="sci-fi-grid">
            {sciFiBooks.map((book) => (
              <article className="sci-fi-card" key={book.id}>
                <span>{book.shelf}</span>
                <h3>{book.title}</h3>
                <p className="queue-author">by {book.author}</p>
                <p>{book.whyRead}</p>
                <Link className="text-button" href={`/books/${book.id}`}>
                  View note
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

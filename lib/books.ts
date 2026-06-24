import booksData from "@/data/books.json";

export type BookStatus = "ready" | "featured" | "draft";

export type Book = {
  id: string;
  title: string;
  author: string;
  shelf: string;
  cadence: "daily" | "weekly" | "evergreen";
  status: BookStatus;
  year: string;
  pages: string;
  summary: string;
  fullSummary: string;
  whyRead: string;
  bestFor: string[];
  notes: string[];
  nextStep: string;
  sourceName: string;
  sourceUrl: string;
  markdown: string;
};

export const books = booksData as Book[];

export const shelves = Array.from(new Set(books.map((book) => book.shelf)));
export const statuses = Array.from(new Set(books.map((book) => book.status)));
export const cadences = Array.from(new Set(books.map((book) => book.cadence)));

export function getBookById(id: string) {
  return books.find((book) => book.id === id);
}

export function getTodaysBook(now = new Date()) {
  const readyBooks = books.filter((book) => book.status !== "draft");
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return readyBooks[day % readyBooks.length] || books[0];
}

import { BooksRadarApp } from "./books-radar-app";
import { books } from "@/lib/books";

export default function Home() {
  return <BooksRadarApp books={books} />;
}

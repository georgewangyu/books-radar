import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://booksradar.snackoverflowgeorge.com"),
  title: "Books Radar",
  description:
    "Daily and weekly book recommendations from George, with a lightweight searchable shelf.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Books Radar",
    description:
      "Daily and weekly book recommendations from George, with a lightweight searchable shelf.",
    url: "https://booksradar.snackoverflowgeorge.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

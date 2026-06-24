import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Books Radar",
  description:
    "Daily and weekly book recommendations from George, with a lightweight searchable shelf.",
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

# Apple Books Import

This folder is for turning George's local Apple Books highlights, notes, and
bookmarks into reviewable markdown drafts for Books Radar.

The generated drafts are private by default:

```text
imports/apple-books/drafts/
imports/apple-books/raw/
```

Those folders are gitignored because Apple Books annotations can contain private
notes and long quoted passages from copyrighted books. Treat each generated file
as source material. Copy only the public-safe recommendation, summary, and short
notes into `data/books.json` when a book is ready for the public site.

## Import

Run this on the Mac that has Apple Books/iCloud Books synced:

```sh
npm run import:apple-books
```

The importer:

- copies the live Apple Books SQLite databases into a temporary folder before
  reading them
- groups annotations by book asset ID
- resolves titles from the Apple Books library database when available
- tries to resolve missing titles by matching annotation snippets against synced
  iCloud EPUB folders
- writes one copyable markdown draft per annotated book

If a title cannot be resolved, the markdown filename and frontmatter keep the
Apple Books asset ID so it can be reconciled manually.

## Promote A Book

1. Open the generated draft in `imports/apple-books/drafts/`.
2. Rewrite the private highlights into a short public recommendation.
3. Add the public version to `data/books.json`.
4. Run:

```sh
npm run feed:weekly
npm run --silent feed:latest
npm run typecheck
```

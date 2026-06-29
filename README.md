# Books Radar

Read what compounds.

Books Radar is a lightweight personal book recommendation catalog:
daily and weekly picks from George, a searchable shelf, copyable reading notes,
and a small request queue. It is intentionally not Goodreads. No ratings, social
graph, reading challenges, or heavy profile machinery.

Live site: https://booksradar.snackoverflowgeorge.com

## What You Get

- Searchable public shelf of books George recommends.
- Today's pick, rotated from ready public recommendations.
- Daily and weekly feed generation from the same seed shelf.
- Copyable markdown notes for each book.
- Agent skill for one-book daily or weekly recommendations.
- Request form for suggestions, requests, and note improvements.

## Quick Start

Pick your agent and run the install command, then ask the agent to set it up.

### Codex

```bash
mkdir -p ~/.codex/skills && git clone https://github.com/georgewangyu/books-radar.git ~/.codex/skills/books-radar
```

Or use the skill installer:

```bash
npx skills add georgewangyu/books-radar --skill books-radar -g
```

```text
set up Books Radar
```

### Claude Code / Cursor / Other Agents

```bash
git clone https://github.com/georgewangyu/books-radar.git ~/skills/books-radar
```

```text
Use ~/skills/books-radar/skills/books-radar/SKILL.md and set up Books Radar.
```

The agent walks users through:

- daily, weekly, or on-demand recommendations
- delivery time and timezone
- language: English, Chinese, or bilingual
- tone: concise, operator, or editorial
- delivery: current chat, Telegram, email, or an OpenClaw channel

Settings are saved locally in `~/.books-radar/config.json`. Delivery
keys, if used, are saved locally in `~/.books-radar/.env`.

## Website Lead Capture

The homepage install card asks for name and email before revealing the copyable
install command. Submissions are saved server-side into a shared Supabase table
called `radar_leads`; no Supabase key is exposed to the browser.

Create the table in the Supabase SQL editor, or with `psql`:

```sh
psql "$SUPABASE_DB_URL" -f docs/radar-leads-supabase.sql
```

Then configure the deployment with:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-side-service-role-key>
```

`radar_leads` upserts by `(product, email)`, so repeated unlocks update the
same contact instead of creating noisy duplicates.

## Local Development

```sh
npm install
npm run dev -- --port 4193
```

Open `http://localhost:4193`.

## Shelf Data

Public-ready source notes live in the sibling private source repo:

```text
../georgesbooks/books/<book-id>.md
```

Sync them into the public app data with:

```sh
npm run sync:books
```

Check source quality without rewriting generated data:

```sh
npm run validate:books
```

The sync intentionally fails if a source note looks like scaffold text, raw
Apple Books export material, private local data, or a thin recommendation. Each
public source needs a real summary, a George-style recommendation, best-for
items, notes, a next reading action, and a fenced `Books Radar Markdown` block.

The generated shelf lives in:

```text
data/books.json
```

Each book has:

- title, author, shelf, cadence, and status
- short recommendation summary
- George-style note
- best-for tags
- one next reading action
- copyable markdown note

Do not edit generated book content by hand in `data/books.json`. Edit
`georgesbooks/books/*.md`, then run:

```sh
npm run validate:books
npm run sync:books
npm run feed:weekly
npm run --silent feed:latest
```

Feeds are written to:

```text
feeds/YYYY/MM/YYYY-MM-DD.md
```

## Try The Main Flow

1. Search for a book by title, author, shelf, or theme.
2. Filter by shelf, cadence, or status.
3. Open today's pick.
4. Copy a book note.
5. Open a full book detail page.
6. Request a recommendation.
7. Install the skill and ask for today's pick.

## Verification

```sh
npm run feed:weekly
npm run --silent feed:latest
npm run typecheck
npm run build
npm run test:ui
```

`npm run test:ui` runs the Playwright suite against a production `next start`
server. It covers search/filtering, selected detail previews, copy-to-clipboard,
detail pages, mocked request submission, and mobile overflow.

## Request Intake

Server-side GitHub issue creation uses:

```env
GITHUB_TOKEN=
GITHUB_OWNER=georgewangyu
GITHUB_REPO=audience-request-form
GITHUB_PRIVATE_REPO=audience-private-intake
BOOKS_REQUEST_ALLOWED_ORIGIN=
```

Public submissions create issues in `georgewangyu/audience-request-form`.
Private submissions create issues in `georgewangyu/audience-private-intake`.
Books Radar adds `books-radar` and `source-repo:books-radar` labels so the
shared queue remains triageable.

Keep tokens server-side. Do not prefix them with `NEXT_PUBLIC_`.

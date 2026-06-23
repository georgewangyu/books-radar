# George's Books Radar

Read what compounds.

George's Books Radar is a lightweight personal book recommendation catalog:
daily and weekly picks from George, a searchable shelf, copyable reading notes,
and a small request queue. It is intentionally not Goodreads. No ratings, social
graph, reading challenges, or heavy profile machinery.

Live site: https://books-radar.vercel.app

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
set up George's Books Radar
```

### Claude Code / Cursor / Other Agents

```bash
git clone https://github.com/georgewangyu/books-radar.git ~/skills/books-radar
```

```text
Use ~/skills/books-radar/skills/books-radar/SKILL.md and set up George's Books Radar.
```

The agent walks users through:

- daily, weekly, or on-demand recommendations
- delivery time and timezone
- language: English, Chinese, or bilingual
- tone: concise, operator, or editorial
- delivery: current chat, Telegram, email, or an OpenClaw channel

Settings are saved locally in `~/.books-radar/config.json`. Delivery
keys, if used, are saved locally in `~/.books-radar/.env`.

## Local Development

```sh
npm install
npm run dev -- --port 4193
```

Open `http://localhost:4193`.

## Shelf Data

The seed shelf lives in:

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

Add or edit books there, then run:

```sh
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
GITHUB_OWNER=
GITHUB_REPO=books-radar
GITHUB_PRIVATE_REPO=georgesbooks
BOOKS_REQUEST_ALLOWED_ORIGIN=
```

Keep tokens server-side. Do not prefix them with `NEXT_PUBLIC_`.

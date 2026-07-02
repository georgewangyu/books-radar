---
name: books-radar-reading-guide
description: Use when creating a spoiler-aware Books Radar reading guide, world primer, chapter or section map, read-depth scale, session log, or skip/skim/full-read decision for a specific book.
---

# Books Radar Reading Guide

Help the user decide how deeply to read one book. Use Books Radar public shelf
data when available, ask for spoiler preference before exposing plot-sensitive
context, and produce a durable reading note that separates user reactions from
workflow bookkeeping.

## First-Run Preference

Before the first reading guide, check `~/.books-radar/reading-guide-config.json`
for `spoilerMode`. If missing, ask:

```text
How should I handle spoilers for reading guides?

- spoiler-tolerant: include major reveals when useful for orientation or read-depth decisions
- spoiler-light: explain the setup and early direction, but avoid late twists and endings
- no-spoilers: stay at back-cover and early-premise level
```

Save the answer:

```json
{
  "spoilerMode": "<spoiler-tolerant, spoiler-light, or no-spoilers>",
  "notesDir": "~/.books-radar/reading-notes",
  "onboardingComplete": true
}
```

If a user explicitly requests a different spoiler level for the current book,
follow that request and note the temporary mode in the guide. Do not ask again
when a durable preference already exists.

## Source Order

Use the strongest available source without fabricating structure:

1. Latest Books Radar feed: run `npm run --silent feed:latest` when inside a
   Books Radar checkout.
2. Public shelf data: read `data/books.json`.
3. User-provided title, edition, table of contents, excerpts, or reading
   progress.
4. Web sources only when the user asks for lookup or when public metadata is
   necessary and unavailable locally.

Do not invent chapter names, chapter boundaries, quotes, or table-of-contents
details. If chapter boundaries are unavailable, produce a section-level map and
say so plainly.

## Read-Depth Scale

Use these labels for local reading signals:

- `skip`: the section does not materially change the user's current model,
  goal, or decision; note only if skipping avoids wasted attention.
- `skim`: the section supplies connective tissue, plot movement, examples, or
  surface context; useful for continuity, but not where the core model is built.
- `slow-read`: the section establishes or mutates the book's mental model:
  ontology, rules of the world, causal mechanism, power structure, core
  metaphor, or the frame needed to understand later chapters.
- `return later`: the section likely matters, but only after the user has more
  context, a live question, or a reason to compare it against a later part.

Use these labels for the post-map decision:

- `skip`
- `skim rest`
- `selected chapters`
- `full read`
- `reread later`

Avoid burying the scale in a generic setup paragraph. Apply it in the actual
map and final decision. In each map row, make the `Why` column explain the
attention signal, for example: "slow-read because this is where the book's
mental model is established."

## Guide Workflow

1. Confirm the book and spoiler mode.
2. Gather available Books Radar context and any user reading progress.
3. Write or update a note at `~/.books-radar/reading-notes/<book-id>.md` unless
   the user only wants an in-chat answer.
4. Include a `Book Context` section with title, author, source status, spoiler
   mode, and current user progress.
5. For speculative fiction, fantasy, dense history, or unfamiliar domains,
   include a `World Primer` or `Background Primer` before the map. Match detail
   to spoiler mode:
   - `spoiler-tolerant`: explain the premise, major factions/concepts, and any
     future reveal that prevents confusion.
   - `spoiler-light`: explain only the opening setup and concepts the reader
     has already encountered or will need immediately.
   - `no-spoilers`: explain only jacket-copy-level context.
6. Capture `Category Signals` when the user offers a categorization instinct or
   when the book clearly belongs to a recurring mental-model family. Treat
   categories as multi-label model tags, not bookstore genres. Preserve
   uncertainty and comparison hooks instead of forcing a final taxonomy too
   early.
7. Keep `Session Log` focused on the user's actual reactions, confusion,
   decisions, and requests. Do not put agent workflow notes, tool provenance,
   or skill-maintenance chatter there.
8. Build the `Book Map` with chapter-level rows when boundaries are reliable;
   otherwise use section-level rows.
9. End with a `Reading Decision` using one of the post-map labels and one
   concrete next reading action.

## Note Shape

Use this structure unless the user asks for a lighter answer:

```markdown
# <Book Title>

## Book Context
- Author:
- Books Radar source:
- Spoiler mode:
- Current progress:

## World Primer

## Category Signals
- Working family:
- Primary categories:
- Secondary categories:
- Current distinction:
- Comparison hook:

## Session Log

## Initial Summary

## Book Map
| Part | What it does | Signal | Why |
| --- | --- | --- | --- |

## Current Synthesis

## Reading Decision

## Reflection Prompt
```

Omit `World Primer` only when the book does not need background orientation.

## Guardrails

- Keep the skill public-safe. Do not reference private repositories, private
  note paths, unpublished personal notes, or George-internal defaults.
- Distinguish "George's public Books Radar note says..." from the user's own
  opinion unless the user has made that opinion clear.
- Do not turn this into a review score, social reading tracker, or Goodreads
  replacement.
- Prefer concise, usable guidance over exhaustive summaries.

# George's Books Radar Feeds

Weekly public Books Radar feeds live here:

```text
feeds/YYYY/MM/YYYY-MM-DD.md
```

Agents should read the latest feed first, then summarize or deliver one daily
or weekly recommendation. They should not invent new books during digest
delivery. Add books to `data/books.json`, then run `npm run feed:weekly`.

import { expect, test } from "@playwright/test";
import { books } from "../lib/books";

const detailPageSample = ["working-in-public", "the-effective-engineer", "a-pattern-language"]
  .map((id) => books.find((book) => book.id === id))
  .filter((book): book is (typeof books)[number] => Boolean(book));

test.describe("George's Books Radar catalog", () => {
  test("catalog controls, selected detail, and book links work", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("George's Books Radar");
    await expect(
      page.getByRole("heading", { name: "George's Books Radar", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Read what compounds.")).toBeVisible();
    await expect(page.getByText("Daily and weekly book recommendations")).toBeVisible();
    await expect(page.getByText("Today's pick")).toBeVisible();
    await expect(page.getByText(`${books.length} matching books`)).toBeVisible();
    await expect(page.getByLabel("Sort")).toHaveValue("radar");

    await page.getByPlaceholder("Search books, authors, shelves...").fill("open source");
    await expect(page.getByText("Working in Public").first()).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByRole("button", { name: "Engineering 2" }).click();
    await expect(page.getByText("The Effective Engineer").first()).toBeVisible();
    await expect(page.getByText("2 matching books")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByPlaceholder("Search books, authors, shelves...").fill("Pattern Language");
    const patternRow = page.locator("article", { hasText: "A Pattern Language" });
    await patternRow.getByRole("link", { name: /A Pattern Language/ }).click();
    await expect(page).toHaveURL(/\/books\/a-pattern-language$/);
    await expect(
      page.getByRole("heading", { name: "A Pattern Language", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Copyable Markdown", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy note" })).toBeVisible();
  });

  test("sort modes reorder the shelf", async ({ page }) => {
    await page.goto("/");

    const defaultFirstRow = await page.locator(".book-row").first().textContent();

    await page.getByLabel("Sort").selectOption("title");
    await expect(page.locator(".sort-note")).toHaveText("A-Z");

    const titleFirstRow = await page.locator(".book-row").first().textContent();
    expect(titleFirstRow).not.toBe(defaultFirstRow);

    await page.getByLabel("Sort").selectOption("newest");
    await expect(page.locator(".sort-note")).toHaveText("Newest first");
  });

  test("copy buttons write book markdown", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");

    await page.getByRole("button", { name: "Copy note" }).first().click();
    await expect(page.getByRole("button", { name: "Copied" }).first()).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(books.some((book) => book.markdown === clipboard)).toBe(true);
    expect(clipboard).toContain("Why George recommends it:");
  });

  test("setup command copies from the agent skill card", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");

    await page.getByRole("button", { name: "Copy command" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(
      "npx skills add georgewangyu/george-books-radar --skill books-radar -g",
    );
  });

  test("request form defaults to public issue route and shows success", async ({ page }) => {
    const payloads: Array<Record<string, unknown>> = [];

    await page.route("**/api/submit", async (route) => {
      payloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          issueNumber: 42,
          issueUrl: "https://github.com/example/repo/issues/42",
        }),
      });
    });

    await page.goto("/");
    await page.getByRole("link", { name: "Request a recommendation" }).first().click();
    await page.getByLabel("Book title").fill("The Information");
    await page
      .getByLabel("Why this fits")
      .fill("I want a book about information theory, computing, and communication.");
    await page
      .getByLabel("Rough note")
      .fill("Looking for a recommendation that connects computing history to modern software.");
    await page.getByRole("button", { name: "Create request" }).click();

    await expect(page.getByText("Request sent.")).toBeVisible();
    expect(payloads[0]?.visibility).toBe("public");
    expect(payloads[0]?.submissionType).toBe("request-book");
  });

  test("mobile layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
    await expect(page.getByRole("link", { name: "Request a recommendation" }).first()).toBeVisible();
  });
});

test.describe("Book detail pages", () => {
  for (const book of detailPageSample) {
    test(`renders ${book.id}`, async ({ page }) => {
      await page.goto(`/books/${book.id}`);

      await expect(page.getByRole("heading", { name: book.title, level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Copyable Markdown", level: 2 })).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(book.sourceName) })).toBeVisible();
      await expect(page.locator(".markdown-recipe code")).toContainText(
        book.markdown
          .split("\n")
          .find((line) => line.startsWith("# ") || line.length > 12) || book.title,
      );
    });
  }

  test("book ids are unique", () => {
    expect(new Set(books.map((book) => book.id)).size).toBe(books.length);
  });

  test("detail page copy button writes the selected note", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const book = books.find((item) => item.id === "working-in-public") || books[0];

    await page.goto(`/books/${book.id}`);
    await page.getByRole("button", { name: "Copy note" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(book.markdown);
  });
});

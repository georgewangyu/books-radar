import { expect, test } from "@playwright/test";
import { books, getTodaysBook } from "../lib/books";
import { readingQueue } from "../lib/reading-queue";

const detailPageSample = [
  "guns-germs-and-steel",
  "harry-potter-and-the-methods-of-rationality",
  "running-lean",
]
  .map((id) => books.find((book) => book.id === id))
  .filter((book): book is (typeof books)[number] => Boolean(book));

test.describe("Books Radar catalog", () => {
  test("hero open note navigates to the full book page", async ({ page }) => {
    const todaysBook = getTodaysBook();

    await page.goto("/");

    await page.getByRole("link", { name: "Open note" }).click();
    await expect(page).toHaveURL(new RegExp(`/books/${todaysBook.id}$`));
    await expect(page.getByRole("heading", { name: todaysBook.title, level: 1 })).toBeVisible();
  });

  test("catalog controls, selected detail, and book links work", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Books Radar");
    await expect(
      page.getByRole("heading", { name: "Books Radar", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Read what compounds.")).toBeVisible();
    await expect(page.getByText("Daily and weekly book recommendations")).toBeVisible();
    await expect(page.getByText("Today's pick")).toBeVisible();
    await expect(
      page.getByLabel("Page navigation").getByRole("link", {
        exact: true,
        name: "Explore",
      }),
    ).toHaveAttribute("href", "/queue");
    await expect(page.locator(".queue-card")).toHaveCount(0);
    await expect(page.getByText("Created by George")).toBeVisible();
    await expect(page.getByLabel("George links").getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:hellogeorgehq@gmail.com",
    );
    await expect(page.getByLabel("George links").getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/snackoverflowgeorge/",
    );
    await expect(page.getByText(`${books.length} matching books`)).toBeVisible();
    await expect(page.getByText("showing 1-12")).toBeVisible();
    await expect(page.locator(".book-row")).toHaveCount(Math.min(12, books.length));
    await expect(page.getByLabel("Sort")).toHaveValue("radar");

    await page.getByPlaceholder("Search books, authors, shelves...").fill("rationality");
    await expect(
      page.getByText("Harry Potter and the Methods of Rationality").first(),
    ).toBeVisible();

    const startupCount = books.filter((book) => book.shelf === "Startups").length;
    await page.getByRole("button", { name: "Clear filters" }).click();
    const startupRailButton = page.getByRole("button", { name: `Startups ${startupCount}` });
    if (await startupRailButton.isVisible()) {
      await startupRailButton.click();
    } else {
      await page.getByLabel("Shelf filter").selectOption("Startups");
    }
    await expect(page.getByText("Running Lean").first()).toBeVisible();
    await expect(page.getByText(`${startupCount} matching books`)).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByPlaceholder("Search books, authors, shelves...").fill("Tomorrow");
    const fictionRow = page.locator("article", { hasText: "Tomorrow, and Tomorrow, and Tomorrow" });
    await fictionRow.getByRole("link", { name: /Tomorrow, and Tomorrow, and Tomorrow/ }).click();
    await expect(page).toHaveURL(/\/books\/tomorrow-and-tomorrow-and-tomorrow$/);
    await expect(
      page.getByRole("heading", { name: "Tomorrow, and Tomorrow, and Tomorrow", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Copyable Markdown", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy note" })).toBeVisible();
  });

  test("pagination moves through the shelf and resets for search", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(`Page 1 of ${Math.ceil(books.length / 12)}`)).toBeVisible();
    await expect(page.getByText("showing 1-12")).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
    await expect(page.locator(".book-row")).toHaveCount(12);

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of")).toBeVisible();
    await expect(page.getByText("showing 13-24")).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeEnabled();
    await expect(page.locator(".book-row")).toHaveCount(12);

    await page.getByPlaceholder("Search books, authors, shelves...").fill("rationality");
    await expect(
      page.getByText("Harry Potter and the Methods of Rationality").first(),
    ).toBeVisible();
    await expect(page.getByText("Page 1 of")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
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
      "npx skills add georgewangyu/books-radar --skill books-radar -g",
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
    await expect(page.locator(".queue-card")).toHaveCount(0);
    await expect(page.locator(".mobile-filter-bar")).toBeVisible();
    await expect(page.getByLabel("Cadence filter")).toHaveCount(0);
    await expect(page.locator(".book-nav")).toBeHidden();
  });

  test("explore page lists candidate books separately from the shelf", async ({ page }) => {
    await page.goto("/queue");

    await expect(page).toHaveTitle("Books George Is Reading Next | Books Radar");
    await expect(
      page.getByRole("heading", { name: "Books George is reading next", level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".queue-card")).toHaveCount(readingQueue.length);
    await expect(page.getByText("$100M Offers")).toBeVisible();
    await expect(page.getByText("Permutation City")).toBeVisible();
    await expect(
      page.getByLabel("Page navigation").getByRole("link", {
        exact: true,
        name: "Explore",
      }),
    ).toHaveAttribute("href", "/queue");
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
    const book = books.find((item) => item.id === "guns-germs-and-steel") || books[0];

    await page.goto(`/books/${book.id}`);
    await page.getByRole("button", { name: "Copy note" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(book.markdown);
  });
});

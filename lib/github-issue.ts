import type { BookSubmission } from "./submission-schema";

const sourceRepo = "books-radar";

const typeLabels: Record<BookSubmission["submissionType"], string> = {
  "submit-book": "type:submit-book",
  "request-book": "type:request-book",
  "improve-note": "type:improve-note",
};

const typeTitles: Record<BookSubmission["submissionType"], string> = {
  "submit-book": "Submit book",
  "request-book": "Request book",
  "improve-note": "Improve note",
};

function compactTitle(input: string) {
  const singleLine = input.replace(/\s+/g, " ").trim();
  return singleLine.length > 78 ? `${singleLine.slice(0, 75)}...` : singleLine;
}

export function issueTitle(submission: BookSubmission) {
  return `[books-radar:${submission.submissionType}] ${compactTitle(submission.title)}`;
}

export function issueLabels(submission: BookSubmission) {
  return [
    sourceRepo,
    `source-repo:${sourceRepo}`,
    "status:needs-triage",
    typeLabels[submission.submissionType],
    `visibility:${submission.visibility}`,
  ];
}

export function issueBody(submission: BookSubmission) {
  const handle = submission.handle || "_Anonymous / not provided_";
  const context = submission.context || "_Not provided_";
  const visibility =
    submission.visibility === "private" ? "Private review issue" : "Public GitHub issue";

  return [
    "## Books Radar submission",
    "",
    `**Type:** ${typeTitles[submission.submissionType]}`,
    `**Visibility:** ${visibility}`,
    `**Source repo:** ${sourceRepo}`,
    `**Handle:** ${handle}`,
    "",
    "## Title",
    "",
    submission.title,
    "",
    "## Why this book fits",
    "",
    submission.outcome,
    "",
    "## Rough note or request",
    "",
    submission.notes,
    "",
    "## Link or context",
    "",
    context,
    "",
    "## Triage checklist",
    "",
    "- [ ] Check whether this is already in the public shelf",
    "- [ ] Decide whether it belongs in the daily, weekly, evergreen, or draft queue",
    "- [ ] Add George's short note, best-for tags, and next-step reading prompt",
    "- [ ] Confirm links and public-safe wording before publishing",
  ].join("\n");
}

export async function createGitHubIssue(submission: BookSubmission) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo =
    submission.visibility === "private"
      ? process.env.GITHUB_PRIVATE_REPO
      : process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub issue environment configuration.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version":
          process.env.GITHUB_API_VERSION || "2022-11-28",
      },
      body: JSON.stringify({
        title: issueTitle(submission),
        body: issueBody(submission),
        labels: issueLabels(submission),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub issue creation failed: ${response.status} ${body}`);
  }

  return (await response.json()) as { html_url: string; number: number };
}

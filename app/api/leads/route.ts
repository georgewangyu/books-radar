import { NextResponse } from "next/server";
import { radarLeadSchema, saveRadarLead } from "@/lib/radar-leads";

type ErrorResponse = {
  error?: string;
  issues?: Record<string, string[] | undefined>;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = radarLeadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid lead.",
        issues: parsed.error.flatten().fieldErrors,
      } satisfies ErrorResponse,
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    await saveRadarLead({
      ...parsed.data,
      product: "books-radar",
      repoUrl: "https://github.com/georgewangyu/books-radar",
      referrer: request.headers.get("referer") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save lead." },
      { status: 500 },
    );
  }
}

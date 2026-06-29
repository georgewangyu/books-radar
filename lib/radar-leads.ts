import { z } from "zod";

export const radarLeadSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(254, "Keep the email under 254 characters."),
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Keep the name under 120 characters."),
  website: z.string().trim().max(0).optional().default(""),
});

export type RadarLeadInput = z.infer<typeof radarLeadSchema>;

type SaveLeadInput = RadarLeadInput & {
  product: "books-radar";
  repoUrl: string;
  referrer: string;
  userAgent: string;
};

export async function saveRadarLead(input: SaveLeadInput) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase lead capture environment configuration.");
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/radar_leads?on_conflict=product,email`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email: input.email.toLowerCase(),
        name: input.name,
        product: input.product,
        source: "website-install-gate",
        consent_updates: true,
        install_command_revealed: true,
        repo_url: input.repoUrl,
        referrer: input.referrer,
        user_agent: input.userAgent,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase lead capture failed: ${response.status} ${body}`);
  }
}

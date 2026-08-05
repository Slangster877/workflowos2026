import { NextRequest, NextResponse } from "next/server";
import { requireSession, bad } from "@/lib/guard";
import { z } from "zod";

const schema = z.object({ signType: z.string() });

// Server-side Anthropic call — the API key never reaches the browser.
export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const { signType } = schema.parse(await req.json());
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ text: null, live: false, note: "Add ANTHROPIC_API_KEY to .env to enable live price checks." });
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        messages: [{ role: "user", content: `You are a sign-industry estimator in the Kansas City market. One sentence: typical installed price range for a commercial ${signType}. One sentence: the main cost driver. Max 45 words total.` }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Anthropic request failed");
    return NextResponse.json({ text: data.content?.map((c: any) => c.text).join("") ?? "", live: true });
  } catch (e) {
    return bad(e);
  }
}

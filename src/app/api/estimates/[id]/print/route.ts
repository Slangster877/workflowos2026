import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// Print-ready estimate document. v1 ships browser print-to-PDF (zero deps, works on Vercel);
// headless PDF generation is a drop-in swap later if attachment automation needs it.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { deny } = await requireSession();
  if (deny) return deny;
  const e = await prisma.estimate.findUnique({ where: { id: params.id }, include: { client: true, items: { orderBy: { sortOrder: "asc" } } } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const money = (n: any) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
  const rows = e.items.map((i) => `<tr><td>${i.description}</td><td style="text-align:right">${money(i.sellPrice)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e.number} — GrandMark Signs</title>
<style>body{font-family:Inter,-apple-system,sans-serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px}
h1{font-size:20px;margin:0}.muted{color:#667}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f3b2e;padding-bottom:14px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:13.5px}td,th{padding:9px 6px;border-bottom:1px solid #ddd;text-align:left}
.total{font-size:18px;font-weight:800;text-align:right;padding-top:14px}.logo{font-weight:800;letter-spacing:.02em}
@media print{.noprint{display:none}}</style></head><body>
<div class="hdr"><div><div class="logo">GRANDMARK <span style="color:#0f7a4d">SIGNS</span></div>
<div class="muted" style="font-size:12px">15301 W 109th Street · Lenexa, KS 66219 · (913) 555-0148</div></div>
<div style="text-align:right"><h1>Estimate ${e.number}</h1><div class="muted" style="font-size:12px">${new Date(e.createdAt).toLocaleDateString()}</div></div></div>
<p><b>Prepared for:</b> ${e.client.company}${e.client.contactName ? " · " + e.client.contactName : ""}</p>
<p style="font-size:15px;font-weight:700">${e.title}</p>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="total">Total: ${money(e.total)}</div>
${e.notes ? `<p class="muted" style="font-size:12.5px">${e.notes}</p>` : ""}
<p class="muted" style="font-size:11.5px">Estimate valid 30 days. Pricing includes materials, fabrication, and standard installation unless noted. Permits billed at cost.</p>
<button class="noprint" onclick="print()" style="padding:10px 16px;font-size:14px;cursor:pointer">🖨 Print / Save as PDF</button>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

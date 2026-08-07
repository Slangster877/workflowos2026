// The estimating engine: server-side computation so every client sees identical math.
// SIGN lines:     sqft = (w*h)/144 * qty → sell = max(sqft * book.sellPerSqFt, book.minPrice*qty); cost = sqft * book.costPerSqFt
// MATERIAL lines: sell provided or unitCost*qty*markup default; cost = unitCost*qty
// LABOR lines:    hours * role rate (rates from Settings); cost = same (labor sells at rate; margin comes from sign/material lines)
import { prisma } from "./prisma";

export type LineInput = {
  kind: "SIGN" | "MATERIAL" | "LABOR" | "CUSTOM";
  description: string;
  signType?: string;
  widthIn?: number;
  heightIn?: number;
  qty?: number;
  materialId?: string;
  unitCost?: number;
  laborRole?: string;
  laborHours?: number;
  sellPrice?: number; // CUSTOM/override
  sortOrder?: number;
};

export const DEFAULT_LABOR_RATES: Record<string, number> = { Design: 85, Fabrication: 95, Install: 110 };
export const DEFAULT_MATERIAL_MARKUP = 1.6;

export async function laborRates(): Promise<Record<string, number>> {
  const row = await prisma.setting.findUnique({ where: { key: "laborRates" } });
  return { ...DEFAULT_LABOR_RATES, ...((row?.value as any) ?? {}) };
}

export async function computeLines(inputs: LineInput[]) {
  const rates = await laborRates();
  const out: { line: any; cost: number }[] = [];

  for (const [i, li] of inputs.entries()) {
    const qty = li.qty ?? 1;
    let sell = Number(li.sellPrice ?? 0);
    let cost = 0;
    let description = li.description;

    if (li.kind === "SIGN" && li.signType) {
      const book = await prisma.priceBookEntry.findUnique({ where: { signType: li.signType } });
      const sqft = ((li.widthIn ?? 0) * (li.heightIn ?? 0)) / 144 * qty;
      if (book && sqft > 0) {
        sell = li.sellPrice ?? Math.max(sqft * Number(book.sellPerSqFt), Number(book.minPrice) * qty);
        cost = sqft * Number(book.costPerSqFt);
      }
      description = description || `${li.signType} — ${li.widthIn}"×${li.heightIn}" (${sqft.toFixed(1)} sq ft)${qty > 1 ? ` ×${qty}` : ""}`;
    } else if (li.kind === "MATERIAL") {
      const mat = li.materialId ? await prisma.material.findUnique({ where: { id: li.materialId } }) : null;
      const unit = li.unitCost ?? Number(mat?.unitCost ?? 0);
      cost = unit * qty;
      sell = li.sellPrice ?? cost * DEFAULT_MATERIAL_MARKUP;
      description = description || `${mat?.name ?? "Material"} ×${qty}`;
    } else if (li.kind === "LABOR") {
      const rate = rates[li.laborRole ?? "Fabrication"] ?? 95;
      sell = li.sellPrice ?? (li.laborHours ?? 0) * rate;
      cost = (li.laborHours ?? 0) * rate * 0.55; // loaded internal cost ≈ 55% of billed rate
      description = description || `${li.laborRole ?? "Labor"} — ${li.laborHours ?? 0} hrs @ $${rate}/hr`;
    }

    out.push({
      line: {
        kind: li.kind, description, signType: li.signType ?? null, widthIn: li.widthIn ?? null, heightIn: li.heightIn ?? null,
        qty, materialId: li.materialId ?? null, unitCost: li.unitCost ?? 0, laborRole: li.laborRole ?? null,
        laborHours: li.laborHours ?? null, sellPrice: Math.round(sell * 100) / 100, sortOrder: li.sortOrder ?? i,
      },
      cost,
    });
  }

  const subtotal = out.reduce((a, l) => a + Number(l.line.sellPrice), 0);
  const totalCost = out.reduce((a, l) => a + l.cost, 0);
  const marginPct = subtotal > 0 ? Math.round(((subtotal - totalCost) / subtotal) * 10000) / 100 : 0;
  return { lines: out.map((l) => l.line), subtotal: Math.round(subtotal * 100) / 100, marginPct };
}

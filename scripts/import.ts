/**
 * One-time import of real GrandMark data from CSVs.
 *   npm run import -- data/clients.csv data/orders.csv
 * Headers documented in the sample files. Rows with a missing required field are
 * skipped and reported, never guessed.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

function parseCsv(path: string): Record<string, string>[] {
  const text = fs.readFileSync(path, "utf8").replace(/\r/g, "");
  const [head, ...lines] = text.split("\n").filter(Boolean);
  const cols = head.split(",").map((c) => c.trim());
  return lines.map((line) => {
    // handles simple quoted fields with commas
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()]));
  });
}

async function importClients(path: string) {
  let ok = 0, skipped = 0;
  for (const r of parseCsv(path)) {
    if (!r.company) { skipped++; continue; }
    await prisma.client.upsert({
      where: { qboId: r.qbo_id || `import-${r.company}` },
      update: {},
      create: {
        company: r.company, businessType: r.business_type || null, contactName: r.contact_name || null,
        phone: r.phone || null, email: r.email || null, qboId: r.qbo_id || `import-${r.company}`,
      },
    });
    ok++;
  }
  console.log(`Clients: ${ok} imported, ${skipped} skipped (missing company)`);
}

async function importOrders(path: string) {
  let ok = 0, skipped = 0;
  const statusMap: Record<string, any> = { open: "OPEN", production: "PRODUCTION", install: "INSTALL", completed: "COMPLETED", hold: "ON_HOLD", "on hold": "ON_HOLD" };
  for (const r of parseCsv(path)) {
    const client = r.client_company ? await prisma.client.findFirst({ where: { company: r.client_company } }) : null;
    if (!client || !r.number || !r.sign_type) { skipped++; console.log(`  skipped: ${r.number || "(no number)"} — ${!client ? "client not found: " + r.client_company : "missing sign_type"}`); continue; }
    await prisma.order.upsert({
      where: { number: r.number },
      update: {},
      create: {
        number: r.number, clientId: client.id, signType: r.sign_type,
        projectName: r.project_name || `${r.sign_type} – ${client.company}`,
        status: statusMap[(r.status || "open").toLowerCase()] ?? "OPEN",
        total: Number(r.total || 0), orderedAt: r.ordered_at ? new Date(r.ordered_at) : new Date(),
        dueAt: r.due_at ? new Date(r.due_at) : null, storeNumber: r.store_number || null,
        address: r.address || null, city: r.city || null, state: r.state || null, zip: r.zip || null,
        poNumber: r.po_number || null,
      },
    });
    ok++;
  }
  console.log(`Orders: ${ok} imported, ${skipped} skipped`);
}

async function main() {
  const [clientsCsv, ordersCsv] = process.argv.slice(2);
  if (!clientsCsv) { console.log("Usage: npm run import -- data/clients.csv [data/orders.csv]"); process.exit(1); }
  await importClients(clientsCsv);
  if (ordersCsv) await importOrders(ordersCsv);
}

main().finally(() => prisma.$disconnect());

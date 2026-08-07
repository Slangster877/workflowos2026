import { PrismaClient, Coverage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Real supplier list carried over from the prototype
const VENDORS: { name: string; category: string; coverage: Coverage; city: string; state: string; leadTimeDays: number }[] = [
  { name: "Grimco – Kansas City", category: "Vinyl & Graphics", coverage: "LOCAL", city: "Kansas City", state: "KS", leadTimeDays: 2 },
  { name: "N.Glantz & Son – Kansas City", category: "Substrates", coverage: "LOCAL", city: "Kansas City", state: "MO", leadTimeDays: 2 },
  { name: "Tubelite Company – St. Louis", category: "LED & Electrical", coverage: "REGIONAL", city: "St. Louis", state: "MO", leadTimeDays: 3 },
  { name: "Fellers – Tulsa", category: "Vinyl & Graphics", coverage: "REGIONAL", city: "Tulsa", state: "OK", leadTimeDays: 3 },
  { name: "Midwest Sign & Screen Printing", category: "Paint & Coatings", coverage: "LOCAL", city: "Kansas City", state: "MO", leadTimeDays: 2 },
  { name: "Wensco Sign Supply", category: "Hardware", coverage: "REGIONAL", city: "Grand Rapids", state: "MI", leadTimeDays: 4 },
  { name: "3M Commercial Graphics", category: "Vinyl & Graphics", coverage: "NATIONAL", city: "St. Paul", state: "MN", leadTimeDays: 5 },
  { name: "Avery Dennison Graphics", category: "Vinyl & Graphics", coverage: "NATIONAL", city: "Mentor", state: "OH", leadTimeDays: 5 },
  { name: "ORAFOL Americas", category: "Vinyl & Graphics", coverage: "NATIONAL", city: "Avon", state: "CT", leadTimeDays: 6 },
  { name: "Gemini Incorporated", category: "Substrates", coverage: "NATIONAL", city: "Cannon Falls", state: "MN", leadTimeDays: 10 },
  { name: "Principal LED", category: "LED & Electrical", coverage: "NATIONAL", city: "San Angelo", state: "TX", leadTimeDays: 4 },
  { name: "SloanLED", category: "LED & Electrical", coverage: "NATIONAL", city: "Ventura", state: "CA", leadTimeDays: 5 },
  { name: "GE Current (Signage)", category: "LED & Electrical", coverage: "NATIONAL", city: "Cleveland", state: "OH", leadTimeDays: 6 },
  { name: "Matthews Paint", category: "Paint & Coatings", coverage: "NATIONAL", city: "Pleasant Prairie", state: "WI", leadTimeDays: 7 },
  { name: "Nekoosa", category: "Vinyl & Graphics", coverage: "NATIONAL", city: "Nekoosa", state: "WI", leadTimeDays: 5 },
  { name: "Watchfire Signs", category: "LED & Electrical", coverage: "NATIONAL", city: "Danville", state: "IL", leadTimeDays: 14 },
];

async function main() {
  const existingOwner = await prisma.user.findUnique({
    where: { email: "scott@grandmarksigns.com" },
  });
  const ownerPassword = process.env.OWNER_PASSWORD;
  if (!existingOwner && !ownerPassword) {
    throw new Error("OWNER_PASSWORD is required when creating the initial owner account.");
  }
  const passwordHash = existingOwner?.passwordHash ?? await bcrypt.hash(ownerPassword!, 12);
  const owner = await prisma.user.upsert({
    where: { email: "scott@grandmarksigns.com" },
    update: {},
    create: {
      email: "scott@grandmarksigns.com",
      passwordHash,
      name: "Scott",
      initials: "S",
      role: "OWNER",
    },
  });

  for (const v of VENDORS) {
    await prisma.vendor.upsert({ where: { name: v.name }, update: {}, create: { ...v } });
  }

  // One idempotent sample chain proving every relation end-to-end
  let client = await prisma.client.findFirst({ where: { company: "Planet Fitness" } });
  if (!client) {
    client = await prisma.client.create({ data: {
      company: "Planet Fitness",
      businessType: "Retail Chain",
      contactName: "Dana Whitfield",
      phone: "(913) 555-0199",
      email: "dana@planetfitness.com",
      accountMgrId: owner.id,
      contacts: {
        create: { name: "Dana Whitfield", title: "Facilities Manager", phone: "(913) 555-0199", email: "dana@planetfitness.com" },
      },
    } });
  }

  const order = await prisma.order.upsert({
    where: { number: "ORD-1001" },
    update: {},
    create: {
      number: "ORD-1001",
      clientId: client.id,
      projectName: "Monument Sign – Store #7244",
      signType: "Monument Sign",
      illumination: "Illuminated — LED",
      status: "OPEN",
      total: 20494,
      pmId: owner.id,
      storeNumber: "7244",
      address: "7818 Main St",
      city: "St. Louis",
      state: "MO",
      zip: "63125",
      dueAt: new Date(Date.now() + 21 * 86400e3),
      proofs: { create: { version: 1, fileName: "monument-concept-v1.pdf", status: "DRAFT" } },
      chat: { create: { userId: owner.id, body: "Kickoff — permit application goes in this week." } },
      events: {
        create: {
          type: "DESIGN_REVIEW",
          title: "Design Review",
          clientId: client.id,
          startsAt: new Date(Date.now() + 2 * 86400e3),
        },
      },
    },
  });

  const PRICE_BOOK: [string, number, number, number][] = [
    // signType, sell $/sqft, min price, blended cost $/sqft — starting points to tune during dogfooding
    ["Wall Sign", 48, 850, 22], ["Building Sign", 52, 1500, 24], ["Channel Letters", 95, 2200, 45],
    ["Monument Sign", 88, 4500, 42], ["Pylon Sign", 110, 9000, 55], ["Menu Board", 65, 1200, 30],
    ["Window Graphics", 14, 250, 5], ["Interior Signage", 38, 350, 16], ["Drive Thru Sign", 72, 1800, 34],
    ["Directional Signage", 42, 300, 18], ["Awning Sign", 58, 1400, 28], ["Blade Sign", 68, 1100, 32],
    ["LED Display", 260, 15000, 170], ["Parking Sign", 30, 120, 12],
  ];
  for (const [signType, sell, min, cost] of PRICE_BOOK) {
    await prisma.priceBookEntry.upsert({
      where: { signType },
      update: {},
      create: { signType, sellPerSqFt: sell, minPrice: min, costPerSqFt: cost },
    });
  }
  await prisma.setting.upsert({
    where: { key: "laborRates" },
    update: {},
    create: { key: "laborRates", value: { Design: 85, Fabrication: 95, Install: 110 } },
  });

  console.log(`Seeded: owner ${owner.email}, ${VENDORS.length} vendors, client ${client.company}, order ${order.number}, ${PRICE_BOOK.length} price book entries`);
}

main().finally(() => prisma.$disconnect());

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { fedexApi, SHIP_FROM } from "@/lib/fedex";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  serviceType: z.string(), // FEDEX_GROUND | FEDEX_2_DAY | STANDARD_OVERNIGHT | PRIORITY_OVERNIGHT | FEDEX_EXPRESS_SAVER
  weightLb: z.coerce.number().min(0.1),
});

export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const { orderId, serviceType, weightLb } = schema.parse(await req.json());
    const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (!o.address || !o.zip) return NextResponse.json({ error: "Order needs a ship-to address and ZIP first" }, { status: 400 });

    const res = await fedexApi("/rate/v1/rates/quotes", {
      accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
      requestedShipment: {
        shipper: { address: SHIP_FROM.address },
        recipient: { address: { streetLines: [o.address], city: o.city, stateOrProvinceCode: o.state, postalCode: o.zip, countryCode: "US" } },
        pickupType: "USE_SCHEDULED_PICKUP",
        serviceType,
        rateRequestType: ["ACCOUNT", "LIST"],
        requestedPackageLineItems: [{ weight: { units: "LB", value: weightLb } }],
      },
    });
    const detail = res.output?.rateReplyDetails?.[0];
    const amount = detail?.ratedShipmentDetails?.[0]?.totalNetCharge;
    return NextResponse.json({ amount, currency: "USD", service: detail?.serviceName ?? serviceType });
  } catch (e) {
    return bad(e);
  }
}

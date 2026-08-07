import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { fedexApi, SHIP_FROM } from "@/lib/fedex";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  serviceType: z.string(),
  weightLb: z.coerce.number().min(0.1),
});

export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const { orderId, serviceType, weightLb } = schema.parse(await req.json());
    const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { client: true } });
    if (!o.address || !o.zip) return NextResponse.json({ error: "Order needs a ship-to address and ZIP first" }, { status: 400 });

    const res = await fedexApi("/ship/v1/shipments", {
      labelResponseOptions: "LABEL",
      accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
      requestedShipment: {
        shipper: SHIP_FROM,
        recipients: [{
          contact: { personName: o.client.contactName ?? o.client.company, phoneNumber: (o.client.phone ?? "0000000000").replace(/\D/g, "") },
          address: { streetLines: [o.address], city: o.city, stateOrProvinceCode: o.state, postalCode: o.zip, countryCode: "US" },
        }],
        serviceType,
        packagingType: "YOUR_PACKAGING",
        pickupType: "USE_SCHEDULED_PICKUP",
        shippingChargesPayment: { paymentType: "SENDER" },
        labelSpecification: { imageType: "PDF", labelStockType: "PAPER_4X6" },
        requestedPackageLineItems: [{ weight: { units: "LB", value: weightLb } }],
      },
    });

    const piece = res.output?.transactionShipments?.[0]?.pieceResponses?.[0];
    const tracking = piece?.trackingNumber ?? res.output?.transactionShipments?.[0]?.masterTrackingNumber;
    const labelB64 = piece?.packageDocuments?.[0]?.encodedLabel;
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: tracking, orderId, service: serviceType, weightLb,
        labelUrl: labelB64 ? `data:application/pdf;base64,${labelB64}` : null,
        status: "Label Created",
      },
    });
    return NextResponse.json(shipment, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}

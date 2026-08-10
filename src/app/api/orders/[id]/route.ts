import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { orderUpdate } from "@/lib/schemas";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { deny } = await requireSession();
  if (deny) return deny;
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      pm: { select: { id: true, name: true, initials: true } },
      proofs: { orderBy: { version: "asc" } },
      chat: { include: { user: { select: { name: true, initials: true } } }, orderBy: { createdAt: "asc" } },
      shipments: true,
      jobs: { include: { technician: { select: { name: true, initials: true } } }, orderBy: { createdAt: "desc" } },
      installs: { include: { crewLead: { select: { name: true, initials: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = orderUpdate.parse(await req.json());
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUniqueOrThrow({ where: { id: params.id } });
      const updated = await tx.order.update({ where: { id: params.id }, data });

      if (data.status && data.status !== current.status) {
        if (data.status === "PRODUCTION") {
          const existingJob = await tx.productionJob.findFirst({ where: { orderId: params.id } });
          if (!existingJob) {
            await tx.productionJob.create({ data: {
              number: `JOB-${Date.now().toString().slice(-7)}`,
              orderId: params.id,
              name: updated.projectName,
              dueAt: updated.dueAt,
              stage: "IN_PRODUCTION",
            } });
          }
        }
        if (data.status === "INSTALL") {
          await tx.productionJob.updateMany({ where: { orderId: params.id }, data: { stage: "READY_FOR_INSTALL", progress: 100 } });
          const existingInstall = await tx.install.findFirst({ where: { orderId: params.id } });
          if (!existingInstall) {
            await tx.install.create({ data: {
              orderId: params.id,
              method: "Standard installation",
              scheduledAt: updated.dueAt,
              status: "Scheduled",
            } });
          }
        }
        if (data.status === "COMPLETED") {
          await tx.productionJob.updateMany({ where: { orderId: params.id }, data: { stage: "INSTALLED", progress: 100 } });
          await tx.install.updateMany({ where: { orderId: params.id }, data: { status: "Completed" } });
        }
      }
      return updated;
    });
    return NextResponse.json(order);
  } catch (e) {
    return bad(e);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { deny } = await requireSession();
  if (deny) return deny;
  await prisma.order.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

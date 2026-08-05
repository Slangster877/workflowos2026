import { crudHandlers } from "@/lib/crud";
import { clientCreate } from "@/lib/schemas";
const h = crudHandlers("client", clientCreate, ["company", "contactName", "email"], { accountMgr: { select: { name: true, initials: true } }, _count: { select: { orders: true } } });
export const GET = h.GET;
export const POST = h.POST;

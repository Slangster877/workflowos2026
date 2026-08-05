import { crudHandlers } from "@/lib/crud";
import { materialCreate } from "@/lib/schemas";
const h = crudHandlers("material", materialCreate, ["name", "category", "sku"], { vendor: { select: { name: true } } });
export const GET = h.GET;
export const POST = h.POST;

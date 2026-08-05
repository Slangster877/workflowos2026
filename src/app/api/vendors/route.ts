import { crudHandlers } from "@/lib/crud";
import { vendorCreate } from "@/lib/schemas";
const h = crudHandlers("vendor", vendorCreate, ["name", "category", "city"]);
export const GET = h.GET;
export const POST = h.POST;

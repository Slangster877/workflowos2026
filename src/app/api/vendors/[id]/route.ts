import { crudHandlers } from "@/lib/crud";
import { vendorCreate } from "@/lib/schemas";
const h = crudHandlers("vendor", vendorCreate, []);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;

import { crudHandlers } from "@/lib/crud";
import { materialCreate } from "@/lib/schemas";
const h = crudHandlers("material", materialCreate, []);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;

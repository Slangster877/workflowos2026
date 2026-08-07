import { crudHandlers } from "@/lib/crud";
import { contactCreate } from "@/lib/schemas";
const h = crudHandlers("contact", contactCreate, []);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;

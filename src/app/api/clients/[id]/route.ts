import { crudHandlers } from "@/lib/crud";
import { clientCreate } from "@/lib/schemas";
const h = crudHandlers("client", clientCreate, []);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;

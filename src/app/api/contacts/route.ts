import { crudHandlers } from "@/lib/crud";
import { contactCreate } from "@/lib/schemas";
const h = crudHandlers("contact", contactCreate, ["name", "email", "title"], { client: { select: { company: true } } });
export const GET = h.GET;
export const POST = h.POST;

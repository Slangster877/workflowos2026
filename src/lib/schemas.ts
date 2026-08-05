import { z } from "zod";

export const orderCreate = z.object({
  clientId: z.string().min(1),
  signType: z.string().min(1),
  illumination: z.string().optional(),
  status: z.enum(["OPEN", "PRODUCTION", "INSTALL", "COMPLETED", "ON_HOLD"]).default("OPEN"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  total: z.coerce.number().min(0).default(0),
  dueAt: z.coerce.date().optional(),
  storeNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  pmId: z.string().optional(),
});
export const orderUpdate = orderCreate.partial().extend({ progress: z.coerce.number().min(0).max(100).optional() });

export const clientCreate = z.object({
  company: z.string().min(1),
  businessType: z.string().optional(),
  status: z.string().default("Active"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  accountMgrId: z.string().optional(),
});

export const contactCreate = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  clientId: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const vendorCreate = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  coverage: z.enum(["LOCAL", "REGIONAL", "NATIONAL"]).default("REGIONAL"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  leadTimeDays: z.coerce.number().min(0).default(5),
});

export const materialCreate = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  vendorId: z.string().optional(),
  unit: z.string().default("Each"),
  unitCost: z.coerce.number().optional(),
  qtyOnHand: z.coerce.number().default(0),
  reorderPoint: z.coerce.number().default(0),
});

export const chatCreate = z.object({ body: z.string().min(1).max(2000) });
export const proofCreate = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url().optional(),
  source: z.enum(["UPLOAD", "LINK"]).default("LINK"),
});
export const proofUpdate = z.object({ status: z.enum(["DRAFT", "SENT", "APPROVED", "REVISIONS"]) });

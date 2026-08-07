import { prisma } from "./prisma";

// Central token store on the OAuthConnection table (one row per provider).
// NOTE: tokens are stored plaintext for now — encrypt-at-rest is a Phase 5 hardening item.
export async function saveConnection(provider: string, data: { accessToken: string; refreshToken?: string; expiresAt?: Date; meta?: any }) {
  return prisma.oAuthConnection.upsert({
    where: { provider },
    update: { ...data },
    create: { provider, ...data },
  });
}

export async function getConnection(provider: string) {
  return prisma.oAuthConnection.findUnique({ where: { provider } });
}

export async function dropConnection(provider: string) {
  return prisma.oAuthConnection.delete({ where: { provider } }).catch(() => null);
}

export function appUrl(path: string) {
  return `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${path}`;
}

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __hydraPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__hydraPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hydraPrisma = prisma;
}

export * from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prismaClient: PrismaClient | undefined = globalForPrisma.prisma;

function getMissingDatabaseUrlMessage() {
  if (process.env.NODE_ENV === "production") {
    return "DATABASE_URL is required to initialize Prisma Client.";
  }

  return [
    "DATABASE_URL is not configured.",
    "Create a .env file in the project root and add DATABASE_URL.",
    'Example: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/talar_saas_pwa?schema=public"',
    "PostgreSQL must be running and the database must exist before database actions can run.",
  ].join("\n");
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(getMissingDatabaseUrlMessage());
  }

  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = createPrismaClient();

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaClient;
    }
  }

  return prismaClient;
}

export async function getPrisma() {
  return getPrismaClient();
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;

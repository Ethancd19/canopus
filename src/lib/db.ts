import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

// Neon over HTTP: every query is one fetch, so a single client is safe to
// share across Workers requests (no sockets are held between requests).
// Interactive transactions are not supported over HTTP; the app does not
// use them. Any page that reads `db` must be dynamic.
let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    client = new PrismaClient({
      adapter: new PrismaNeonHttp(connectionString, {}),
    });
  }
  return client;
}

/**
 * Prisma client that is created on first use, never at import time. Import and
 * use it exactly like a normal `PrismaClient` (`db.photo.findMany(...)`).
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

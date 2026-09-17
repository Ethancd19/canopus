import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI runs outside Next, so load the same files Next would (local first).
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

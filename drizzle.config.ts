import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/drizzle/schema.ts",
  out: "./server/drizzle",
  dialect: "postgresql",
  strict: true,
});

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/drizzle/schema.ts",
  out: "./server/drizzle",
  dialect: "postgresql",
  
  verbose: true,
  strict: true,
});

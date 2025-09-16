import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/drizzle/schema.ts",
  out: "./server/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // url: "postgres://@pg-vico-vogoplay-681f-vico.k.aivencloud.com:24567/defaultdb?sslmode=require",
    ssl: { rejectUnauthorized: false },
  },
  verbose: true,
  strict: true,
});

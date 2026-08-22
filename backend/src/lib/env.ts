import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit faire au moins 16 caractères"),
  PORT: z.coerce.number().default(4000),
  APP_EDITION: z.enum(["main", "classic"]).default("main"),
  CORS_ORIGINS: z.string().default(""),
  SHAREPAY_API_KEY: z.string().optional(),
  SHAREPAY_BASE_URL: z.string().default("https://sharepay-api.te-sea.com"),
  SHAREPAY_WEBHOOK_SECRET: z.string().optional(),
  ALLOW_SIMULATED_PAYMENTS: z.string().default("false").transform((value) => value === "true"),
});

export const env = schema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);

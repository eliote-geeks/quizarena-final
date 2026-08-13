import { Redis } from "ioredis";
import { env } from "./env.js";

// Utilisé pour : sessions de matchmaking duel, verrous anti-double-soumission,
// rate-limit anti-triche (§3.4 — une question ne peut être posée qu'une fois).
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

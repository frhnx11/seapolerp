import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Type-safe, validated environment variables.
 *
 * Importing `env` anywhere triggers validation at module load, so the app fails
 * fast on misconfiguration instead of crashing deep inside a request. Always read
 * configuration through this `env` object — never touch `process.env` directly
 * elsewhere in the codebase.
 */
export const env = createEnv({
  /**
   * Server-only variables. These are never exposed to the browser bundle.
   */
  server: {
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(
        (url) =>
          url.startsWith("postgresql://") || url.startsWith("postgres://"),
        "DATABASE_URL must be a PostgreSQL connection string",
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    /** Better Auth signing secret (long random value) + canonical base URL. */
    BETTER_AUTH_SECRET: z
      .string()
      .min(16, "BETTER_AUTH_SECRET must be a long random value"),
    BETTER_AUTH_URL: z
      .string()
      .min(1)
      .refine(
        (url) => url.startsWith("http://") || url.startsWith("https://"),
        "BETTER_AUTH_URL must be an http(s) URL",
      )
      .default("http://localhost:3000"),
  },

  /**
   * Client variables exposed to the browser. Must be prefixed with `NEXT_PUBLIC_`
   * and listed in `experimental__runtimeEnv` below. None are needed yet.
   */
  client: {},
  experimental__runtimeEnv: {},

  /** Treat empty strings as undefined so blank vars fail required checks. */
  emptyStringAsUndefined: true,
});

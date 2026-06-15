import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Health / readiness probe.
 *
 * Runs a real query against PostgreSQL, so a 200 response proves the entire data
 * path is healthy: validated env -> Prisma 7 client -> pg driver adapter -> database.
 * Returns 503 if the database is unreachable, which is the contract a load
 * balancer or container orchestrator expects from a readiness endpoint.
 */
export const dynamic = "force-dynamic"; // a health check must never be cached

export async function GET() {
  const startedAt = Date.now();

  try {
    const healthCheckCount = await prisma.healthCheck.count();

    return NextResponse.json({
      status: "ok",
      database: "up",
      healthCheckCount,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] database check failed", error);

    return NextResponse.json(
      {
        status: "error",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { canIngestEvents } from "@/lib/quota-service";
import { checkIngestRateLimit } from "@/lib/rate-limiter";

// Zod schema for sidecar event (matches sidecar/main.go Event struct)
const SecretMatchSchema = z.object({
  type: z.string(),
  preview: z.string(),
  confidence: z.number(),
  location: z.string(),
});

const SidecarEventSchema = z.object({
  event_type: z.string(),
  timestamp: z.string().datetime(),
  project_id: z.string(),
  method: z.string().optional(),
  url: z.string().optional(),
  host: z.string().optional(),
  path: z.string().optional(),
  status_code: z.number().optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  body_truncated: z.boolean().optional(),
  destination_type: z.string().optional(),
  secret_matches: z.array(SecretMatchSchema).optional(),
  protocol: z.string().optional(),
});

const EventBatchSchema = z.object({
  events: z.array(SidecarEventSchema),
});

/**
 * POST /api/ingest/events
 * 
 * Receives batched events from sidecar proxy.
 * 
 * Auth: Bearer token (sidecar token)
 * Body: { events: Event[] }
 * 
 * Accepts both X-Sidecar-Token and Authorization: Bearer <token> headers.
 */
export async function POST(req: NextRequest) {
  try {
    // Extract token from headers
    const authHeader = req.headers.get("authorization");
    const sidecarHeader = req.headers.get("x-sidecar-token");
    
    const token = authHeader?.replace("Bearer ", "") || sidecarHeader;
    
    if (!token) {
      return NextResponse.json(
        { error: "Missing sidecar token" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = EventBatchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid event batch", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { events } = validation.data;
    
    if (events.length === 0) {
      return NextResponse.json(
        { error: "Empty event batch" },
        { status: 400 }
      );
    }

    // Extract projectId from first event to narrow token lookup
    const firstEventProjectId = events[0].project_id;

    // Find active token by comparing hash
    // OPTIMIZATION: Filter by projectId to reduce bcrypt comparisons from O(all_tokens) to O(tokens_per_project)
    // Most projects have 1-2 active tokens, making this significantly faster than checking all org tokens.
    const projectTokens = await db.sidecarToken.findMany({
      where: { 
        status: "active",
        projectId: firstEventProjectId,
      },
      select: {
        id: true,
        orgId: true,
        projectId: true,
        tokenHash: true,
      },
    });

    let matchedToken = null;
    for (const t of projectTokens) {
      const isMatch = await bcrypt.compare(token, t.tokenHash);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: "Invalid or revoked token" },
        { status: 401 }
      );
    }

    // Check rate limit (events per minute)
    const rateLimit = await checkIngestRateLimit(matchedToken.id, events.length);
    
    if (!rateLimit.allowed) {
      console.warn(
        `Rate limit exceeded for token ${matchedToken.id}: ` +
        `${events.length} events rejected (${rateLimit.remaining}/${rateLimit.limit} remaining)`
      );
      
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Maximum ${rateLimit.limit} events per minute`,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
            "Retry-After": Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Find or create an active run for this project
    // For now, we'll associate events with the most recent non-completed run
    // or create a new run if none exists
    const activeRun = await db.run.findFirst({
      where: {
        projectId: matchedToken.projectId,
        status: { in: ["queued", "running"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const runId = activeRun?.id || null;

    // Check event quota if we have an active run
    if (runId) {
      const quotaCheck = await canIngestEvents(runId, events.length);
      if (!quotaCheck.allowed) {
        // Stop accepting events, but don't fail the request
        console.warn(`Event quota exceeded for run ${runId}: ${quotaCheck.reason}`);
        
        // Update run status to stopped_quota
        await db.run.update({
          where: { id: runId },
          data: { 
            status: "stopped_quota",
            endedAt: new Date(),
          },
        });

        return NextResponse.json(
          {
            message: "Event quota exceeded",
            reason: quotaCheck.reason,
            accepted: 0,
            rejected: events.length,
          },
          { status: 429 }
        );
      }
    }

    // Transform and store events
    const storedEvents = await Promise.all(
      events.map(async (event, index) => {
        // Determine channel based on event_type
        let channel = "http";
        let type = event.event_type;
        let actor = "adversary"; // Default for sidecar events

        if (event.event_type === "ingest_throttled") {
          channel = "policy";
          type = "policy.violation";
          actor = "system";
        } else if (event.event_type.includes("secret")) {
          type = "secret.detected";
        }

        // Build matches array from secret_matches
        const matches = event.secret_matches?.map((sm) => ({
          kind: sm.type,
          hash: `sha256:${sm.preview}`, // Simplified; sidecar should send actual hash
          preview: sm.preview,
          confidence: sm.confidence,
        })) || [];

        // Determine classification
        const classification = event.destination_type || "unknown";

        // Create event in database
        return await db.event.create({
          data: {
            orgId: matchedToken.orgId,
            projectId: matchedToken.projectId,
            runId: runId,
            ts: new Date(event.timestamp),
            seq: runId ? index : 0, // Sequence per run; if no run, use 0
            channel,
            type,
            actor,
            host: event.host || "",
            path: event.path || null,
            port: event.url ? new URL(event.url).port ? parseInt(new URL(event.url).port) : 443 : null,
            classification: classification,
            method: event.method || null,
            statusCode: event.status_code || null,
            bytesOut: null, // Sidecar doesn't send this yet
            bytesIn: null,
            durationMs: null,
            payloadRedacted: {
              summary: `${event.method || "CONNECT"} ${event.host}${event.path || ""}`,
              headersRedacted: event.headers || {},
              bodyRedactedPreview: event.body_truncated
                ? `${event.body?.substring(0, 200)}...`
                : event.body || null,
            },
            matches: matches.length > 0 ? matches : null,
            integrityHash: null, // TODO: compute hash of redacted payload
          },
        });
      })
    );

    // Update token last_seen_at (same as heartbeat)
    await db.sidecarToken.update({
      where: { id: matchedToken.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      received: events.length,
      stored: storedEvents.length,
      run_id: runId,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

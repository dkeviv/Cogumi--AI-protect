import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";

/**
 * GET /api/runs/[id]/stream
 * 
 * Server-Sent Events (SSE) stream for live run updates.
 * 
 * Streams:
 * - New story steps as they're created
 * - Run status changes
 * - New events (optional, for debugging)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;

  try {
    const orgId = await getOrgId();

    // Verify run belongs to org
    const run = await db.run.findFirst({
      where: {
        id: runId,
        orgId,
      },
    });

    if (!run) {
      return new Response("Run not found", { status: 404 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let intervalId: NodeJS.Timeout;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected", runId })}\n\n`)
        );

        // Track last seen timestamps
        let lastStoryCheck = new Date();
        let lastEventCheck = new Date();
        let lastSeenStatus = run.status; // Track status to detect changes

        // Poll for new data every 1 second
        intervalId = setInterval(async () => {
          try {
            // Check for new story steps
            const newSteps = await db.storyStep.findMany({
              where: {
                runId,
                createdAt: { gt: lastStoryCheck },
              },
              orderBy: { createdAt: "asc" },
            });

            if (newSteps.length > 0) {
              for (const step of newSteps) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "story_step", data: step })}\n\n`
                  )
                );
              }
              lastStoryCheck = new Date();
            }

            // Check for new events (optional, for real-time feed)
            const newEvents = await db.event.findMany({
              where: {
                runId,
                createdAt: { gt: lastEventCheck },
              },
              orderBy: { createdAt: "asc" },
              take: 10, // Limit to avoid overwhelming client
            });

            if (newEvents.length > 0) {
              for (const event of newEvents) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "event", data: event })}\n\n`
                  )
                );
              }
              lastEventCheck = new Date();
            }

            // Check for run status changes
            const currentRun = await db.run.findUnique({
              where: { id: runId },
            });

            if (currentRun && currentRun.status !== lastSeenStatus) {
              lastSeenStatus = currentRun.status; // Update last seen status
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "run_status",
                    data: { status: currentRun.status, endedAt: currentRun.endedAt },
                  })}\n\n`
                )
              );

              // If run is complete, close the stream
              if (["completed", "failed", "canceled", "stopped_quota"].includes(currentRun.status)) {
                clearInterval(intervalId);
                controller.close();
              }
            }
          } catch (error) {
            console.error("SSE poll error:", error);
          }
        }, 1000);
      },

      cancel() {
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE stream error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

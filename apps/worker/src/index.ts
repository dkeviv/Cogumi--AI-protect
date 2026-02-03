/**
 * BullMQ Worker Process
 * 
 * Processes jobs from the run execution queue.
 * Runs as a separate process from the web server for better scalability.
 */

import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { prisma as db } from "@cogumi/db";

// Redis connection
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * Execute a run (copied from run-orchestrator)
 * This should eventually be moved to a shared package
 */
async function executeRun(runId: string): Promise<void> {
  console.log(`Starting run execution: ${runId}`);

  // Get configurable duration cap (default 30 minutes)
  const maxDurationMinutes = parseInt(process.env.MAX_RUN_DURATION_MINUTES || "30", 10);
  const maxDurationMs = maxDurationMinutes * 60 * 1000;
  
  let timeoutId: NodeJS.Timeout | null = null;
  let timedOut = false;

  try {
    // Get run and project
    const run = await db.run.findUnique({
      where: { id: runId },
      include: {
        project: true,
      },
    });

    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    if (!run.project.agentTestUrl) {
      throw new Error(`Project ${run.projectId} has no agent test URL configured`);
    }

    // Update run status to running
    await db.run.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    console.log(`Run ${runId} status: running (max duration: ${maxDurationMinutes} minutes)`);

    // Set timeout to stop run if it exceeds duration cap
    timeoutId = setTimeout(async () => {
      timedOut = true;
      console.warn(`Run ${runId} exceeded maximum duration of ${maxDurationMinutes} minutes`);
      
      await db.run.update({
        where: { id: runId },
        data: {
          status: "stopped_quota",
          endedAt: new Date(),
        },
      });
    }, maxDurationMs);

    // Note: Script execution will be implemented in the worker packages
    // For now, just mark as completed
    console.log(`Run ${runId} - script execution not yet implemented in worker`);

    // Check if we timed out during execution
    if (timedOut) {
      console.log(`Run ${runId} was stopped due to timeout`);
      return;
    }

    // Update run status to completed
    await db.run.update({
      where: { id: runId },
      data: {
        status: "completed",
        endedAt: new Date(),
        riskScore: 0,
      },
    });

    console.log(`Run ${runId} completed`);
  } catch (error) {
    console.error(`Run ${runId} failed:`, error);

    // Only update if not already stopped by timeout
    if (!timedOut) {
      await db.run.update({
        where: { id: runId },
        data: {
          status: "failed",
          endedAt: new Date(),
        },
      });
    }

    throw error;
  } finally {
    // Clear timeout if run completed before timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Process run execution jobs
 */
const worker = new Worker(
  "run-execution",
  async (job: Job) => {
    console.log(`Processing job ${job.id} - Run ${job.data.runId}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Execute the run
      await executeRun(job.data.runId);
      
      // Mark as complete
      await job.updateProgress(100);
      
      console.log(`Completed job ${job.id} - Run ${job.data.runId}`);
      
      return { success: true, runId: job.data.runId };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error; // Will trigger automatic retry
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event listeners
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  if (job) {
    console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  }
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await connection.quit();
  console.log("Worker shut down successfully");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await connection.quit();
  console.log("Worker shut down successfully");
  process.exit(0);
});

console.log("🚀 Worker started and listening for jobs...");
console.log(`Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);
console.log(`Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);

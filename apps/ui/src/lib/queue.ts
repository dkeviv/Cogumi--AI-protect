/**
 * BullMQ Queue Service
 * 
 * Manages job queues for asynchronous task processing.
 * - Run execution queue (for pentest scripts)
 * - Automatic retries on failure
 * - Job scheduling and prioritization
 */

import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";

// Redis connection
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * Run execution queue
 * Jobs: Execute pentest run (all scripts)
 */
export const runQueue = new Queue("run-execution", {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 5000, // Keep max 5000 failed jobs
    },
  },
});

/**
 * Queue events for monitoring
 */
export const runQueueEvents = new QueueEvents("run-execution", { connection });

/**
 * Add a run execution job to the queue
 */
export async function enqueueRunExecution(runId: string, priority?: number) {
  const job = await runQueue.add(
    "execute-run",
    { runId },
    {
      jobId: runId, // Use runId as job ID to prevent duplicates
      priority, // Higher number = higher priority
    }
  );

  console.log(`Enqueued run ${runId} as job ${job.id}`);
  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(runId: string) {
  const job = await runQueue.getJob(runId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  
  return {
    id: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(runId: string) {
  const job = await runQueue.getJob(runId);
  
  if (job) {
    await job.remove();
    console.log(`Cancelled job ${runId}`);
  }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    runQueue.getWaitingCount(),
    runQueue.getActiveCount(),
    runQueue.getCompletedCount(),
    runQueue.getFailedCount(),
    runQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Closing queue connections...");
  await runQueue.close();
  await runQueueEvents.close();
  await connection.quit();
  process.exit(0);
});

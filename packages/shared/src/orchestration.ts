/**
 * Orchestration Module Re-exports
 * 
 * This module documents the orchestration functions that live in apps/ui/src/lib/
 * for use by the worker process.
 * 
 * WHY THE CODE IS NOT HERE:
 * - The actual implementation lives in apps/ui/src/lib/ to avoid circular dependencies
 * - These functions depend on Prisma client which is configured in the UI app
 * - Keeping them in the UI app simplifies the build and deployment
 * 
 * HOW THE WORKER ACCESSES THEM:
 * - The worker uses dynamic require() at runtime in apps/worker/src/index.ts
 * - This avoids bundling issues and keeps the packages/shared as pure types/schemas
 * 
 * AVAILABLE MODULES:
 * - apps/ui/src/lib/scripts/executor.ts - executeAllScripts()
 * - apps/ui/src/lib/story-builder.ts - buildStoryForRun(), createStoryStep()
 * - apps/ui/src/lib/run-orchestrator.ts - Helper functions (not directly used by worker)
 */

// This file is intentionally empty of actual code.
// See the documentation above for the architecture rationale.


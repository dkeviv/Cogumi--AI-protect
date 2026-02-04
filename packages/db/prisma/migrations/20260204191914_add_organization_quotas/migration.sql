/*
  Warnings:

  - You are about to drop the column `status` on the `StoryStep` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token_expires` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Event_seq_idx";

-- DropIndex
DROP INDEX "Event_ts_idx";

-- DropIndex
DROP INDEX "Finding_orgId_idx";

-- DropIndex
DROP INDEX "Finding_severity_idx";

-- DropIndex
DROP INDEX "Run_createdAt_idx";

-- DropIndex
DROP INDEX "Run_status_idx";

-- DropIndex
DROP INDEX "ScriptResult_orgId_idx";

-- DropIndex
DROP INDEX "SidecarToken_tokenHash_idx";

-- DropIndex
DROP INDEX "StoryStep_ts_idx";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "maxEventsPerRun" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "maxProjects" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxRunsPerMonth" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maxStorageMB" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "StoryStep" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email_verified",
DROP COLUMN "password_hash",
DROP COLUMN "verification_token",
DROP COLUMN "verification_token_expires",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT;

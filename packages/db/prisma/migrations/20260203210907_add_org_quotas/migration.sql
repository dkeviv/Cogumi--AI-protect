-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectEnv" AS ENUM ('sandbox', 'staging', 'prod');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled', 'stopped_quota');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('confirmed', 'attempted', 'suspected');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verification_token_expires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" "ProjectEnv" NOT NULL DEFAULT 'sandbox',
    "prodOverrideEnabled" BOOLEAN NOT NULL DEFAULT false,
    "agentTestUrl" TEXT,
    "toolDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalSuffixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retentionDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SidecarToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SidecarToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "riskScore" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT,
    "ts" TIMESTAMP(3) NOT NULL,
    "seq" INTEGER,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "path" TEXT,
    "port" INTEGER,
    "classification" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "bytesOut" INTEGER,
    "bytesIn" INTEGER,
    "durationMs" INTEGER,
    "payloadRedacted" JSONB,
    "matches" JSONB,
    "integrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryStep" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "seqStart" INTEGER,
    "seqEnd" INTEGER,
    "scriptId" TEXT,
    "stepKind" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "claimTitle" TEXT NOT NULL,
    "claimSummary" TEXT NOT NULL,
    "attackStyle" TEXT,
    "evidenceEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptResult" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "FindingStatus" NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "narrativeSteps" JSONB,
    "remediationMd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "contentMd" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StylePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabledByDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StylePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRedTeamConfig" (
    "projectId" TEXT NOT NULL,
    "enabledStyleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intensity" TEXT NOT NULL DEFAULT 'low',
    "versionPin" TEXT DEFAULT 'v1',

    CONSTRAINT "ProjectRedTeamConfig_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "PromptVariant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "scriptStepId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "promptText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'builtin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PromptVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_orgId_userId_key" ON "Membership"("orgId", "userId");

-- CreateIndex
CREATE INDEX "SidecarToken_projectId_idx" ON "SidecarToken"("projectId");

-- CreateIndex
CREATE INDEX "SidecarToken_orgId_idx" ON "SidecarToken"("orgId");

-- CreateIndex
CREATE INDEX "SidecarToken_tokenHash_idx" ON "SidecarToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Run_projectId_idx" ON "Run"("projectId");

-- CreateIndex
CREATE INDEX "Run_orgId_idx" ON "Run"("orgId");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE INDEX "Run_createdAt_idx" ON "Run"("createdAt");

-- CreateIndex
CREATE INDEX "Event_runId_idx" ON "Event"("runId");

-- CreateIndex
CREATE INDEX "Event_projectId_idx" ON "Event"("projectId");

-- CreateIndex
CREATE INDEX "Event_orgId_idx" ON "Event"("orgId");

-- CreateIndex
CREATE INDEX "Event_ts_idx" ON "Event"("ts");

-- CreateIndex
CREATE INDEX "Event_seq_idx" ON "Event"("seq");

-- CreateIndex
CREATE INDEX "StoryStep_runId_idx" ON "StoryStep"("runId");

-- CreateIndex
CREATE INDEX "StoryStep_orgId_idx" ON "StoryStep"("orgId");

-- CreateIndex
CREATE INDEX "StoryStep_ts_idx" ON "StoryStep"("ts");

-- CreateIndex
CREATE INDEX "ScriptResult_runId_idx" ON "ScriptResult"("runId");

-- CreateIndex
CREATE INDEX "ScriptResult_orgId_idx" ON "ScriptResult"("orgId");

-- CreateIndex
CREATE INDEX "Finding_runId_idx" ON "Finding"("runId");

-- CreateIndex
CREATE INDEX "Finding_orgId_idx" ON "Finding"("orgId");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Report_runId_key" ON "Report"("runId");

-- CreateIndex
CREATE INDEX "Report_orgId_idx" ON "Report"("orgId");

-- CreateIndex
CREATE INDEX "PromptVariant_projectId_idx" ON "PromptVariant"("projectId");

-- CreateIndex
CREATE INDEX "PromptVariant_orgId_idx" ON "PromptVariant"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVariant_projectId_scriptId_scriptStepId_styleId_versi_key" ON "PromptVariant"("projectId", "scriptId", "scriptStepId", "styleId", "version");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidecarToken" ADD CONSTRAINT "SidecarToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryStep" ADD CONSTRAINT "StoryStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptResult" ADD CONSTRAINT "ScriptResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRedTeamConfig" ADD CONSTRAINT "ProjectRedTeamConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVariant" ADD CONSTRAINT "PromptVariant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

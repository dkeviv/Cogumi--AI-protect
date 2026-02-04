-- AlterTable
ALTER TABLE "SidecarToken" ADD COLUMN     "tokenPrefix" TEXT;

-- CreateIndex
CREATE INDEX "SidecarToken_tokenPrefix_idx" ON "SidecarToken"("tokenPrefix");

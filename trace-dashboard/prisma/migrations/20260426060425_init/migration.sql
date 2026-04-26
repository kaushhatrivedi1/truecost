-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT 'You',
    "timestamp" DATETIME NOT NULL,
    "platformId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "carbonMg" REAL NOT NULL,
    "waterMl" REAL NOT NULL,
    "score" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "promptPreview" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

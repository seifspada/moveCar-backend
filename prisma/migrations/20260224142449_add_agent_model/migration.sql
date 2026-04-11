-- CreateTable
CREATE TABLE "agents" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "photo" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agenceId" INTEGER NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_agenceId_key" ON "agents"("agenceId");

-- CreateIndex
CREATE INDEX "agents_email_idx" ON "agents"("email");

-- CreateIndex
CREATE INDEX "agents_isActive_idx" ON "agents"("isActive");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "agences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

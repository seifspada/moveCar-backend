-- CreateTable
CREATE TABLE "agences" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "adresse" VARCHAR(255),
    "ville" VARCHAR(100),
    "codePostal" VARCHAR(20),
    "telephone" VARCHAR(20),
    "email" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "partenaireId" INTEGER NOT NULL,

    CONSTRAINT "agences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agences_partenaireId_idx" ON "agences"("partenaireId");

-- CreateIndex
CREATE INDEX "agences_isActive_idx" ON "agences"("isActive");

-- AddForeignKey
ALTER TABLE "agences" ADD CONSTRAINT "agences_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

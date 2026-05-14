-- AlterTable
ALTER TABLE "alertes_geographiques" ADD COLUMN     "emailActif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "pushActif" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notifications_alertes" ADD COLUMN     "pushEnvoye" BOOLEAN NOT NULL DEFAULT false;

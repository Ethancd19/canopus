-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "cloudinaryId",
ALTER COLUMN "storageKey" SET NOT NULL,
ALTER COLUMN "published" SET DEFAULT false;


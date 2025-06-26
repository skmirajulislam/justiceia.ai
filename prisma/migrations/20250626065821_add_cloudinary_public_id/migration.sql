/*
  Warnings:

  - Made the column `created_at` on table `Profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `Profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vkyc_completed` on table `Profile` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `Report` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_user_id_fkey";

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "vkyc_completed" SET NOT NULL,
ALTER COLUMN "vkyc_completed" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "court" TEXT,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

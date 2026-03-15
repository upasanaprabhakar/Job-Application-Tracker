-- AlterTable
ALTER TABLE "User" ADD COLUMN     "location" TEXT DEFAULT '',
ADD COLUMN     "notifFollowUpReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifInterviewReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifMasterEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifStatusChanges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifWeeklyDigest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT DEFAULT '';

-- AlterTable: Add new fields to Attendance
ALTER TABLE "Attendance" ADD COLUMN "correctionNote" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "hoursWorked" DECIMAL;
ALTER TABLE "Attendance" ADD COLUMN "lateMinutes" INTEGER;
ALTER TABLE "Attendance" ADD COLUMN "earlyLeaveMinutes" INTEGER;
ALTER TABLE "Attendance" ADD COLUMN "overtimeMinutes" INTEGER;
ALTER TABLE "Attendance" ADD COLUMN "needsApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendance" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Attendance_hasAnomaly_idx" ON "Attendance"("hasAnomaly");
CREATE INDEX "Attendance_needsApproval_idx" ON "Attendance"("needsApproval");

-- AlterEnum: Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_ANOMALY';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_CORRECTED';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_APPROVAL_REQUIRED';


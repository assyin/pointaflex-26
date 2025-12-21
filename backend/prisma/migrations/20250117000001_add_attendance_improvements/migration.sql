-- AlterTable: Add new fields to Attendance (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Attendance'
  ) THEN
    -- Add correctionNote column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'correctionNote'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "correctionNote" TEXT;
    END IF;

    -- Add hoursWorked column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'hoursWorked'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "hoursWorked" DECIMAL;
    END IF;

    -- Add lateMinutes column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'lateMinutes'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "lateMinutes" INTEGER;
    END IF;

    -- Add earlyLeaveMinutes column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'earlyLeaveMinutes'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "earlyLeaveMinutes" INTEGER;
    END IF;

    -- Add overtimeMinutes column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'overtimeMinutes'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "overtimeMinutes" INTEGER;
    END IF;

    -- Add needsApproval column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'needsApproval'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "needsApproval" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add approvalStatus column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'approvalStatus'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "approvalStatus" TEXT;
    END IF;

    -- Add approvedBy column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'approvedBy'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "approvedBy" TEXT;
    END IF;

    -- Add approvedAt column (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'approvedAt'
    ) THEN
      ALTER TABLE "Attendance" ADD COLUMN "approvedAt" TIMESTAMP(3);
    END IF;
  END IF;
END $$;

-- CreateIndex (if not exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Attendance'
  ) THEN
    -- Create index on hasAnomaly (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'Attendance' AND indexname = 'Attendance_hasAnomaly_idx'
    ) THEN
      CREATE INDEX "Attendance_hasAnomaly_idx" ON "Attendance"("hasAnomaly");
    END IF;

    -- Create index on needsApproval (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'Attendance' AND indexname = 'Attendance_needsApproval_idx'
    ) THEN
      CREATE INDEX "Attendance_needsApproval_idx" ON "Attendance"("needsApproval");
    END IF;
  END IF;
END $$;

-- AlterEnum: Add new notification types (if not exists)
DO $$
BEGIN
  -- Check if NotificationType enum exists
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'NotificationType'
  ) THEN
    -- Add ATTENDANCE_ANOMALY value (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'NotificationType' AND e.enumlabel = 'ATTENDANCE_ANOMALY'
    ) THEN
      ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_ANOMALY';
    END IF;

    -- Add ATTENDANCE_CORRECTED value (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'NotificationType' AND e.enumlabel = 'ATTENDANCE_CORRECTED'
    ) THEN
      ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_CORRECTED';
    END IF;

    -- Add ATTENDANCE_APPROVAL_REQUIRED value (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'NotificationType' AND e.enumlabel = 'ATTENDANCE_APPROVAL_REQUIRED'
    ) THEN
      ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_APPROVAL_REQUIRED';
    END IF;
  END IF;
END $$;


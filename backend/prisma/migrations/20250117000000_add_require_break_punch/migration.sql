-- AlterTable: Add requireBreakPunch column to TenantSettings (if not exists)
DO $$
BEGIN
  -- Check if TenantSettings table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'TenantSettings'
  ) THEN
    -- Check if column doesn't exist before adding it
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'TenantSettings' AND column_name = 'requireBreakPunch'
    ) THEN
      ALTER TABLE "TenantSettings" ADD COLUMN "requireBreakPunch" BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;


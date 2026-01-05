-- Align GoogleTokenRefreshHistory with schema (organizationId + message/errorDetails)

-- Add new columns if missing
ALTER TABLE "public"."GoogleTokenRefreshHistory"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "message" TEXT,
  ADD COLUMN IF NOT EXISTS "errorDetails" TEXT;

-- If legacy columns exist (tokenId/errorMessage), backfill and then remove them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'GoogleTokenRefreshHistory'
      AND column_name = 'tokenId'
  ) THEN
    -- Backfill organizationId from tokenId -> GoogleToken.organizationId
    EXECUTE $$
      UPDATE "public"."GoogleTokenRefreshHistory" h
      SET "organizationId" = t."organizationId"
      FROM "public"."GoogleToken" t
      WHERE h."organizationId" IS NULL
        AND h."tokenId" = t."id";
    $$;

    -- Backfill errorDetails/message from legacy errorMessage where present
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'GoogleTokenRefreshHistory'
        AND column_name = 'errorMessage'
    ) THEN
      EXECUTE $$
        UPDATE "public"."GoogleTokenRefreshHistory"
        SET "errorDetails" = "errorMessage"
        WHERE "errorDetails" IS NULL
          AND "errorMessage" IS NOT NULL;
      $$;
    END IF;

    EXECUTE $$
      UPDATE "public"."GoogleTokenRefreshHistory"
      SET "message" = CASE WHEN "success" THEN 'Token refreshed successfully' ELSE 'Erreur lors du refresh du token' END
      WHERE "message" IS NULL;
    $$;

    -- Remove legacy FK/index/columns (if they exist)
    EXECUTE 'ALTER TABLE "public"."GoogleTokenRefreshHistory" DROP CONSTRAINT IF EXISTS "GoogleTokenRefreshHistory_tokenId_fkey"';
    EXECUTE 'DROP INDEX IF EXISTS "public"."GoogleTokenRefreshHistory_tokenId_idx"';
    EXECUTE 'ALTER TABLE "public"."GoogleTokenRefreshHistory" DROP COLUMN IF EXISTS "tokenId"';
    EXECUTE 'ALTER TABLE "public"."GoogleTokenRefreshHistory" DROP COLUMN IF EXISTS "errorMessage"';
  END IF;
END $$;

-- If any rows couldn't be backfilled (e.g. orphaned legacy rows), remove them
DELETE FROM "public"."GoogleTokenRefreshHistory"
WHERE "organizationId" IS NULL;

-- organizationId must be present for the new relation
ALTER TABLE "public"."GoogleTokenRefreshHistory" ALTER COLUMN "organizationId" SET NOT NULL;

-- Index and FK for organization relation
CREATE INDEX IF NOT EXISTS "GoogleTokenRefreshHistory_organizationId_idx" ON "public"."GoogleTokenRefreshHistory"("organizationId");

ALTER TABLE "public"."GoogleTokenRefreshHistory"
  ADD CONSTRAINT "GoogleTokenRefreshHistory_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

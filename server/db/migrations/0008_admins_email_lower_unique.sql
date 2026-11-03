DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "admins" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'admins has e-mails that differ only by case; merge or delete the duplicates, then re-run the migration';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_lower_uq" ON "admins" USING btree (lower("email"));--> statement-breakpoint
DROP INDEX "admins_email_uq";

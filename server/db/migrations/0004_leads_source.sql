ALTER TABLE "leads" ADD COLUMN "lang" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm" jsonb;--> statement-breakpoint
CREATE INDEX "leads_phone_created_idx" ON "leads" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "leads_ip_created_idx" ON "leads" USING btree ("ip_hash","created_at");
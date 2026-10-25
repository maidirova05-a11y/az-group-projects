CREATE TYPE "public"."registration_status" AS ENUM('new', 'confirmed', 'paid', 'cancelled', 'spam');--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer,
	"event_id" integer,
	"program_name" text NOT NULL,
	"event_label" text DEFAULT '' NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"event_date" date,
	"participant_name" text NOT NULL,
	"grade" text NOT NULL,
	"school" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"subjects" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"comment" text DEFAULT '' NOT NULL,
	"amount" integer,
	"lang" text,
	"referrer" text,
	"utm" jsonb,
	"status" "registration_status" DEFAULT 'new' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "legacy_id" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registrations_status_idx" ON "registrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "registrations_created_idx" ON "registrations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "registrations_program_idx" ON "registrations" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "registrations_phone_created_idx" ON "registrations" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "registrations_ip_created_idx" ON "registrations" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_legacy_uq" ON "news" USING btree ("legacy_id");
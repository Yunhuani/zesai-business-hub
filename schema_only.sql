CREATE TABLE "__drizzle_migrations" (
  "id" BIGINT NOT NULL,
  "hash" text NOT NULL,
  "created_at" bigint DEFAULT NULL,
  PRIMARY KEY ("id") ,
  UNIQUE ("id")
)
;

BEGIN;
;

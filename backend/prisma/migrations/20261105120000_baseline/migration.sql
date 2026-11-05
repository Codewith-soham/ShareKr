-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PoolVisibility" AS ENUM ('GENERAL', 'WOMEN_ONLY');

-- CreateEnum
CREATE TYPE "JourneyType" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('OPEN', 'READY', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolExpirationReason" AS ENUM ('JOIN_DEADLINE_REACHED', 'SCHEDULED_DEPARTURE_REACHED', 'READY_TIMEOUT');

-- CreateEnum
CREATE TYPE "PoolMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'POOL_READY', 'POOL_EXPIRED', 'POOL_CANCELLED', 'DEPARTURE_APPROACHING', 'DEPARTURE_REMINDER', 'ACCOUNT_SUSPENDED');

-- CreateEnum
CREATE TYPE "DestinationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('SUGGESTION', 'TECHNICAL_PROBLEM', 'EXPERIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'LOGIN');

-- CreateEnum
CREATE TYPE "AdminRoleType" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" TEXT,
    "google_subject" TEXT,
    "gender" "Gender",
    "profile_image_url" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "phone_verified_at" TIMESTAMPTZ(6),
    "profile_completed_at" TIMESTAMPTZ(6),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "address" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "visibility" "PoolVisibility" NOT NULL DEFAULT 'GENERAL',
    "journey_type" "JourneyType" NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'OPEN',
    "pickup_address" VARCHAR(500) NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "departure_time" TIMESTAMPTZ(6) NOT NULL,
    "join_deadline" TIMESTAMPTZ(6) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "locked_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(500),
    "expiration_reason" "PoolExpirationReason",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_members" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "PoolMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "removal_reason" VARCHAR(500),

    CONSTRAINT "pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID,
    "pool_id" UUID,
    "reason" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "resolution_notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pool_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pool_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "destination_id" UUID,
    "requested_name" VARCHAR(150) NOT NULL,
    "requested_address" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "DestinationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "admin_notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "destination_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "admin_notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AdminRoleType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(2048) NOT NULL,
    "device_type" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_otp_challenges" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "pending_full_name" VARCHAR(120),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "invalidated_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "destinations_name_idx" ON "destinations"("name");

-- CreateIndex
CREATE INDEX "destinations_is_active_idx" ON "destinations"("is_active");

-- CreateIndex
CREATE INDEX "pools_creator_id_idx" ON "pools"("creator_id");

-- CreateIndex
CREATE INDEX "pools_destination_id_status_idx" ON "pools"("destination_id", "status");

-- CreateIndex
CREATE INDEX "pools_status_departure_time_idx" ON "pools"("status", "departure_time");

-- CreateIndex
CREATE INDEX "pools_status_join_deadline_idx" ON "pools"("status", "join_deadline");

-- CreateIndex
CREATE INDEX "pools_visibility_status_idx" ON "pools"("visibility", "status");

-- CreateIndex
CREATE INDEX "pools_created_at_idx" ON "pools"("created_at");

-- CreateIndex
CREATE INDEX "pool_members_pool_id_status_idx" ON "pool_members"("pool_id", "status");

-- CreateIndex
CREATE INDEX "pool_members_user_id_status_idx" ON "pool_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "pool_members_joined_at_idx" ON "pool_members"("joined_at");

-- CreateIndex
CREATE INDEX "pool_reports_status_created_at_idx" ON "pool_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "pool_reports_reporter_id_idx" ON "pool_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "pool_reports_reported_user_id_idx" ON "pool_reports"("reported_user_id");

-- CreateIndex
CREATE INDEX "pool_reports_pool_id_idx" ON "pool_reports"("pool_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_pool_id_idx" ON "notifications"("pool_id");

-- CreateIndex
CREATE INDEX "pool_events_pool_id_created_at_idx" ON "pool_events"("pool_id", "created_at");

-- CreateIndex
CREATE INDEX "pool_events_user_id_created_at_idx" ON "pool_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "pool_events_event_type_idx" ON "pool_events"("event_type");

-- CreateIndex
CREATE INDEX "destination_requests_status_created_at_idx" ON "destination_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "destination_requests_user_id_idx" ON "destination_requests"("user_id");

-- CreateIndex
CREATE INDEX "feedback_status_created_at_idx" ON "feedback"("status", "created_at");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_user_id_key" ON "admin_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_token_key" ON "push_subscriptions"("token");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_is_active_idx" ON "push_subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "auth_otp_challenges_email_created_at_idx" ON "auth_otp_challenges"("email", "created_at");

-- CreateIndex
CREATE INDEX "auth_otp_challenges_expires_at_idx" ON "auth_otp_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_events" ADD CONSTRAINT "pool_events_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_events" ADD CONSTRAINT "pool_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_requests" ADD CONSTRAINT "destination_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_requests" ADD CONSTRAINT "destination_requests_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ============================================================
-- Business-rule constraints and partial indexes (not expressible in schema.prisma)
-- ============================================================

-- A pool can contain only 1, 2, or 3 passengers.
ALTER TABLE "pools" ADD CONSTRAINT "pools_capacity_check" CHECK ("capacity" BETWEEN 1 AND 3);

-- Valid geographical coordinates.
ALTER TABLE "pools" ADD CONSTRAINT "pools_pickup_latitude_check" CHECK ("pickup_latitude" BETWEEN -90 AND 90);
ALTER TABLE "pools" ADD CONSTRAINT "pools_pickup_longitude_check" CHECK ("pickup_longitude" BETWEEN -180 AND 180);
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180);

-- Only one active membership per user in a particular pool.
CREATE UNIQUE INDEX "pool_members_active_pool_user_unique" ON "pool_members" ("pool_id", "user_id") WHERE "status" = 'ACTIVE';

-- A user can participate in only one active pool at a time.
CREATE UNIQUE INDEX "pool_members_one_active_pool_per_user" ON "pool_members" ("user_id") WHERE "status" = 'ACTIVE';

-- A user cannot block themselves.
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_no_self_block" CHECK ("blocker_id" <> "blocked_id");

-- A pool report must target a user or a pool.
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_must_have_target" CHECK ("reported_user_id" IS NOT NULL OR "pool_id" IS NOT NULL);

-- Scheduled pools: join deadline must be before departure.
ALTER TABLE "pools" ADD CONSTRAINT "pools_scheduled_deadline_before_departure" CHECK ("journey_type" <> 'SCHEDULED' OR "join_deadline" < "departure_time");

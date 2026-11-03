-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PoolVisibility" AS ENUM ('GENERAL', 'WOMEN_ONLY');

-- CreateEnum
CREATE TYPE "JourneyType" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('OPEN', 'READY', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpirationReason" AS ENUM ('DEADLINE_REACHED', 'DEPARTURE_REACHED', 'READY_TIMEOUT');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEMBER_JOINED', 'MEMBER_LEFT', 'POOL_READY', 'POOL_EXPIRED', 'POOL_CANCELLED', 'DEPARTURE_REMINDER_10_MIN', 'DEPARTURE_REMINDER_5_MIN', 'ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "PoolEventType" AS ENUM ('POOL_CREATED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'PICKUP_UPDATED', 'DEPARTURE_UPDATED', 'CAPACITY_LOCKED', 'DEADLINE_EXTENDED', 'POOL_READY', 'POOL_EXPIRED', 'POOL_CANCELLED', 'ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "DestinationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('SUGGESTION', 'TECHNICAL_PROBLEM', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "PushProvider" AS ENUM ('FCM', 'WEB_PUSH');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "phone_verified_at" TIMESTAMPTZ,
    "gender" "Gender" NOT NULL,
    "profile_image_url" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_subject" VARCHAR(255),
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "visibility" "PoolVisibility" NOT NULL,
    "journey_type" "JourneyType" NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "departure_time" TIMESTAMPTZ NOT NULL,
    "join_deadline" TIMESTAMPTZ NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'OPEN',
    "locked_at" TIMESTAMPTZ,
    "ready_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "expiration_reason" "ExpirationReason",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_members" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "member_status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,
    "ended_reason" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID,
    "pool_id" UUID,
    "reason" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pool_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pool_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" "PoolEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "destination_name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "status" "DestinationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "destination_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pool_id" UUID,
    "category" "FeedbackCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AdminRole" NOT NULL,
    "granted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "PushProvider" NOT NULL,
    "device_token" TEXT NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "destinations_is_active_name_idx" ON "destinations"("is_active", "name");

-- CreateIndex
CREATE INDEX "pools_destination_id_status_departure_time_idx" ON "pools"("destination_id", "status", "departure_time");

-- CreateIndex
CREATE INDEX "pools_status_join_deadline_idx" ON "pools"("status", "join_deadline");

-- CreateIndex
CREATE INDEX "pools_creator_id_created_at_idx" ON "pools"("creator_id", "created_at");

-- CreateIndex
CREATE INDEX "pool_members_pool_id_member_status_idx" ON "pool_members"("pool_id", "member_status");

-- CreateIndex
CREATE INDEX "pool_members_user_id_joined_at_idx" ON "pool_members"("user_id", "joined_at");

-- CreateIndex
CREATE INDEX "pool_reports_status_created_at_idx" ON "pool_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "pool_events_pool_id_created_at_idx" ON "pool_events"("pool_id", "created_at");

-- CreateIndex
CREATE INDEX "destination_requests_status_created_at_idx" ON "destination_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "feedback_status_created_at_idx" ON "feedback"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_user_id_key" ON "admin_roles"("user_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_is_active_idx" ON "push_subscriptions"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "destination_requests" ADD CONSTRAINT "destination_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_requests" ADD CONSTRAINT "destination_requests_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Custom Business Rule Constraints & Partial Indexes

-- 1. Capacity: must be between 1 and 3
ALTER TABLE "pools"
  ADD CONSTRAINT "pools_capacity_check"
  CHECK ("capacity" BETWEEN 1 AND 3);

-- 2. Coordinate validation on pools
ALTER TABLE "pools"
  ADD CONSTRAINT "pools_pickup_latitude_check"
  CHECK ("pickup_latitude" BETWEEN -90 AND 90);

ALTER TABLE "pools"
  ADD CONSTRAINT "pools_pickup_longitude_check"
  CHECK ("pickup_longitude" BETWEEN -180 AND 180);

-- 3. Coordinate validation on destinations
ALTER TABLE "destinations"
  ADD CONSTRAINT "destinations_latitude_check"
  CHECK ("latitude" BETWEEN -90 AND 90);

ALTER TABLE "destinations"
  ADD CONSTRAINT "destinations_longitude_check"
  CHECK ("longitude" BETWEEN -180 AND 180);

-- 4. Partial unique index: one active membership per user per pool
CREATE UNIQUE INDEX "pool_members_active_pool_user_unique"
  ON "pool_members" ("pool_id", "user_id")
  WHERE "member_status" = 'ACTIVE';

-- 5. Partial unique index: one active pool per user across all pools
CREATE UNIQUE INDEX "pool_members_one_active_pool_per_user"
  ON "pool_members" ("user_id")
  WHERE "member_status" = 'ACTIVE';

-- 6. No self-blocking
ALTER TABLE "user_blocks"
  ADD CONSTRAINT "user_blocks_no_self_block"
  CHECK ("blocker_id" <> "blocked_id");

-- 7. Pool report must target at least one entity
ALTER TABLE "pool_reports"
  ADD CONSTRAINT "pool_reports_must_have_target"
  CHECK ("reported_user_id" IS NOT NULL OR "pool_id" IS NOT NULL);

-- 8. Scheduled pool: join_deadline must be before departure_time
ALTER TABLE "pools"
  ADD CONSTRAINT "pools_scheduled_deadline_before_departure"
  CHECK (
    "journey_type" <> 'SCHEDULED'
    OR "join_deadline" < "departure_time"
  );

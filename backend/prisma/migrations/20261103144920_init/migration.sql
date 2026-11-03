-- A pool can contain only 1, 2, or 3 passengers.
ALTER TABLE "pools"
ADD CONSTRAINT "pools_capacity_check"
CHECK ("capacity" BETWEEN 1 AND 3);

-- Only one active membership per user in a particular pool.
CREATE UNIQUE INDEX "pool_members_active_pool_user_unique"
ON "pool_members" ("pool_id", "user_id")
WHERE "status" = 'ACTIVE';

-- A user can participate in only one active pool at a time.
CREATE UNIQUE INDEX "pool_members_one_active_pool_per_user"
ON "pool_members" ("user_id")
WHERE "status" = 'ACTIVE';

-- A user cannot block themselves.
ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_no_self_block"
CHECK ("blocker_id" <> "blocked_id");

-- Valid geographical coordinates.
ALTER TABLE "pools"
ADD CONSTRAINT "pools_pickup_latitude_check"
CHECK ("pickup_latitude" BETWEEN -90 AND 90);

ALTER TABLE "pools"
ADD CONSTRAINT "pools_pickup_longitude_check"
CHECK ("pickup_longitude" BETWEEN -180 AND 180);
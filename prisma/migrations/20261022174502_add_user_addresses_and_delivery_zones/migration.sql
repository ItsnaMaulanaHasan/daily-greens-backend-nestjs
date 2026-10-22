-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_address_id" UUID,
ADD COLUMN     "delivery_postal_code" VARCHAR(10),
ADD COLUMN     "delivery_zone_id" UUID,
ADD COLUMN     "delivery_zone_name" VARCHAR(100),
ADD COLUMN     "estimated_delivery_max_minutes" INTEGER,
ADD COLUMN     "estimated_delivery_min_minutes" INTEGER;

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_phone" VARCHAR(20) NOT NULL,
    "address_line" TEXT NOT NULL,
    "provience" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "village" VARCHAR(100),
    "postal_code" VARCHAR(10) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "note" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "delivery_fee" DECIMAL(12,2) NOT NULL,
    "minimum_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "free_delivery_threshold" DECIMAL(12,2),
    "estimated_min_minutes" INTEGER NOT NULL,
    "estimated_max_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zone_postal_codes" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "postal_code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zone_postal_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_addresses_user_id_deleted_at_idx" ON "user_addresses"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "user_addresses_user_id_is_default_idx" ON "user_addresses"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "user_addresses_postal_code_idx" ON "user_addresses"("postal_code");

-- CreateIndex
CREATE INDEX "delivery_zones_is_active_deleted_at_idx" ON "delivery_zones"("is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zone_postal_codes_postal_code_key" ON "delivery_zone_postal_codes"("postal_code");

-- CreateIndex
CREATE INDEX "delivery_zone_postal_codes_zone_id_idx" ON "delivery_zone_postal_codes"("zone_id");

-- CreateIndex
CREATE INDEX "orders_delivery_address_id_idx" ON "orders"("delivery_address_id");

-- CreateIndex
CREATE INDEX "orders_delivery_zone_id_idx" ON "orders"("delivery_zone_id");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zone_postal_codes" ADD CONSTRAINT "delivery_zone_postal_codes_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "user_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "store_settings" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'default',
    "store_name" VARCHAR(255) NOT NULL DEFAULT 'Daily Greens',
    "email" VARCHAR(255),
    "phone_number" VARCHAR(20),
    "address" TEXT,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
    "is_accepting_orders" BOOLEAN NOT NULL DEFAULT true,
    "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "service_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_business_hours" (
    "id" UUID NOT NULL,
    "store_setting_id" VARCHAR(20) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "opening_time" VARCHAR(5),
    "closing_time" VARCHAR(5),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "store_business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_business_hours_store_setting_id_idx" ON "store_business_hours"("store_setting_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_business_hours_store_setting_id_day_of_week_key" ON "store_business_hours"("store_setting_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "store_business_hours" ADD CONSTRAINT "store_business_hours_store_setting_id_fkey" FOREIGN KEY ("store_setting_id") REFERENCES "store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

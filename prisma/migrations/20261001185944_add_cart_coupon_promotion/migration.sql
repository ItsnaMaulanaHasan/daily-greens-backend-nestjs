-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "coupon_promotion_id" UUID;

-- CreateIndex
CREATE INDEX "carts_coupon_promotion_id_idx" ON "carts"("coupon_promotion_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_promotion_id_fkey" FOREIGN KEY ("coupon_promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

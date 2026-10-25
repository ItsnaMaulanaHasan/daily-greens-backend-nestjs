/*
  Warnings:

  - You are about to drop the column `provience` on the `user_addresses` table. All the data in the column will be lost.
  - Added the required column `province` to the `user_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_addresses"
RENAME COLUMN "provience" TO "province";

ALTER TABLE "user_addresses"
ALTER COLUMN "deleted_at" DROP NOT NULL;

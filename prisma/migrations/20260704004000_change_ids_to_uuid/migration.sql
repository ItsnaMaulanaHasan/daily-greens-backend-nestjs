-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_created_by_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_created_by_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_updated_by_fkey";

-- AlterTable
ALTER TABLE "permissions"
ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
ALTER COLUMN "created_by" TYPE UUID USING "created_by"::uuid,
ALTER COLUMN "updated_by" TYPE UUID USING "updated_by"::uuid,
ALTER COLUMN "deleted_by" TYPE UUID USING "deleted_by"::uuid;

-- AlterTable
ALTER TABLE "profiles"
ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;

-- AlterTable
ALTER TABLE "role_permissions"
ALTER COLUMN "role_id" TYPE UUID USING "role_id"::uuid,
ALTER COLUMN "permission_id" TYPE UUID USING "permission_id"::uuid;

-- AlterTable
ALTER TABLE "roles"
ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
ALTER COLUMN "created_by" TYPE UUID USING "created_by"::uuid,
ALTER COLUMN "updated_by" TYPE UUID USING "updated_by"::uuid,
ALTER COLUMN "deleted_by" TYPE UUID USING "deleted_by"::uuid;

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
ALTER COLUMN "role_id" TYPE UUID USING "role_id"::uuid,
ALTER COLUMN "created_by" TYPE UUID USING "created_by"::uuid,
ALTER COLUMN "updated_by" TYPE UUID USING "updated_by"::uuid,
ALTER COLUMN "deleted_by" TYPE UUID USING "deleted_by"::uuid;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

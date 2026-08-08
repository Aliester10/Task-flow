-- AlterEnum
ALTER TYPE "MemberRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

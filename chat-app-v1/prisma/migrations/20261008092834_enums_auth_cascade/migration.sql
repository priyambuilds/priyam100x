-- CreateEnum
CREATE TYPE "RoomKind" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_userId_fkey";

-- AlterTable (hand-edited to keep existing rows: cast text -> enum instead of drop/add)
ALTER TABLE "Room" ALTER COLUMN "kind" TYPE "RoomKind" USING ("kind"::"RoomKind");

ALTER TABLE "RoomMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "RoomMember" ALTER COLUMN "role" TYPE "MemberRole" USING ("role"::"MemberRole");
ALTER TABLE "RoomMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- Pre-existing users get an unusable hash ('!' never verifies); they must be re-registered.
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '!';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

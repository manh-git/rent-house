/*
  Warnings:

  - A unique constraint covering the columns `[room_id]` on the table `Contracts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[room_id]` on the table `Posts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[room_id]` on the table `RoomFeatures` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Contracts_room_id_key" ON "Contracts"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "Posts_room_id_key" ON "Posts"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoomFeatures_room_id_key" ON "RoomFeatures"("room_id");

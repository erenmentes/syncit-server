/*
  Warnings:

  - The primary key for the `FileChunk` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "FileChunk" DROP CONSTRAINT "FileChunk_pkey",
ADD CONSTRAINT "FileChunk_pkey" PRIMARY KEY ("fileId", "chunkHash", "chunkIndex");

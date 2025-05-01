-- CreateEnum
CREATE TYPE "Status" AS ENUM ('uploaded', 'processing', 'rendered', 'failed');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'uploaded',
    "trimmedPath" TEXT,
    "renderedPath" TEXT,
    "subtitledPath" TEXT,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

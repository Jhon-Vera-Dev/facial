/*
  Warnings:

  - Made the column `fotoPerfilUrl` on table `Persona` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "emocion" TEXT,
ADD COLUMN     "fecharegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fotoPerfilUrl" SET NOT NULL;

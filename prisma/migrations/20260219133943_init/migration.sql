-- CreateTable
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "fotoPerfilUrl" TEXT,
    "embedding" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "Persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_correo_key" ON "Persona"("correo");

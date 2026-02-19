// app/api/estado/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emocion = searchParams.get("emocion");

    if (!emocion) {
      return NextResponse.json(
        { success: false, error: "Falta el parámetro 'emocion'" },
        { status: 400 }
      );
    }

    const cantidad = await prisma.persona.count({
      where: {
        emocion: {
          startsWith: emocion,
          mode: "insensitive",
        },
      },
    });

    return NextResponse.json({ success: true, emocion, cantidad });
  } catch (error) {
    console.error("Error al contar personas por estado emocional:", error);
    return NextResponse.json(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}

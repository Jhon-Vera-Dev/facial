// app/api/auth/verify-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, dni } = await request.json();
    
    // Validar datos
    if (!email || !dni) {
      return NextResponse.json(
        { error: 'Correo electrónico y DNI son requeridos' },
        { status: 400 }
      );
    }
    
    // Buscar usuario por correo y DNI
    const user = await prisma.persona.findFirst({
      where: {
        correo: email,
        dni: dni,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        // No incluir embedding por seguridad
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
    
    // Devolver datos básicos del usuario
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.correo,
      },
    });
    
  } catch (error) {
    console.error('Error al verificar credenciales:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
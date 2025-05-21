// app/api/personas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar datos requeridos
    if (!data.nombre || !data.apellido || !data.dni || !data.correo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar que el embedding es un array válido
    if (!Array.isArray(data.embedding) || data.embedding.length !== 128) {
      return NextResponse.json(
        { error: 'El embedding facial debe ser un array de 128 dimensiones' },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe un usuario con el mismo DNI o correo
    const existingUser = await prisma.persona.findFirst({
      where: {
        OR: [
          { dni: data.dni },
          { correo: data.correo }
        ]
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con el mismo DNI o correo electrónico' },
        { status: 409 }
      );
    }
    
    // Crear nuevo registro
    const newPersona = await prisma.persona.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        correo: data.correo,
        telefono: data.telefono || null,
        fotoPerfilUrl: data.fotoPerfilUrl,
        embedding: data.embedding,
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Persona registrada correctamente',
      persona: {
        id: newPersona.id,
        nombre: newPersona.nombre,
        apellido: newPersona.apellido,
        dni: newPersona.dni,
        correo: newPersona.correo,
        creadoEn: newPersona.creadoEn
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error al registrar persona:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las personas registradas (sin embeddings para reducir tamaño)
    const personas = await prisma.persona.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        correo: true,
        telefono: true,
        fotoPerfilUrl: true,
        creadoEn: true
      }
    });
    
    return NextResponse.json({ 
      personas 
    });
    
  } catch (error) {
    console.error('Error al obtener personas:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
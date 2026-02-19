// app/api/auth/facial-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '@/lib/token';

const prisma = new PrismaClient();

function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Los embeddings deben tener la misma dimensión');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function POST(request: NextRequest) {
  try {
    const { embedding } = await request.json();
    
    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return NextResponse.json(
        { error: 'Embedding facial inválido' },
        { status: 400 }
      );
    }
    
    // ✅ Traer todas y filtrar en código para evitar error de tipo Json
    const todasPersonas = await prisma.persona.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        embedding: true,
      },
    });

    const personas = todasPersonas.filter((p) => p.embedding !== null);
    
    if (personas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay usuarios registrados con biometría facial' },
        { status: 404 }
      );
    }
    
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const persona of personas) {
      if (!persona.embedding) continue;
      
      // ✅ Cast correcto para evitar error de JsonArray vs number[]
      const rawEmbedding = persona.embedding as unknown;
      const storedEmbedding: number[] = Array.isArray(rawEmbedding)
        ? (rawEmbedding as number[])
        : Object.values(rawEmbedding as Record<string, number>);
      
      const similarity = cosineSimilarity(embedding, storedEmbedding);
      
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = persona;
      }
    }
    
    const SIMILARITY_THRESHOLD = 0.7;
    
    if (highestSimilarity > SIMILARITY_THRESHOLD && bestMatch) {
      const { embedding: _embedding, ...userWithoutEmbedding } = bestMatch;
      
      const token = generateToken({
        id: bestMatch.id,
        nombre: bestMatch.nombre,
        correo: bestMatch.correo
      });

      return NextResponse.json({
        success: true,
        token,
        user: userWithoutEmbedding,
        similarity: highestSimilarity,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No se reconoció ningún usuario',
      bestSimilarity: highestSimilarity,
    });
    
  } catch (error) {
    console.error('Error en autenticación facial:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de autenticación facial' },
      { status: 500 }
    );
  }
}
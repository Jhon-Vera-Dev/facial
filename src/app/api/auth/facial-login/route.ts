// app/api/auth/facial-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Función para calcular la similitud entre dos embeddings faciales usando distancia coseno
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
  
  // Evitar división por cero
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function POST(request: NextRequest) {
  try {
    const { embedding } = await request.json();
    
    // Validar que el embedding es válido
    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return NextResponse.json(
        { error: 'Embedding facial inválido' },
        { status: 400 }
      );
    }
    
    // Obtener todos los usuarios con embeddings faciales
    const personas = await prisma.persona.findMany({
      where: {
        // Solo seleccionar usuarios que tengan embedding
        embedding: {
          not: null,
        },
      },
      // Incluir todos los campos necesarios para la autenticación
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        embedding: true,
      },
    });
    
    if (personas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay usuarios registrados con biometría facial' },
        { status: 404 }
      );
    }
    
    // Buscar la mejor coincidencia
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const persona of personas) {
      // TypeScript: verificar que embedding no es null
      if (!persona.embedding) continue;
      
      // Convertir JSON a array de números si es necesario
      const storedEmbedding = Array.isArray(persona.embedding) 
        ? persona.embedding 
        : Object.values(persona.embedding as Record<string, number>);
      
      // Calcular similitud
      const similarity = cosineSimilarity(embedding, storedEmbedding);
      
      // Actualizar mejor coincidencia si la similitud es mayor
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = persona;
      }
    }
    
    // Umbral de similitud - ajustar según pruebas (0.6-0.8 suele ser buen valor)
    const SIMILARITY_THRESHOLD = 0.7;
    
    if (highestSimilarity > SIMILARITY_THRESHOLD && bestMatch) {
      // Eliminar el embedding del resultado por seguridad
      const { embedding: _, ...userWithoutEmbedding } = bestMatch;
      
      return NextResponse.json({
        success: true,
        user: userWithoutEmbedding,
        similarity: highestSimilarity,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No se reconoció ningún usuario',
        bestSimilarity: highestSimilarity,
      });
    }
    
  } catch (error) {
    console.error('Error en autenticación facial:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de autenticación facial' },
      { status: 500 }
    );
  }
}
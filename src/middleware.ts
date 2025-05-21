// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  // Puedes agregar lógica de registro (logging) aquí si lo deseas
  console.log(`Middleware ejecutado en: ${request.nextUrl.pathname}`)
  return NextResponse.next()
}

// Opcional: Configuración de matcher
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
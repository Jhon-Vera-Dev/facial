// src/auth.ts
import { auth } from "next-auth"
import { NextAuthConfig } from "next-auth"

export const config = {
  providers: [], // Agrega tus proveedores aquí
  // ...otras configuraciones
} satisfies NextAuthConfig

export const { auth: middleware, signIn, signOut } = auth(config)
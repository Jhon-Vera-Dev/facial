// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions } from "next-auth";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        id: { label: "ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id) {
          return null;
        }

        try {
          // Buscar usuario por ID
          const user = await prisma.persona.findUnique({
            where: {
              id: parseInt(credentials.id),
            },
            select: {
              id: true,
              nombre: true,
              apellido: true,
              correo: true,
              fotoPerfilUrl: true,
              // No incluimos el embedding por seguridad
            },
          });

          if (user) {
            return {
              id: String(user.id),
              name: `${user.nombre} ${user.apellido}`,
              email: user.correo,
              image: user.fotoPerfilUrl || undefined,
            };
          }
          return null;
        } catch (error) {
          console.error("Error en authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
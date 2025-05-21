// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FacialLoginComponent } from "@/components/FacialLoginComponent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginWithCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !dni) {
      setError("Por favor, completa todos los campos");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Primero buscar el usuario por correo y dni
      const res = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, dni }),
      });
      
      const data = await res.json();
      
      if (data.success && data.user) {
        // Si se encuentra el usuario, iniciar sesión con NextAuth
        const result = await signIn("credentials", {
          id: data.user.id,
          redirect: true,
          callbackUrl: "/dashboard",
        });
        
        if (result?.error) {
          setError(result.error);
        }
      } else {
        setError("Credenciales inválidas");
      }
    } catch (err) {
      setError("Error al iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Acceder al Sistema</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="facial" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="facial">Login Facial</TabsTrigger>
          <TabsTrigger value="credentials">Login con Credenciales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="facial">
          <FacialLoginComponent />
        </TabsContent>
        
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Login con Credenciales</CardTitle>
              <CardDescription>
                Ingresa tu correo electrónico y DNI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginWithCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    type="text"
                    placeholder="Ej. 12345678"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                  />
                </div>
                
                {error && (
                  <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
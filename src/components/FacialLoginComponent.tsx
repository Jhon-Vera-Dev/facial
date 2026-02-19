// app/components/FacialLoginComponent.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const FacialLoginComponent = () => {
  // Referencias y estados
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState<any>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  // Acceder a la sesión actual
  const { data: session } = useSession();

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [message, ...prev].slice(0, 10));
  };

  // Cargar face-api.js manualmente
  useEffect(() => {
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[src*="face-api.min.js"]')) {
          setIsScriptLoaded(true);
          addLog("✅ Script ya estaba cargado");
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          setIsScriptLoaded(true);
          addLog("✅ Script de face-api.js cargado");
          resolve();
        };

        script.onerror = (error) => {
          setError("Error al cargar face-api.js");
          reject(error);
        };

        document.head.appendChild(script);
      });
    };

    loadScript()
      .then(() => {
        const checkFaceApi = setInterval(() => {
          if ((window as any).faceapi) {
            clearInterval(checkFaceApi);
            setFaceapi((window as any).faceapi);
            addLog("✅ face-api.js disponible");
          }
        }, 100);

        return () => clearInterval(checkFaceApi);
      })
      .catch(err => {
        addLog(`❌ Error cargando script: ${err}`);
      });
  }, []);

  // Cargar modelos cuando face-api esté disponible
  useEffect(() => {
    if (!faceapi) return;

    const loadModels = async () => {
      try {
        addLog("⏳ Cargando modelos...");

        // Cargar los modelos necesarios
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        setIsModelLoaded(true);
        addLog("🎉 Modelos cargados");

        // Iniciar cámara automáticamente
        startCamera();
      } catch (err) {
        const error = err as Error;
        setError(`Error al cargar modelos: ${error.message}`);
        addLog(`❌ Error: ${error.message}`);
      }
    };

    loadModels();
  }, [faceapi]);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      stopDetection();
      stopCamera();
    };
  }, []);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      addLog("📷 Iniciando cámara...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
        };

        videoRef.current.onplay = () => {
          setCameraActive(true);
          addLog("▶️ Cámara activa");
        };

        try {
          await videoRef.current.play();
        } catch (e) {
          const error = e as Error;
          addLog(`❌ Error de reproducción: ${error.message}`);
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(`Error accediendo a la cámara: ${error.message}`);
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      stopDetection();

      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;

      setCameraActive(false);
      addLog("🛑 Cámara detenida");
    }
  };

  // Detectar rostros
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !faceapi) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.paused || video.ended) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dibujar el video en canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detectar rostro y obtener descriptor facial
      const fullFaceDescription = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (fullFaceDescription) {
        // Dibujar el recuadro del rostro
        const resizedDetection = faceapi.resizeResults(fullFaceDescription, displaySize);
        const box = resizedDetection.detection.box;

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'green';
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Mostrar porcentaje de confianza
        ctx.fillStyle = 'green';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(
          `${(resizedDetection.detection.score * 100).toFixed(0)}%`,
          box.x,
          box.y - 5
        );

     const faceDescriptor = Array.from(fullFaceDescription.descriptor) as number[];
        setFaceEmbedding(faceDescriptor);

        if (!authenticating && !recognizedUser) {
          authenticateWithFace(faceDescriptor);
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error en la detección:", err);
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // Iniciar detección
  const startDetection = () => {
    if (!isModelLoaded || !cameraActive || !faceapi) {
      setError("Los modelos deben estar cargados y la cámara activa para iniciar la detección");
      return;
    }

    setIsDetecting(true);
    addLog("🔍 Iniciando detección facial");

    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }

    // Ejecutar detección inicial
    detectFaces();

    // Configurar intervalo para detección continua
    detectionInterval.current = setInterval(detectFaces, 500);
  };

  // Detener detección
  const stopDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    setIsDetecting(false);
    addLog("🛑 Detección detenida");

    // Limpiar canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Función para intentar autenticar con el rostro
  const authenticateWithFace = async (embedding: number[]) => {
    if (authenticating || recognizedUser) return;

    setAuthenticating(true);
    addLog("🔒 Autenticando rostro...");
console.log("Embedding enviado:", embedding);

    try {
      const response = await fetch('/api/auth/facial-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embedding }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en autenticación facial');
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Guardar usuario reconocido
        setRecognizedUser(data.user);
        addLog(`✅ Usuario reconocido: ${data.user.nombre} ${data.user.apellido}`);

        localStorage.setItem("token", data.token); // o cookie si lo prefieres
        window.location.href = "/dashboard"; // o router.push

        // Detener la detección una vez autenticado
        stopDetection();
      } else {
        addLog("❓ Rostro no reconocido");
        // Esperar 3 segundos antes de permitir otro intento
        setTimeout(() => {
          setAuthenticating(false);
        }, 3000);
      }
    } catch (err) {
      const error = err as Error;
      setError(`Error de autenticación: ${error.message}`);
      addLog(`❌ Error: ${error.message}`);
      setTimeout(() => {
        setAuthenticating(false);
      }, 3000);
    }
  };

  // Iniciar autenticación facial al hacer clic en botón
  const handleLoginClick = () => {
    if (!isDetecting) {
      startDetection();
    } else if (faceEmbedding && !authenticating && !recognizedUser) {
      authenticateWithFace(faceEmbedding);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    await signOut();
    setRecognizedUser(null);
  };

  return (
    <div className="mt-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login Facial</CardTitle>
          <CardDescription>
            Accede a tu cuenta mediante reconocimiento facial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="text-green-800 font-semibold mb-2">✅ Sesión Iniciada</h3>
                <p className="text-green-700">Has iniciado sesión como <strong>{session.user?.name}</strong></p>
              </div>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-black mb-4" style={{ height: '280px' }}>
                <video
                  ref={videoRef}
                  width="640"
                  height="280"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {isDetecting && (
                  <div className="absolute top-3 right-3 py-1 px-3 rounded text-xs text-white bg-green-600">
                    🔍 Detectando...
                  </div>
                )}
                {recognizedUser && (
                  <div className="absolute bottom-3 left-3 py-1 px-3 rounded text-xs text-white bg-green-600">
                    ✅ Usuario: {recognizedUser.nombre}
                  </div>
                )}
                {authenticating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-4 rounded-md flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm">Autenticando...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between mb-2">
                  <Badge variant={isScriptLoaded ? "default" : "outline"}>
                    {isScriptLoaded ? '✅ Scripts Cargados' : '⏳ Cargando Scripts...'}
                  </Badge>
                  <Badge variant={isModelLoaded ? "default" : "outline"}>
                    {isModelLoaded ? '✅ Modelos Cargados' : '⏳ Cargando Modelos...'}
                  </Badge>
                  <Badge variant={cameraActive ? "default" : "destructive"}>
                    {cameraActive ? '✅ Cámara Activa' : '❌ Cámara Inactiva'}
                  </Badge>
                </div>

                <div className="flex flex-col space-y-2">
                  {recognizedUser ? (
                    <Button onClick={() => signIn('credentials', { id: recognizedUser.id })} className="w-full">
                      Continuar como {recognizedUser.nombre}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleLoginClick}
                      disabled={!isModelLoaded || !cameraActive || authenticating}
                      className="w-full"
                    >
                      {isDetecting ? 'Reconocer mi Rostro' : 'Iniciar Reconocimiento'}
                    </Button>
                  )}

                  <Button variant="outline" onClick={() => signIn()} className="w-full">
                    Iniciar Sesión con Credenciales
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-gray-800 text-gray-100 p-2 rounded-md h-24 overflow-y-auto text-xs">
                  <ul className="space-y-1 font-mono">
                    {logs.map((log, index) => (
                      <li key={index}>{log}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
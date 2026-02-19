// app/facial-detection/FacialDetectionComponent.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Definir el tipo de Persona
interface Persona {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  telefono?: string;
  fotoPerfilUrl?: string;
  embedding?: number[];
  creadoEn?: Date;
}

export const FacialDetectionComponent = () => {
  // Referencias y estados existentes
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para detección y registro
  const [currentFace, setCurrentFace] = useState<any>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDetectionCount, setFaceDetectionCount] = useState(0);
  const [capturingEmbedding, setCapturingEmbedding] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado para el formulario
  const [formData, setFormData] = useState<Persona>({
    nombre: '',
    apellido: '',
    dni: '',
    correo: '',
    telefono: '',
  });
  
  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    correo: '',
  });
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [message, ...prev].slice(0, 15));
  };
  
  // Función para manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error al editar
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Validar formulario
  const validateForm = (): boolean => {
    const errors = {
      nombre: '',
      apellido: '',
      dni: '',
      correo: '',
    };
    
    let isValid = true;
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
      isValid = false;
    }
    
    if (!formData.apellido.trim()) {
      errors.apellido = 'El apellido es requerido';
      isValid = false;
    }
    
    if (!formData.dni.trim()) {
      errors.dni = 'El DNI es requerido';
      isValid = false;
    } else if (!/^\d{8}$/.test(formData.dni)) {
      errors.dni = 'El DNI debe tener 8 dígitos';
      isValid = false;
    }
    
    if (!formData.correo.trim()) {
      errors.correo = 'El correo es requerido';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
      errors.correo = 'El correo no es válido';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Cargar face-api.js manualmente
  useEffect(() => {
    // Función para cargar el script face-api.js
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Verificar si el script ya está cargado
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
          addLog("✅ Script de face-api.js cargado manualmente");
          resolve();
        };
        
        script.onerror = (error) => {
          setError("Error al cargar face-api.js");
          reject(error);
        };
        
        document.head.appendChild(script);
      });
    };
    
    // Cargar el script
    loadScript()
      .then(() => {
        // Esperar a que face-api esté disponible en window
        const checkFaceApi = setInterval(() => {
          if ((window as any).faceapi) {
            clearInterval(checkFaceApi);
            setFaceapi((window as any).faceapi);
            addLog("✅ face-api.js disponible en window");
          }
        }, 100);
        
        // Limpiar intervalo si el componente se desmonta
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
        
        // Cargar los modelos necesarios desde la carpeta pública
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        addLog("✅ SsdMobilenetv1 cargado");
        
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        addLog("✅ FaceLandmark68Net cargado");
        
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        addLog("✅ FaceExpressionNet cargado");

        // Cargar modelo facialLandmark68TinyNet para reconocimiento facial
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        addLog("✅ FaceLandmark68TinyNet cargado");
        
        // Cargar modelo de reconocimiento facial para extraer embeddings
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        addLog("✅ FaceRecognitionNet cargado");
        
        setIsModelLoaded(true);
        addLog("🎉 Todos los modelos cargados correctamente");
        
        // Iniciar cámara automáticamente al cargar los modelos
        startCamera();
      } catch (err) {
        const error = err as Error;
        setError(`Error al cargar modelos: ${error.message}`);
        addLog(`❌ Error: ${error.message}`);
        console.error("Error detallado:", err);
      }
    };
    
    loadModels();
  }, [faceapi]);
  
  // Limpiar recursos al desmontar el componente
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
        
        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          addLog("📊 Video metadata cargada");
          
          // Inicializar el canvas con el tamaño correcto
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
        };
        
        videoRef.current.onplay = () => {
          addLog("▶️ Video iniciado");
          setCameraActive(true);
          
          // No iniciar detección automáticamente - esperar al botón
          // startDetection();
        };
        
        // Reproducir
        try {
          await videoRef.current.play();
        } catch (e) {
          const error = e as Error;
          addLog(`❌ Error al reproducir: ${error.message}`);
        }
      }
    } catch (err) {
      const error = err as Error;
      addLog(`❌ Error de cámara: ${error.message}`);
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
  
  // Efecto para capturar automáticamente cuando se detecta un rostro claro
  useEffect(() => {
    // Si no estamos detectando, no hacer nada
    if (!isDetecting) return;
    
    // Si ya hemos capturado una imagen o estamos en proceso de captura, no hacer nada
    if (capturedImage || capturingEmbedding || !faceDetected || !currentFace) {
      return;
    }

    // Si detectamos un rostro claro por varios frames consecutivos
    if (faceDetected && currentFace.detection.score > 0.8) {
      setFaceDetectionCount(prev => prev + 1);
      
      // Si hemos detectado un rostro claro por al menos 10 frames (1 segundo aprox.), capturar
      if (faceDetectionCount >= 10 && !capturedImage && !capturingEmbedding) {
        captureFacialEmbedding();
      }
    } else {
      // Reiniciar contador si el rostro no es claro
      setFaceDetectionCount(0);
    }
  }, [faceDetected, currentFace, capturedImage, capturingEmbedding, faceDetectionCount, isDetecting]);
  
  // Detectar rostros (versión con setInterval)
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !faceapi) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Verificar que el video está reproduciéndose
      if (video.paused || video.ended) {
        addLog("⚠️ El video no está reproduciéndose");
        return;
      }
      
      // Verificar el tamaño del canvas
      if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        addLog(`⚠️ Ajustando canvas a ${canvas.width}x${canvas.height}`);
      }
      
      // Obtener el contexto 2D del canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        addLog("❌ No se pudo obtener el contexto del canvas");
        return;
      }
      
      // Configurar dimensiones y limpiar canvas
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar primero el video en el canvas para asegurar que hay contenido
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Detectar rostros con SsdMobilenetv1 y emociones
      const detectionOptions = new faceapi.SsdMobilenetv1Options({ 
        minConfidence: 0.2  // Umbral bajo para mayor sensibilidad
      });
      
      const detections = await faceapi.detectAllFaces(
        video,
        detectionOptions
      )
      .withFaceLandmarks()
      .withFaceExpressions();
      
      // Ajustar al tamaño del canvas
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Solo necesitamos un rostro bien claro
      if (resizedDetections.length === 1) {
        const detection = resizedDetections[0];
        if (detection.detection.score > 0.7) { // Rostro claramente detectado
          setFaceDetected(true);
          setCurrentFace(detection);
        } else {
          setFaceDetected(false);
          setCurrentFace(null);
        }
      } else {
        setFaceDetected(false);
        setCurrentFace(null);
      }
      
      // Mostrar información de detección
      if (resizedDetections.length > 0) {
        const detection = resizedDetections[0]; // Usar la primera detección
        
        // Extraer emoción dominante
        if (detection.expressions) {
          const expressions = detection.expressions;
          let dominantEmotion = "";
          let maxValue = 0;
          
          Object.entries(expressions).forEach(([emotion, value]) => {
  if ((value as number) > maxValue) {
    maxValue = value as number;
    dominantEmotion = emotion;
  }
});
          
          // Mapear nombres de emociones al español
          const emotionMap: Record<string, string> = {
            'neutral': 'Neutral',
            'happy': 'Feliz',
            'sad': 'Triste',
            'angry': 'Enojado',
            'fearful': 'Asustado',
            'disgusted': 'Disgustado',
            'surprised': 'Sorprendido'
          };
          
          setEmotion(`${emotionMap[dominantEmotion] || dominantEmotion} (${(maxValue * 100).toFixed(0)}%)`);
        }
        
        // Dibujar recuadro azul
        const box = detection.detection.box;
        ctx.lineWidth = 3;
        ctx.strokeStyle = faceDetected ? 'green' : 'blue';
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Mostrar porcentaje de confianza
        ctx.fillStyle = faceDetected ? 'green' : 'blue';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(
          `${(detection.detection.score * 100).toFixed(0)}%`,
          box.x, 
          box.y - 5
        );
        
        // Si hay landmarks, dibujarlos
        if (detection.landmarks) {
          const points = detection.landmarks.positions;
          
          // Dibujar contorno facial con cian
          ctx.strokeStyle = '#00FFFF'; // Cian
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 16; i++) {
            const point = points[i];
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
          
          // Cejas con magenta
          ctx.strokeStyle = '#FF00FF'; // Magenta
          ctx.beginPath();
          // Ceja izquierda
          for (let i = 17; i <= 21; i++) {
            const point = points[i];
            if (i === 17) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          // Ceja derecha
          ctx.moveTo(points[22].x, points[22].y);
          for (let i = 22; i <= 26; i++) {
            const point = points[i];
            ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
          
          // Nariz con verde
          ctx.strokeStyle = '#00FF00'; // Verde
          ctx.beginPath();
          // Línea central
          for (let i = 27; i <= 30; i++) {
            const point = points[i];
            if (i === 27) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          // Base de la nariz
          ctx.moveTo(points[30].x, points[30].y);
          ctx.lineTo(points[31].x, points[31].y);
          ctx.lineTo(points[32].x, points[32].y);
          ctx.lineTo(points[33].x, points[33].y);
          ctx.lineTo(points[34].x, points[34].y);
          ctx.lineTo(points[35].x, points[35].y);
          ctx.stroke();
          
          // Ojos con azul claro
          ctx.strokeStyle = '#00BFFF'; // Azul claro
          ctx.beginPath();
          // Ojo izquierdo
          for (let i = 36; i <= 41; i++) {
            const point = points[i];
            if (i === 36) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          ctx.lineTo(points[36].x, points[36].y);
          
          // Ojo derecho
          ctx.moveTo(points[42].x, points[42].y);
          for (let i = 42; i <= 47; i++) {
            const point = points[i];
            ctx.lineTo(point.x, point.y);
          }
          ctx.lineTo(points[42].x, points[42].y);
          ctx.stroke();
          
          // Boca con rojo
          ctx.strokeStyle = '#FF3030'; // Rojo
          ctx.beginPath();
          // Labio exterior
          for (let i = 48; i <= 59; i++) {
            const point = points[i];
            if (i === 48) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          ctx.lineTo(points[48].x, points[48].y);
          
          // Labio interior
          ctx.moveTo(points[60].x, points[60].y);
          for (let i = 60; i <= 67; i++) {
            const point = points[i];
            ctx.lineTo(point.x, point.y);
          }
          ctx.lineTo(points[60].x, points[60].y);
          ctx.stroke();
        }
      } else {
        // Si no se detecta nada, mantener el video en el canvas y dibujar guía
        setEmotion(null);
        setFaceDetected(false);
        setCurrentFace(null);
        
        // Guía amarilla
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.strokeRect(centerX - 150, centerY - 200, 300, 400);
        
        // Texto de ayuda
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Coloca tu rostro aquí', centerX, centerY - 210);
      }
    } catch (err) {
      const error = err as Error;
      addLog(`❌ Error en la detección: ${error.message}`);
      console.error("Error detallado en detección:", err);
    }
  };
  
  // Iniciar detección
  const startDetection = () => {
    if (!isModelLoaded || !cameraActive || !faceapi) {
      addLog("⚠️ No se puede iniciar: modelos no cargados o cámara inactiva");
      return;
    }
    
    setIsDetecting(true);
    addLog("🔍 Iniciando detección facial con emociones...");
    
    // Limpiar intervalo previo si existe
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    
    // Ejecutar detección inicial
    detectFaces();
    
    // Configurar intervalo para detección continua (cada 100ms)
    detectionInterval.current = setInterval(detectFaces, 100);
  };
  
  // Detener detección
  const stopDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    
    setIsDetecting(false);
    setEmotion(null);
    setFaceDetected(false);
    setCurrentFace(null);
    addLog("🛑 Detección detenida");
    
    // Limpiar canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };
  
  // Capturar facial embedding
  const captureFacialEmbedding = async () => {
    if (!faceapi || !videoRef.current || !canvasRef.current) {
      addLog("❌ No hay un rostro claro para capturar");
      return;
    }
    
    setCapturingEmbedding(true);
    addLog("⏳ Generando embedding facial...");
    
    try {
      // Obtener referencia al canvas para la captura
      const canvas = canvasRef.current;
      
      // Obtener la imagen para guardar (canvas actual)
      const imageDataUrl = canvas.toDataURL('image/png');
      setCapturedImage(imageDataUrl);
      
      // Generar embedding facial
      const fullFaceDescription = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (fullFaceDescription) {
        // El descriptor es el embedding facial (vector de 128 dimensiones)
        const faceDescriptor = Array.from(fullFaceDescription.descriptor) as number[];
        setFaceEmbedding(faceDescriptor);
        
        // Actualizar el estado del formulario con la URL de la imagen y el embedding
        setFormData(prev => ({
          ...prev,
          fotoPerfilUrl: imageDataUrl,
          embedding: faceDescriptor
        }));
        
        addLog("✅ Embedding facial generado con éxito");
      } else {
        addLog("❌ No se pudo generar el embedding facial");
        setError("Error al generar el embedding facial");
        // Limpiar la imagen capturada para permitir otro intento
        setCapturedImage(null);
      }
    } catch (err) {
      const error = err as Error;
      addLog(`❌ Error al generar embedding: ${error.message}`);
      setError(`Error al generar embedding: ${error.message}`);
      // Limpiar la imagen capturada para permitir otro intento
      setCapturedImage(null);
    } finally {
      setCapturingEmbedding(false);
    }
  };
  
  // Enviar formulario de registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addLog("❌ Formulario con errores");
      return;
    }
    
    if (!capturedImage || !faceEmbedding) {
      addLog("❌ Se requiere capturar imagen facial y embedding");
      setError("Por favor, espera a que se capture tu rostro correctamente");
      return;
    }
    
    // Enviar datos al servidor
    addLog("⏳ Enviando datos al servidor...");
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fotoPerfilUrl: capturedImage,
          embedding: faceEmbedding,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mostrar éxito
      setRegistrationSuccess(true);
      addLog("✅ Persona registrada correctamente");
      
      // Reiniciar estado después de unos segundos
      setTimeout(() => {
        resetRegistration();
      }, 3000);
    } catch (err) {
      const error = err as Error;
      addLog(`❌ Error al registrar: ${error.message}`);
      setError(`Error al registrar persona: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reiniciar proceso de registro
  const resetRegistration = () => {
    setCapturedImage(null);
    setFaceEmbedding(null);
    setFaceDetectionCount(0);
    setFormData({
      nombre: '',
      apellido: '',
      dni: '',
      correo: '',
      telefono: '',
    });
    setFormErrors({
      nombre: '',
      apellido: '',
      dni: '',
      correo: '',
    });
    setRegistrationSuccess(false);
  };

  // Captura manual (respaldo)
  const manualCapture = () => {
    if (!faceDetected) {
      setError("Por favor, coloca tu rostro claramente visible en la pantalla");
      return;
    }
    captureFacialEmbedding();
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda - Video y Estado */}
        <div>
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle>Detección Facial y Captura</CardTitle>
              <CardDescription>
                Posiciona tu rostro para el registro biométrico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-black mb-4" style={{height: '380px'}}>
                <video
                  ref={videoRef}
                  width="640"
                  height="380"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                
                {/* Indicador de estado */}
                <div className={`absolute top-3 right-3 py-1 px-3 rounded text-sm text-white ${isDetecting ? 'bg-green-600' : 'bg-gray-800'}`}>
                  {isDetecting ? '🔍 Detectando...' : '⏸️ Inactivo'}
                </div>
                
                {/* Indicador de emoción */}
                {emotion && (
                  <div className="absolute bottom-3 left-3 bg-blue-600 py-1 px-3 rounded text-white text-sm">
                    Emoción: {emotion}
                  </div>
                )}
                
                {/* Indicador de detección facial para registro */}
                <div className={`absolute top-3 left-3 py-1 px-3 rounded text-sm text-white ${faceDetected ? 'bg-green-600' : 'bg-orange-500'}`}>
                  {faceDetected ? '✅ Rostro Detectado' : '⚠️ Posicionar Rostro'}
                </div>
                
                {/* Indicador de auto-captura */}
                {faceDetected && faceDetectionCount > 0 && !capturedImage && (
                  <div className="absolute bottom-3 right-3 bg-yellow-500 py-1 px-3 rounded text-white text-sm">
                    Capturando en {Math.max(0, 10 - faceDetectionCount)}...
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  onClick={startCamera}
                  disabled={cameraActive}
                  variant={cameraActive ? "outline" : "default"}
                  className="flex items-center gap-1"
                >
                  {cameraActive ? '✅ Cámara Activa' : '📷 Iniciar Cámara'}
                </Button>
                
                <Button
                  onClick={isDetecting ? stopDetection : startDetection}
                  disabled={!cameraActive || !isModelLoaded}
                  variant={isDetecting ? "destructive" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {isDetecting ? '🛑 Detener Detección' : '🔍 Iniciar Detección'}
                </Button>
                
                <Button
                  onClick={manualCapture}
                  disabled={!faceDetected || capturingEmbedding || !!capturedImage || !isDetecting}
                  className="flex items-center gap-1"
                >
                  {capturingEmbedding ? '⏳ Procesando...' : '📸 Capturar Manualmente'}
                </Button>
                
                {capturedImage && (
                  <Button
                    onClick={() => {
                      setCapturedImage(null);
                      setFaceEmbedding(null);
                      setFaceDetectionCount(0);
                    }}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    🔄 Volver a Capturar
                  </Button>
                )}
              </div>
              
              {capturedImage && (
                <div className="relative rounded-lg overflow-hidden border-2 border-green-500 bg-black mb-4" style={{height: '120px'}}>
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <img 
                      src={capturedImage} 
                      alt="Rostro Capturado" 
                      className="max-h-full"
                    />
                    <div className="absolute top-2 right-2 py-1 px-2 rounded text-xs text-white bg-green-600">
                      ✅ Rostro Capturado
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Estado del Sistema</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant={isScriptLoaded ? "default" : "outline"} className="mb-1">
                    {isScriptLoaded ? '✅ Scripts Cargados' : '⏳ Cargando Scripts...'}
                  </Badge>
                  <Badge variant={isModelLoaded ? "default" : "outline"} className="mb-1">
                    {isModelLoaded ? '✅ Modelos Cargados' : '⏳ Cargando Modelos...'}
                  </Badge>
                  <Badge variant={cameraActive ? "default" : "destructive"} className="mb-1">
                    {cameraActive ? '✅ Cámara Activa' : '❌ Cámara Inactiva'}
                  </Badge>
                  <Badge variant={isDetecting ? "default" : "destructive"} className="mb-1">
                    {isDetecting ? '✅ Detección Activa' : '❌ Detección Inactiva'}
                  </Badge>
                  <Badge variant={faceDetected ? "default" : "destructive"} className="mb-1">
                    {faceDetected ? '✅ Rostro Detectado' : '❌ Sin Rostro'}
                  </Badge>
                  {faceEmbedding && (
                    <Badge variant="secondary" className="mb-1">
                      ✅ Embedding Generado ({faceEmbedding.length} dim)
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Logs del Sistema</h4>
                <div className="bg-gray-800 text-gray-100 p-2 rounded-md h-24 overflow-y-auto text-xs">
                  <ul className="space-y-1 font-mono">
                    {logs.slice(0, 5).map((log, index) => (
                      <li key={index}>{log}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mensajes de error */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Columna derecha - Formulario de Registro */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Registro de Persona</CardTitle>
              <CardDescription>
                Completa los datos personales para el registro biométrico
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registrationSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 text-center">
                  <h3 className="text-green-800 text-lg font-semibold mb-2">✅ Registro Exitoso</h3>
                  <p className="text-green-700">La persona ha sido registrada correctamente en el sistema.</p>
                  <Button 
                    onClick={resetRegistration} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Registrar Otra Persona
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Ingresa tu nombre"
                        required
                      />
                      {formErrors.nombre && (
                        <p className="text-sm text-red-500">{formErrors.nombre}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleInputChange}
                        placeholder="Ingresa tu apellido"
                        required
                      />
                      {formErrors.apellido && (
                        <p className="text-sm text-red-500">{formErrors.apellido}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleInputChange}
                      placeholder="Ingresa tu DNI (8 dígitos)"
                      required
                    />
                    {formErrors.dni && (
                      <p className="text-sm text-red-500">{formErrors.dni}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo Electrónico</Label>
                    <Input
                      id="correo"
                      name="correo"
                      type="email"
                      value={formData.correo}
                      onChange={handleInputChange}
                      placeholder="tu@correo.com"
                      required
                    />
                    {formErrors.correo && (
                      <p className="text-sm text-red-500">{formErrors.correo}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono (opcional)</Label>
                    <Input
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="Número de teléfono"
                    />
                  </div>
                  
                  <div className="pt-6">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={!capturedImage || !faceEmbedding || submitting}
                            >
                              {submitting ? '⏳ Procesando...' : '✅ Completar Registro'}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {!capturedImage || !faceEmbedding ? 
                            <p>Primero debes capturar el rostro</p> :
                            <p>Guardar los datos de la persona</p>
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>Instrucciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Coloca tu rostro claramente visible en el centro de la pantalla</li>
                <li>Espera a que aparezca "✅ Rostro Detectado" y el recuadro verde</li>
                <li>El sistema capturará automáticamente tu rostro cuando esté bien posicionado</li>
                <li>Si es necesario, puedes usar el botón "Capturar Manualmente"</li>
                <li>Completa el formulario con tus datos personales</li>
                <li>Haz clic en "Completar Registro" para guardar tus datos en el sistema</li>
              </ol>
              <p className="mt-3 text-gray-700 text-sm">
                <strong>Nota:</strong> Es necesario que tu rostro sea claramente visible y esté bien iluminado para obtener un reconocimiento facial preciso.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
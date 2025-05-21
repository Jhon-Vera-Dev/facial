"use client"

import { useForm } from "react-hook-form"
import Webcam from "react-webcam"
import { useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"

type FormData = {
  nombre: string
  apellido: string
  dni: string
  correo: string
}

export default function RegisterPersona() {
  const { register, handleSubmit, reset } = useForm<FormData>()
  const webcamRef = useRef<Webcam>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const [loading, setLoading] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
const canvasRef = useRef<HTMLCanvasElement>(null)

  // Cargar modelos de FaceAPI
  const loadModels = async () => {
 
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssd_mobilenetv1"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models/face_landmark_68"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models/face_recognition_model"),
    faceapi.nets.ageGenderNet.loadFromUri("/models/age_gender_model"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models/face_expression"),
  ])
  setModelsLoaded(true) // ← importante
  }

  // Capturar imagen y generar descriptor facial
  const captureAndProcess = async () => {
    if (!webcamRef.current) return
    const screenshot = webcamRef.current.getScreenshot()
    if (!screenshot) return

    setCapturedImage(screenshot)

    const img = await faceapi.fetchImage(screenshot)
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection?.descriptor) {
      alert("No se detectó rostro, intenta de nuevo.")
      return
    }

    return {
      image: screenshot,
      embedding: Array.from(detection.descriptor), // convertimos Float32Array a array normal
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    await loadModels()

    const faceData = await captureAndProcess()
    if (!faceData) {
      setLoading(false)
      return
    }

    // Enviar a backend
    const response = await fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...faceData }),
    })

    if (response.ok) {
      alert("Registro exitoso!")
      reset()
      setCapturedImage(null)
    } else {
      alert("Error al registrar.")
    }

    setLoading(false)
  }
 
const drawResults = async () => {
  if (!webcamRef.current || !canvasRef.current) return

  const video = webcamRef.current.video
  if (!video) return

  // Ajustar canvas al tamaño del video
  canvasRef.current.width = video.videoWidth
  canvasRef.current.height = video.videoHeight

  const detections = await faceapi
    .detectAllFaces(video)
    .withFaceLandmarks()
    .withFaceExpressions()

  const ctx = canvasRef.current.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

  if (detections.length === 0) {
    // No hay detecciones, no dibujar nada
    return
  }

  // Dibujar cajas y landmarks
  const resizedDetections = faceapi.resizeResults(detections, {
    width: video.videoWidth,
    height: video.videoHeight,
  })

  faceapi.draw.drawDetections(canvasRef.current, resizedDetections)
  faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections)
  faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections)
}

useEffect(() => {
  loadModels() // cargar modelos al montar el componente
}, [])

useEffect(() => {
  if (!modelsLoaded) return

  const interval = setInterval(() => {
    drawResults()
  }, 500)

  return () => clearInterval(interval)
}, [modelsLoaded]) // ← solo activa cuando los modelos ya están cargados


  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Registro de Persona</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input {...register("nombre")} placeholder="Nombre" className="input" required />
        <input {...register("apellido")} placeholder="Apellido" className="input" required />
        <input {...register("dni")} placeholder="DNI" className="input" required />
        <input {...register("correo")} placeholder="Correo" className="input" required />

        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={300}
          videoConstraints={{ facingMode: "user" }}
        />
<canvas ref={canvasRef} className="absolute top-0 left-0" />

        {capturedImage && <img src={capturedImage} alt="captured" className="w-40 mt-2" />}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Procesando..." : "Registrar"}
        </button>
      </form>
    </div>
  )
}

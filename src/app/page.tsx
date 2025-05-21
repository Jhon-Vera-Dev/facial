// app/facial-detection/page.tsx
"use client";

import { FacialDetectionComponent } from "@/components/FacialComponent";

 
export default function FacialDetection() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Reconocimiento Facial con Emociones</h1>
      <FacialDetectionComponent />
    </div>
  );
}
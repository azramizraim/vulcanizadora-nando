import React, { useRef, useEffect, useState } from 'react'
import { Camera, X, Check, RotateCcw } from 'lucide-react'

export function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [captured, setCaptured] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Asegúrate de haber dado permisos.')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      setCaptured(blob)
    }, 'image/jpeg', 0.9)

    stopCamera()
  }

  const retake = () => {
    setCaptured(null)
    startCamera()
  }

  const accept = () => {
    if (captured) onCapture(captured)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {error ? (
        <div className="flex-1 flex items-center justify-center text-white p-8 text-center">
          <div>
            <Camera className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <p className="text-sm text-slate-400">{error}</p>
            <button onClick={onClose} className="mt-4 px-6 py-3 bg-white/10 rounded-xl text-white text-sm">
              Cerrar
            </button>
          </div>
        </div>
      ) : captured ? (
        <>
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={URL.createObjectURL(captured)}
              alt="Captura"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
          <div className="flex justify-center gap-12 p-6">
            <button onClick={retake} className="flex flex-col items-center text-white/70 gap-1">
              <RotateCcw className="w-7 h-7" />
              <span className="text-xs">Repetir</span>
            </button>
            <button onClick={accept} className="flex flex-col items-center text-green-400 gap-1">
              <Check className="w-7 h-7" />
              <span className="text-xs">Usar</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center p-6">
            <button
              onClick={capture}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

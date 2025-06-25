"use client"
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import Image from 'next/image';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  title?: string;
}

const CameraCapture = ({ onCapture, onClose, title = "Take Photo" }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        // Wait for video to load before marking camera as active
        videoRef.current.onloadedmetadata = () => {
          setIsCameraActive(true);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && !isCapturing) {
      setIsCapturing(true);

      // Small delay to prevent visual glitches
      setTimeout(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas) {
          const context = canvas.getContext('2d');

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          if (context) {
            // Draw current frame to canvas
            context.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);

            setCapturedImage(imageData);

            // Stop camera immediately after capture
            stopCamera();
          }
        }
        setIsCapturing(false);
      }, 100);
    }
  }, [isCapturing, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    // Restart camera for retake
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  }, [capturedImage, onCapture, onClose]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative mb-4">
            {!capturedImage ? (
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Camera overlay for better UX */}
                <div className="absolute inset-0 border-2 border-white/20 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 right-4 text-white text-sm text-center">
                    {!isCameraActive ? 'Starting camera...' : 'Position yourself in the frame'}
                  </div>
                </div>

                {/* Capture flash effect */}
                {isCapturing && (
                  <div className="absolute inset-0 bg-white opacity-50 rounded-lg"></div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  width={1280}
                  height={720}
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-2 justify-center">
            {!capturedImage ? (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!isCameraActive || isCapturing}
                  className="flex-1"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isCapturing ? 'Capturing...' : 'Capture'}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="lg"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={confirmPhoto}
                  className="flex-1"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Confirm
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;
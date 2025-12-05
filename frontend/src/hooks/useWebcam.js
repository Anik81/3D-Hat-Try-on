'use client';

import { useEffect, useRef, useState } from 'react';

export const useWebcam = () => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request camera access with specific constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user' // Front-facing camera
        },
        audio: false
      });

      setStream(mediaStream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          }
        });

        // Start playing
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotFoundError':
            setError('No camera found on your device');
            break;
          case 'NotAllowedError':
            setError('Camera access denied. Please allow camera permissions and refresh.');
            break;
          case 'NotReadableError':
            setError('Camera is already in use by another application');
            break;
          case 'OverconstrainedError':
            setError('Camera does not support the required constraints');
            break;
          default:
            setError('Failed to access camera: ' + err.message);
        }
      } else {
        setError('An unexpected error occurred while accessing the camera');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      // Stop all tracks
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    stream,
    isLoading,
    error,
    isStreaming,
    startCamera,
    stopCamera
  };
};
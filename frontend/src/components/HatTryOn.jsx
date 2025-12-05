'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useWebSocket } from '../hooks/useWebSocket';
import { captureFrameAsBlob, FrameRateLimiter, FramePerformanceMonitor } from '../lib/frameCapture';
import WebcamCapture from './WebcamCapture';
import HatScene from './HatScene';

// Main orchestrator component for Hat Try-On
export default function HatTryOn() {
  const {
    videoRef,
    isLoading: isCameraLoading,
    error: cameraError,
    isStreaming,
    startCamera,
    stopCamera
  } = useWebcam();

  const {
    isConnected,
    isConnecting,
    error: wsError,
    lastMessage,
    sendFrame,
    connect: connectWS,
    disconnect: disconnectWS
  } = useWebSocket();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hatPose, setHatPose] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fps, setFps] = useState(0);

  const frameRateLimiterRef = useRef(new FrameRateLimiter(20)); // 20 FPS processing
  const performanceMonitorRef = useRef(new FramePerformanceMonitor());
  const processingIntervalRef = useRef(null);

  // Process video frames for face detection
  const processVideoFrame = async () => {
    if (!videoRef.current || !isStreaming || !isConnected || isProcessing) {
      return;
    }

    // Check if we should process this frame (rate limiting)
    if (!frameRateLimiterRef.current.shouldProcessFrame()) {
      return;
    }

    setIsProcessing(true);
    performanceMonitorRef.current.recordFrame();

    try {
      // Capture frame from video
      const frameBlob = await captureFrameAsBlob(videoRef.current, {
        maxWidth: 320,
        maxHeight: 240,
        quality: 0.7,
        format: 'jpeg'
      });

      if (frameBlob) {
        sendFrame(frameBlob);
      }
    } catch (error) {
      console.error('Error processing video frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start/stop processing loop
  useEffect(() => {
    if (isStreaming && isConnected) {
      processingIntervalRef.current = setInterval(processVideoFrame, 50); // 20 FPS
      return () => {
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
        }
      };
    }
  }, [isStreaming, isConnected]);

  // Handle WebSocket messages from backend
  useEffect(() => {
    if (lastMessage) {
      setFaceDetected(lastMessage.face_detected);
      
      if (lastMessage.face_detected && lastMessage.hat) {
        setHatPose(lastMessage.hat);
      } else {
        setHatPose(null);
      }
    }
  }, [lastMessage]);

  // Update FPS display
  useEffect(() => {
    const fpsInterval = setInterval(() => {
      setFps(performanceMonitorRef.current.getAverageFPS());
    }, 1000);

    return () => clearInterval(fpsInterval);
  }, []);

  // Auto-connect WebSocket when component mounts
  useEffect(() => {
    connectWS();
    return () => disconnectWS();
  }, [connectWS, disconnectWS]);

  // Connection status indicator
  const getConnectionStatus = () => {
    if (isConnecting) return { color: '#ff9800', text: '🔄 Connecting...' };
    if (isConnected) return { color: '#4caf50', text: '🟢 Connected' };
    return { color: '#f44336', text: '🔴 Disconnected' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={isCameraLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: isStreaming ? '#f44336' : '#4caf50',
            color: 'white',
            cursor: isCameraLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isCameraLoading ? 'Starting...' : isStreaming ? '📹 Stop Camera' : '📷 Start Camera'}
        </button>

        <button
          onClick={isConnected ? disconnectWS : connectWS}
          disabled={isConnecting}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: isConnected ? '#ff9800' : '#2196f3',
            color: 'white',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isConnecting ? 'Connecting...' : isConnected ? '🔌 Disconnect' : '🔗 Connect'}
        </button>

        {/* Status indicators */}
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          marginLeft: 'auto',
          fontSize: '14px'
        }}>
          <span style={{ color: connectionStatus.color }}>
            {connectionStatus.text}
          </span>
          <span style={{ color: faceDetected ? '#4caf50' : '#666' }}>
            {faceDetected ? '👤 Face detected' : '👤 No face'}
          </span>
          <span style={{ color: '#666' }}>
            {fps.toFixed(1)} FPS
          </span>
        </div>
      </div>

      {/* Error messages */}
      {cameraError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '10px',
          border: '1px solid #ef5350'
        }}>
          <strong>Camera Error:</strong> {cameraError}
        </div>
      )}

      {wsError && (
        <div style={{
          backgroundColor: '#fff3e0',
          color: '#ef6c00',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '10px',
          border: '1px solid #ff9800'
        }}>
          <strong>Connection Error:</strong> {wsError}
        </div>
      )}

      {/* Main AR display area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        backgroundColor: '#f5f5f5',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #ddd'
      }}>
        {/* Webcam component */}
        <WebcamCapture 
          videoRef={videoRef}
          isStreaming={isStreaming}
        />

        {/* Three.js Hat Scene overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          <HatScene
            hatPose={hatPose}
            faceDetected={faceDetected}
            videoElement={videoRef.current}
          />
        </div>

        {/* Overlay for when camera is not active */}
        {!isStreaming && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            zIndex: 3,
            color: '#666'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              📷
            </div>
            <h3>Camera Not Active</h3>
            <p>Click "Start Camera" to begin the virtual hat try-on experience</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#1565c0'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Instructions:</h4>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Click "Start Camera" to access your webcam</li>
          <li>Ensure the backend server is running (Python backend on localhost:8000)</li>
          <li>Position your face in the frame and look at the camera</li>
          <li>The virtual hat will appear once your face is detected</li>
          <li>Move your head to see how the hat follows your movements</li>
        </ol>
      </div>
    </div>
  );
}
'use client';

import React from 'react';

// Dedicated webcam component for video feed
// Video element is hidden since we use Three.js VideoPlane for display
export default function WebcamCapture({ videoRef, isStreaming }) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: -1, // Behind everything
        display: 'none', // Hidden - only used for video stream reference
        visibility: 'hidden' // Double-ensure it's not visible
      }}
    />
  );
}
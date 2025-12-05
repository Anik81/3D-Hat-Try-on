'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';

// Hat model component - prioritizes GLB model with proper fallback
function HatModel({ hatPose, visible, onModelLoad }) {
  const meshRef = useRef(null);
  const [model, setModel] = useState(null);
  const [useGLB, setUseGLB] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Always try to load GLB model first
  const gltf = useGLB ? useGLTF('/models/hat.glb') : null;

  // Create model (GLB preferred, fallback if needed) - only run once
  useEffect(() => {
    // Prevent multiple loads of the same model
    if (modelLoaded) return;
    if (gltf && gltf.scene) {
      console.log('✓ GLB hat model loaded successfully');
      // Use GLB model
      const hatModel = gltf.scene.clone();
      
      // Debug GLB model structure (only log once)
      if (!modelLoaded) {
        const box = new THREE.Box3().setFromObject(hatModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log('📐 GLB Model Info:', {
          size: { x: size.x.toFixed(3), y: size.y.toFixed(3), z: size.z.toFixed(3) },
          center: { x: center.x.toFixed(3), y: center.y.toFixed(3), z: center.z.toFixed(3) },
          children: hatModel.children.length
        });
      }
      
      // Ensure GLB model has proper orientation and scale
      hatModel.scale.set(1, 1, 1); // Keep original scale for now
      hatModel.rotation.set(0, 0, 0); // Reset rotation
      hatModel.position.set(0, 0, 0); // Reset position
      
      setModel(hatModel);
      setModelLoaded(true);
      onModelLoad?.(true); // Notify that GLB model loaded
    } else if (useGLB && !gltf) {
      // GLB failed to load, switch to fallback
      if (!modelLoaded) {
        console.log('⚠ GLB model failed to load, using fallback geometry');
      }
      setUseGLB(false);
    } else if (!useGLB && !modelLoaded) {
      // Create fallback procedural hat geometry
      console.log('📦 Using fallback procedural hat geometry');
      const geometry = new THREE.CylinderGeometry(0.4, 0.5, 0.15, 16);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
      });
      const hatMesh = new THREE.Mesh(geometry, material);
      
      // Add a brim (smaller for fallback)
      const brimGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.025, 32);
      const brimMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.8,
        metalness: 0.1
      });
      const brimMesh = new THREE.Mesh(brimGeometry, brimMaterial);
      brimMesh.position.y = -0.0625;
      
      const hatGroup = new THREE.Group();
      hatGroup.add(hatMesh);
      hatGroup.add(brimMesh);
      
      setModel(hatGroup);
      setModelLoaded(true);
      onModelLoad?.(false); // Notify that fallback model loaded
    }
  }, [gltf, useGLB, onModelLoad, modelLoaded]);

  // Update hat position and rotation based on face detection
  useFrame(() => {
    if (meshRef.current && hatPose && visible && model) {
      // Clear previous children
      meshRef.current.clear();
      
      // Add model to group
      meshRef.current.add(model);
      
      // Convert normalized coordinates to Three.js coordinates
      // Assuming the video plane is from -2 to 2 in X and Y
      const x = (hatPose.position.x - 0.5) * 4; // Convert 0-1 to -2 to 2
      const y = (hatPose.position.y - 0.5) * 3; // Convert 0-1 to -1.5 to 1.5, no flip since video is corrected
      const z = hatPose.position.z;
      
      // Different positioning for GLB vs fallback
      const isGLBModel = gltf && gltf.scene;
      
      // Fine-tuned positioning based on model type (aligned with MindAR scale values)
      let yOffset, scale;
      
      // Check if hat model has specific requirements (could be detected from model metadata)
      const modelType = hatPose.modelType || 'default'; // Future: detect from model name/size
      
      if (isGLBModel) {
        // GLB models - scale similar to MindAR's methodology with presets
        switch(modelType) {
          case 'large_hat':
            yOffset = -1.0;
            scale = hatPose.scale * 0.8; // MindAR-like scaling for large hats
            break;
          case 'small_hat':
            yOffset = -0.2;
            scale = hatPose.scale * 0.02; // Very small scale like MindAR hat2
            break;
          default:
            yOffset = -0.2; // Lifted higher - better positioning above head
            scale = hatPose.scale * 0.5; // Slightly smaller for better fit
        }
        // Reduced logging - only log occasionally for debugging
        if (Math.random() < 0.1) { // Log ~10% of the time
          console.log(`🎩 GLB Hat (${modelType}) - Scale: ${scale}, Position: (${x.toFixed(2)}, ${(y + yOffset).toFixed(2)}, ${z.toFixed(2)})`);
        }
      } else {
        // Fallback procedural geometry
        yOffset = -0.3; // Lifted higher for fallback too
        scale = hatPose.scale * 0.25; // Slightly smaller for better proportions
        if (Math.random() < 0.1) { // Log ~10% of the time
          console.log(`📦 Fallback Hat - Scale: ${scale}, Position: (${x.toFixed(2)}, ${(y + yOffset).toFixed(2)}, ${z.toFixed(2)})`);
        }
      }
      
      // Ensure hat is in front of video plane (z > -1)
      const zPosition = Math.max(z, 0); // Keep hat in front of video plane at z = -1
      meshRef.current.position.set(x, y + yOffset, zPosition);
      
      // Apply rotation with some damping for stability
      meshRef.current.rotation.set(
        hatPose.rotation.x * 0.8, // Reduce rotation intensity
        hatPose.rotation.y * 0.8,
        hatPose.rotation.z * 0.8
      );
      
      meshRef.current.scale.set(scale, scale, scale);
      
      // Debug: Ensure hat is visible
      meshRef.current.visible = true;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Debug wireframe to see hat bounds */}
      {visible && hatPose && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="red" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

// Video background plane component
function VideoPlane({ videoElement }) {
  const meshRef = useRef(null);
  const { viewport } = useThree();
  const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    if (videoElement) {
      // Wait for video to have data
      const checkVideo = () => {
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
          const texture = new THREE.VideoTexture(videoElement);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.flipY = true; // Change to true to fix orientation
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          setVideoTexture(texture);
          console.log('✓ Video texture created with correct orientation');
        } else {
          // Retry after a short delay
          setTimeout(checkVideo, 100);
        }
      };

      checkVideo();

      return () => {
        if (videoTexture) {
          videoTexture.dispose();
        }
      };
    }
  }, [videoElement]);

  useFrame(() => {
    if (videoTexture && meshRef.current && videoElement) {
      // Update texture every frame
      videoTexture.needsUpdate = true;
    }
  });

  // Don't render if no video texture
  if (!videoTexture) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <meshBasicMaterial 
        map={videoTexture} 
        transparent={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Lighting setup
function Lighting() {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight
        position={[0, 0, 5]}
        intensity={1.2}
        castShadow={false}
      />
      <pointLight position={[0, 5, 5]} intensity={0.8} />
      <pointLight position={[0, -5, 5]} intensity={0.6} />
    </>
  );
}

// Camera setup
function CameraSetup() {
  const { camera, size } = useThree();

  useEffect(() => {
    // Set up orthographic-like perspective for AR effect
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    
    // Adjust camera for aspect ratio
    const aspect = size.width / size.height;
    camera.fov = 50;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}

// Hat Model with status tracking
function HatModelWithStatus({ hatPose, visible, onStatusChange }) {
  const [modelStatus, setModelStatus] = useState('loading');
  
  useEffect(() => {
    onStatusChange(modelStatus);
  }, [modelStatus, onStatusChange]);
  
  return (
    <HatModel 
      hatPose={hatPose} 
      visible={visible}
      onModelLoad={(isGLB) => {
        setModelStatus(isGLB ? 'glb-loaded' : 'fallback-loaded');
      }}
    />
  );
}

// Main Three.js scene component for hat rendering
export default function HatScene({ hatPose, faceDetected, videoElement }) {
  const [modelStatus, setModelStatus] = useState('loading');
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <CameraSetup />
        <Lighting />
        
        <Suspense fallback={<LoadingFallback />}>
          {videoElement && <VideoPlane videoElement={videoElement} />}
          <HatModelWithStatus 
            hatPose={hatPose} 
            visible={faceDetected}
            onStatusChange={setModelStatus}
          />
        </Suspense>
      </Canvas>
      
      {/* Debug info overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div>Face: {faceDetected ? '✓ Detected' : '✗ Not detected'}</div>
        <div>Model: {
          modelStatus === 'loading' ? '⏳ Loading...' :
          modelStatus === 'glb-loaded' ? '🎩 GLB Hat' :
          modelStatus === 'fallback-loaded' ? '📦 Fallback' : '❓ Unknown'
        }</div>
        {hatPose && (
          <>
            <div>Pos: ({hatPose.position.x.toFixed(2)}, {hatPose.position.y.toFixed(2)}, {hatPose.position.z.toFixed(2)})</div>
            <div>Rot: ({hatPose.rotation.x.toFixed(2)}, {hatPose.rotation.y.toFixed(2)}, {hatPose.rotation.z.toFixed(2)})</div>
            <div>Scale: {hatPose.scale.toFixed(2)}</div>
          </>
        )}
      </div>
    </div>
  );
}
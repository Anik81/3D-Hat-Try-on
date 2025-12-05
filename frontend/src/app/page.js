'use client';

import { Suspense } from 'react';
import HatTryOn from '../components/HatTryOn';

export default function Home() {
  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Virtual Hat Try-On
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          opacity: 0.9,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          Real-time AR hat overlay using your webcam
        </p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        maxWidth: '900px',
        width: '100%'
      }}>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            fontSize: '1.2rem',
            color: '#666'
          }}>
            Loading Virtual Try-On...
          </div>
        }>
          <HatTryOn />
        </Suspense>
      </div>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: 'white',
        opacity: 0.8,
        fontSize: '0.9rem'
      }}>
        <p>Allow camera access and position your face in the frame</p>
      </div>
    </main>
  );
}
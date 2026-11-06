// src/components/NoteZLoader.jsx
import React from 'react';

export default function NoteZLoader({ isFadingOut }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: isFadingOut ? 0 : 1,
        visibility: isFadingOut ? 'hidden' : 'visible',
        transition: 'opacity 0.4s ease-in-out, visibility 0.4s ease-in-out',
      }}
    >
      {/* Cube Logo Container */}
      <div
        style={{
          width: '72px',
          height: '72px',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          marginBottom: '20px',
          animation: 'pulse 2s infinite ease-in-out',
        }}
      >
        <span
          style={{
            fontSize: '32px',
            fontWeight: '800',
            letterSpacing: '-1px',
            color: '#FFFFFF',
          }}
        >
          Nz
        </span>
      </div>

      {/* Brand Name */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          margin: '0 0 8px 0',
        }}
      >
        NoteZ
      </h1>
      <p
        style={{
          fontSize: '14px',
          opacity: 0.85,
          margin: '0 0 28px 0',
          fontWeight: '400',
        }}
      >
        Your Digital Student Workspace
      </p>

      {/* Modern Spinner */}
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      {/* Inline Keyframe Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
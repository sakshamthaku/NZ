import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = [
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/rtf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
];

export default function UploadBox({ onFileSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleValidateAndSelect = (file) => {
    setError('');
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("File too large. Maximum size is 25MB.");
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="ai-upload-wrapper">
      <div 
        className={`upload-box ${dragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => e.target.files?.[0] && handleValidateAndSelect(e.target.files[0])} 
          accept={ACCEPTED_TYPES.join(',')}
        />
        <div className="upload-icon-container">
          <Upload size={36} className="upload-icon" />
        </div>
        <h3>📄 Upload File</h3>
        <p className="upload-instructions">Drag & drop or browse from your device</p>
        <span className="upload-formats-hint">PDF • DOCX • PPTX • XLSX • Images & More</span>
      </div>
      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        .ai-upload-wrapper {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }
        .upload-box {
          border: 2px dashed #2a2a2a;
          background: #121212;
          padding: 40px 24px;
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .upload-box:hover:not(.disabled) {
          border-color: #d4af37;
          background: #181818;
        }
        .upload-box.drag-over {
          border-color: #4ade80;
          background: #1a231b;
        }
        .upload-box.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .upload-icon-container {
          width: 64px;
          height: 64px;
          background: #1f1f1f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #d4af37;
        }
        .upload-box h3 {
          font-size: 1.25rem;
          color: #ffffff;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .upload-instructions {
          color: #a3a3a3;
          font-size: 0.95rem;
          margin-bottom: 12px;
        }
        .upload-formats-hint {
          font-size: 0.8rem;
          color: #737373;
          letter-spacing: 0.5px;
        }
        .upload-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 8px;
          margin-top: 12px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
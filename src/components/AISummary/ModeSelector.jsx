import React from 'react';
import { FileText, BrainCircuit } from 'lucide-react';

export default function ModeSelector({ onSelectMode, fileName }) {
  return (
    <div className="mode-selector-container">
      <div className="file-ready-banner">
        <span className="file-badge">File uploaded ✓</span>
        <h4 className="file-name-display">{fileName}</h4>
        <p className="ready-subtitle">Ready to analyze. What would you like to create?</p>
      </div>

      <div className="mode-cards-grid">
        <button className="mode-card summary-card-btn" onClick={() => onSelectMode('summary')}>
          <div className="mode-icon-box">
            <FileText size={28} />
          </div>
          <div className="mode-text">
            <h3>Summary</h3>
            <p>Structured breakdown with overview, key concepts, and takeaways.</p>
          </div>
        </button>

        <button className="mode-card mindmap-card-btn" onClick={() => onSelectMode('mindmap')}>
          <div className="mode-icon-box">
            <BrainCircuit size={28} />
          </div>
          <div className="mode-text">
            <h3>Mind Map</h3>
            <p>Visual hierarchical structure with central topic and branches.</p>
          </div>
        </button>
      </div>

      <style>{`
        .mode-selector-container {
          max-width: 650px;
          margin: 0 auto;
          text-align: center;
        }
        .file-ready-banner {
          background: #161616;
          border: 1px solid #262626;
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 24px;
        }
        .file-badge {
          display: inline-block;
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .file-name-display {
          font-size: 1.1rem;
          color: #ffffff;
          font-weight: 600;
          word-break: break-all;
          margin-bottom: 6px;
        }
        .ready-subtitle {
          color: #a3a3a3;
          font-size: 0.9rem;
        }
        .mode-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .mode-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .mode-card {
          background: #121212;
          border: 2px solid #222222;
          border-radius: 14px;
          padding: 24px;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mode-card:hover {
          border-color: #d4af37;
          background: #181818;
          transform: translateY(-2px);
        }
        .mode-icon-box {
          width: 48px;
          height: 48px;
          background: #1f1f1f;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d4af37;
        }
        .mode-text h3 {
          font-size: 1.15rem;
          color: #ffffff;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .mode-text p {
          font-size: 0.85rem;
          color: #9ca3af;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
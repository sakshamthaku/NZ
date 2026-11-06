import React from 'react';
import ExportMenu from './ExportMenu';

export default function SummaryResult({ data, fileName, onReset }) {
  const result = data || {};

  return (
    <div className="summary-result-wrapper">
      <div className="result-actions-top">
        <button className="back-btn" onClick={onReset}>← Upload Another File</button>
        <ExportMenu targetId="ai-summary-export-content" fileName={fileName} type="summary" />
      </div>

      <div id="ai-summary-export-content" className="summary-document-card">
        <div className="doc-header">
          <h2>AI Summary</h2>
          <div className="doc-meta">
            <span><strong>Document:</strong> {fileName}</span>
          </div>
        </div>

        <div className="doc-section">
          <h3>Overview</h3>
          <p>{result.overview || "No overview provided."}</p>
        </div>

        {result.mainPoints && result.mainPoints.length > 0 && (
          <div className="doc-section">
            <h3>Main Points</h3>
            <ul className="styled-list">
              {result.mainPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        )}

        {result.importantConcepts && result.importantConcepts.length > 0 && (
          <div className="doc-section">
            <h3>Important Concepts</h3>
            <div className="concepts-grid">
              {result.importantConcepts.map((c, i) => (
                <div key={i} className="concept-chip">{c}</div>
              ))}
            </div>
          </div>
        )}

        {result.importantTerms && Object.keys(result.importantTerms).length > 0 && (
          <div className="doc-section">
            <h3>Important Terms & Meanings</h3>
            <div className="terms-table">
              {Object.entries(result.importantTerms).map(([term, meaning], i) => (
                <div key={i} className="term-row">
                  <span className="term-name">{term}</span>
                  <span className="term-meaning">{meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.keyTakeaways && result.keyTakeaways.length > 0 && (
          <div className="doc-section">
            <h3>Key Takeaways</h3>
            <ul className="takeaways-list">
              {result.keyTakeaways.map((t, i) => (
                <li key={i}><span className="check-icon">✓</span> {t}</li>
              ))}
            </ul>
          </div>
        )}

        {result.conclusion && (
          <div className="doc-section">
            <h3>Conclusion</h3>
            <p>{result.conclusion}</p>
          </div>
        )}

        <div className="notez-branding-footer">
          <span>NOTEZ</span>
        </div>
      </div>

      <style>{`
        .summary-result-wrapper {
          max-width: 800px;
          margin: 0 auto;
        }
        .result-actions-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .back-btn {
          background: transparent;
          border: 1px solid #333;
          color: #a3a3a3;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .back-btn:hover {
          border-color: #d4af37;
          color: #fff;
        }
        .summary-document-card {
          background: #141414;
          border: 1px solid #222;
          border-radius: 16px;
          padding: 40px;
          color: #e5e7eb;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .doc-header {
          border-bottom: 1px solid #262626;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .doc-header h2 {
          font-size: 1.8rem;
          color: #ffffff;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .doc-meta {
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .doc-section {
          margin-bottom: 28px;
        }
        .doc-section h3 {
          font-size: 1.15rem;
          color: #d4af37;
          margin-bottom: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
          border-bottom: 1px dashed #262626;
          padding-bottom: 6px;
        }
        .doc-section p {
          line-height: 1.6;
          color: #d1d5db;
          font-size: 0.95rem;
        }
        .styled-list {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .styled-list li {
          line-height: 1.5;
          color: #d1d5db;
        }
        .concepts-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .concept-chip {
          background: #1f1f1f;
          border: 1px solid #2d2d2d;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #e5e7eb;
        }
        .terms-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .term-row {
          background: #181818;
          padding: 10px 14px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-left: 3px solid #d4af37;
        }
        .term-name {
          font-weight: 600;
          color: #ffffff;
          font-size: 0.95rem;
        }
        .term-meaning {
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .takeaways-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .takeaways-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #d1d5db;
          font-size: 0.95rem;
        }
        .check-icon {
          color: #4ade80;
          font-weight: bold;
        }
        .notez-branding-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #262626;
          text-align: center;
          font-weight: 800;
          letter-spacing: 3px;
          color: #d4af37;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
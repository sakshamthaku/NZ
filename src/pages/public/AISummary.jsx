import React, { useState, useEffect } from "react";

import { aiSummaryService } from "../../services/aiSummaryService";

import UploadBox from "../../components/AISummary/UploadBox";
import ModeSelector from "../../components/AISummary/ModeSelector";
import SummaryResult from "../../components/AISummary/SummaryResult";
import MindMap from "../../components/AISummary/MindMap";

import { Sparkles, Clock, FileText, ChevronRight } from "lucide-react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function AISummary() {
  const [step, setStep] = useState('upload'); // upload, mode, processing, result, history
  const [file, setFile] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [progressText, setProgressText] = useState('Uploading...');
  const [resultData, setResultData] = useState(null);
  const [historyDocs, setHistoryDocs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const docs = await aiSummaryService.getUserDocuments();
      setHistoryDocs(docs);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleFileSelected = (uploadedFile) => {
    // Feature is under development, prevent active uploading action
    return;
  };

  const handleModeChosen = async (mode) => {
    return;
  };

  const handleOpenHistoryItem = (docItem) => {
    setFile({ name: docItem.fileName });
    setSelectedMode(docItem.mode);
    setResultData(docItem.result);
    setStep('result');
  };

  return (
    <div className="ai-summary-container">
      <div className="ai-summary-header">
        <div className="badge-sparkle">
          <Sparkles size={16} /> NoteZ Intelligence
        </div>
        <h1>✨ AI Summary</h1>
        <p>Understand your files faster with educational summaries and interactive mind maps.</p>
      </div>

      {/* Development Warning Banner */}
      <div className="dev-warning-banner">
        <FaExclamationTriangle className="dev-warning-icon" />
        <div className="dev-warning-text">
          <strong>AI Summary is currently under development.</strong>
          <span>This feature is not fully available yet. We are working on it and it will be available soon.</span>
        </div>
      </div>

      {error && (
        <div className="global-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="ai-summary-content-body">
        {step === 'upload' && (
          <>
            <div className="disabled-upload-wrapper">
              <UploadBox onFileSelected={handleFileSelected} />
            </div>

            {historyDocs.length > 0 && (
              <div className="recent-documents-section">
                <h3><Clock size={18} /> Recent AI Documents</h3>
                <div className="history-list">
                  {historyDocs.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="history-item" onClick={() => handleOpenHistoryItem(doc)}>
                      <div className="history-item-info">
                        <FileText size={16} className="text-gold" />
                        <div>
                          <span className="h-filename">{doc.fileName}</span>
                          <span className="h-date">{doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : 'Just now'} • <span className="capitalize">{doc.mode}</span></span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="h-arrow" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'mode' && file && (
          <ModeSelector fileName={file.name} onSelectMode={handleModeChosen} />
        )}

        {step === 'processing' && (
          <div className="processing-state-container">
            <div className="spinner-gold"></div>
            <h3>Processing your file</h3>
            <p>{progressText}</p>
            <span className="sub-hint">Please do not close this window. Large documents may take up to 30 seconds.</span>
          </div>
        )}

        {step === 'result' && resultData && (
          <>
            {selectedMode === 'summary' ? (
              <SummaryResult data={resultData} fileName={file?.name || "Document"} onReset={() => setStep('upload')} />
            ) : (
              <MindMap data={resultData} fileName={file?.name || "Document"} onReset={() => setStep('upload')} />
            )}
          </>
        )}
      </div>

      <style>{`
        .ai-summary-container {
          padding: 40px 20px;
          max-width: 1000px;
          margin: 0 auto;
          color: #f3f4f6;
          min-height: 100vh;
        }
        .ai-summary-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .badge-sparkle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(212, 175, 55, 0.1);
          color: #d4af37;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 12px;
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        .ai-summary-header h1 {
          font-size: 2.2rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
        }
        .ai-summary-header p {
          color: #9ca3af;
          font-size: 1rem;
        }
        
        /* Development Warning Banner Styles */
        .dev-warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 16px 20px;
          border-radius: 12px;
          margin: 0 auto 30px auto;
          max-width: 700px;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.05);
        }
        .dev-warning-icon {
          color: #ef4444;
          font-size: 1.25rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .dev-warning-text {
          display: flex;
          flex-ion: column;
          gap: 4px;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .dev-warning-text strong {
          color: #fef2f2;
          font-weight: 600;
        }

        .disabled-upload-wrapper {
          opacity: 0.75;
          pointer-events: none;
        }

        .global-error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .global-error-banner button {
          background: none;
          border: none;
          color: #f87171;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .processing-state-container {
          text-align: center;
          padding: 60px 20px;
          background: #121212;
          border: 1px solid #222;
          border-radius: 16px;
          max-width: 500px;
          margin: 0 auto;
        }
        .spinner-gold {
          width: 50px;
          height: 50px;
          border: 3px solid #262626;
          border-top: 3px solid #d4af37;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .processing-state-container h3 {
          font-size: 1.2rem;
          color: #fff;
          margin-bottom: 8px;
        }
        .processing-state-container p {
          color: #a3a3a3;
          font-size: 0.95rem;
          margin-bottom: 12px;
        }
        .sub-hint {
          font-size: 0.75rem;
          color: #666;
        }
        .recent-documents-section {
          max-width: 600px;
          margin: 40px auto 0;
        }
        .recent-documents-section h3 {
          font-size: 1rem;
          color: #d4af37;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-item {
          background: #141414;
          border: 1px solid #222;
          padding: 12px 16px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-item:hover {
          border-color: #d4af37;
          background: #1a1a1a;
        }
        .history-item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .text-gold {
          color: #d4af37;
        }
        .h-filename {
          display: block;
          font-size: 0.9rem;
          color: #fff;
          font-weight: 500;
        }
        .h-date {
          display: block;
          font-size: 0.75rem;
          color: #888;
        }
        .capitalize {
          text-transform: capitalize;
        }
        .h-arrow {
          color: #666;
        }
      `}</style>
    </div>
  );
}
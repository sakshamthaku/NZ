import React from 'react';
import ExportMenu from './ExportMenu';

export default function MindMap({ data, fileName, onReset }) {
  const mindMapData = data || { title: "Main Topic", branches: [] };

  return (
    <div className="mindmap-result-wrapper">
      <div className="result-actions-top">
        <button className="back-btn" onClick={onReset}>← Upload Another File</button>
        <ExportMenu targetId="ai-mindmap-export-content" fileName={fileName} type="mindmap" />
      </div>

      <div id="ai-mindmap-export-content" className="mindmap-container-card">
        <div className="mindmap-header">
          <h2>🧠 Mind Map</h2>
          <span>{fileName}</span>
        </div>

        <div className="mindmap-tree-canvas">
          <div className="root-node">
            <span>{mindMapData.title || "Main Topic"}</span>
          </div>

          <div className="tree-connector-vertical"></div>

          <div className="branches-grid">
            {mindMapData.branches?.map((branch, idx) => (
              <div key={idx} className="branch-column">
                <div className="branch-node">
                  <h4>{branch.title}</h4>
                </div>
                {branch.children && branch.children.length > 0 && (
                  <div className="children-container">
                    {branch.children.map((child, cIdx) => (
                      <div key={cIdx} className="child-node">
                        <span>{child}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="notez-branding-footer">
          <span>NOTEZ</span>
        </div>
      </div>

      <style>{`
        .mindmap-result-wrapper {
          max-width: 900px;
          margin: 0 auto;
        }
        .mindmap-container-card {
          background: #141414;
          border: 1px solid #222;
          border-radius: 16px;
          padding: 40px;
          color: #e5e7eb;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          overflow-x: auto;
        }
        .mindmap-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .mindmap-header h2 {
          font-size: 1.6rem;
          color: #fff;
          margin-bottom: 4px;
        }
        .mindmap-header span {
          font-size: 0.85rem;
          color: #888;
        }
        .mindmap-tree-canvas {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
          min-width: 600px;
        }
        .root-node {
          background: linear-gradient(135deg, #d4af37, #aa8c2c);
          color: #000;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
          text-align: center;
        }
        .tree-connector-vertical {
          width: 2px;
          height: 30px;
          background: #333;
        }
        .branches-grid {
          display: flex;
          justify-content: center;
          gap: 20px;
          width: 100%;
          flex-wrap: wrap;
        }
        .branch-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 180px;
          max-width: 240px;
        }
        .branch-node {
          background: #1f1f1f;
          border: 1px solid #d4af37;
          color: #fff;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-align: center;
          width: 100%;
          margin-bottom: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .children-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          border-left: 2px dashed #333;
          padding-left: 12px;
        }
        .child-node {
          background: #181818;
          border: 1px solid #2a2a2a;
          color: #cbd5e1;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
}
import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';

export default function ExportMenu({ targetId, fileName, type }) {
  const [isOpen, setIsOpen] = useState(false);
  const baseName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "notez-export";

  const exportAsPNG = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#141414' });
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `${baseName}-${type}.png`;
    link.click();
    setIsOpen(false);
  };

  const exportAsJPG = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#141414' });
    const image = canvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement('a');
    link.href = image;
    link.download = `${baseName}-${type}.jpg`;
    link.click();
    setIsOpen(false);
  };

  const exportAsPDF = () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    const opt = {
      margin:       10,
      filename:     `${baseName}-${type}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, backgroundColor: '#141414' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
    setIsOpen(false);
  };

  return (
    <div className="export-menu-wrapper">
      <button className="export-trigger-btn" onClick={() => setIsOpen(!isOpen)}>
        <Download size={16} /> Export / Download
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <button onClick={exportAsPDF}><FileText size={14} /> Download as PDF</button>
          <button onClick={exportAsPNG}><ImageIcon size={14} /> Download as PNG</button>
          <button onClick={exportAsJPG}><ImageIcon size={14} /> Download as JPG</button>
        </div>
      )}

      <style>{`
        .export-menu-wrapper {
          position: relative;
          display: inline-block;
        }
        .export-trigger-btn {
          background: #1f1f1f;
          border: 1px solid #333;
          color: #d4af37;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .export-trigger-btn:hover {
          background: #282828;
          border-color: #d4af37;
        }
        .export-dropdown {
          position: absolute;
          right: 0;
          top: 42px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          z-index: 50;
          width: 180px;
          overflow: hidden;
        }
        .export-dropdown button {
          width: 100%;
          background: transparent;
          border: none;
          color: #e5e7eb;
          padding: 10px 14px;
          text-align: left;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.15s;
        }
        .export-dropdown button:hover {
          background: #262626;
          color: #d4af37;
        }
      `}</style>
    </div>
  );
}
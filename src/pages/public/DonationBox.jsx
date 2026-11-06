import React, { useState } from 'react';

const DonationBox = () => {
  // IMPORTANT: Replace "YOUR_UPI_ID_HERE" with your actual UPI ID.
  const UPI_ID = "sakshamthakur2024@oksbi";

  const presetAmounts = [10, 20, 50, 100, 200, 500];
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  // Determine current active amount value
  const getCurrentAmount = () => {
    if (isCustom) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount;
  };

  const currentAmount = getCurrentAmount();
  const isValidAmount = currentAmount > 0;

  const handlePresetClick = (amount) => {
    setIsCustom(false);
    setSelectedAmount(amount);
    setCustomAmount('');
    setShowFallback(false);
  };

  const handleCustomChange = (e) => {
    const value = e.target.value;
    // Allow only numeric input with optional decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      setIsCustom(true);
      setShowFallback(false);
    }
  };

  const handleDonate = () => {
    if (!isValidAmount) return;

    const upiUrl =
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
      `&pn=${encodeURIComponent("NoteZ")}` +
      `&am=${encodeURIComponent(currentAmount)}` +
      `&cu=INR`;

    // Attempt to open the UPI payment deep link
    window.location.href = upiUrl;

    // Show desktop/unsupported browser fallback info after a short timeout
    // allowing mobile apps time to intercept if installed.
    setTimeout(() => {
      setShowFallback(true);
    }, 1500);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="donation-page-wrapper">
      <style>{`
        :root {
          --primary: #2e7d32;
          --primary-dark: #1b5e20;
          --secondary: #4caf50;
          --accent: #81c784;
          --bg: #f4f9f4;
          --card-bg: #ffffff;
          --card-border: #c8e6c9;
          --text-main: #263238;
          --text-muted: #546e7a;
          --radius: 8px;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
          --transition: all 0.2s ease;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .donation-page-wrapper {
          background-color: var(--bg);
          color: var(--text-main);
          font-family: Arial, Helvetica, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .donation-container {
          width: 100%;
          max-width: 520px;
        }

        .donation-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 36px 28px;
          transition: var(--transition);
        }

        .donation-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .heart-icon {
          font-size: 2.2rem;
          margin-bottom: 8px;
          display: inline-block;
        }

        .donation-title {
          font-size: 1.8rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 8px;
        }

        .vision-subtitle {
          font-style: italic;
          color: var(--primary);
          font-size: 0.95rem;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .donation-desc {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .section-label {
          font-size: 0.9rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 12px;
        }

        .amounts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .amount-btn {
          background: var(--bg);
          border: 1px solid var(--card-border);
          color: var(--primary-dark);
          padding: 12px 0;
          font-size: 1rem;
          font-weight: bold;
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
        }

        .amount-btn:hover {
          background: var(--card-border);
          border-color: var(--secondary);
        }

        .amount-btn.active {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary-dark);
        }

        .custom-amount-wrapper {
          position: relative;
          margin-bottom: 24px;
        }

        .custom-input {
          width: 100%;
          padding: 12px 16px 12px 32px;
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          font-size: 1rem;
          color: var(--text-main);
          background: var(--bg);
          outline: none;
          transition: var(--transition);
        }

        .custom-input:focus {
          border-color: var(--secondary);
          background: #ffffff;
        }

        .currency-symbol {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-weight: bold;
        }

        .donate-submit-btn {
          width: 100%;
          background: var(--primary);
          color: #ffffff;
          border: none;
          padding: 14px;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
          box-shadow: 0 2px 4px rgba(46, 125, 50, 0.2);
        }

        .donate-submit-btn:hover:not(:disabled) {
          background: var(--primary-dark);
        }

        .donate-submit-btn:disabled {
          background: #b0bec5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .status-instruction {
          margin-top: 16px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--primary-dark);
          font-weight: bold;
        }

        .fallback-box {
          margin-top: 20px;
          padding: 16px;
          background: var(--bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          text-align: center;
        }

        .fallback-text {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .upi-id-display {
          font-family: monospace;
          background: #ffffff;
          padding: 8px;
          border: 1px dashed var(--secondary);
          border-radius: 4px;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 12px;
          word-break: break-all;
        }

        .copy-btn {
          background: var(--secondary);
          color: white;
          border: none;
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: bold;
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
        }

        .copy-btn:hover {
          background: var(--primary);
        }

        .trust-section {
          margin-top: 32px;
          border-top: 1px solid var(--card-border);
          padding-top: 20px;
        }

        .trust-title {
          font-size: 1rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 6px;
        }

        .trust-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .voluntary-notice {
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 16px;
          font-style: italic;
        }
      `}</style>

      <div className="donation-container">
        <div className="donation-card">
          <div className="donation-header">
            <div className="heart-icon">❤️</div>
            <h1 className="donation-title">Support the Vision</h1>
            <p className="vision-subtitle">
              "Without your support, this version of NoteZ may never reach the bigger vision we have for it."
            </p>
            <p className="donation-desc">
              NoteZ is being built to provide useful productivity tools for students and, over time, teachers, workers, and organizations. Your voluntary support can help us continue developing, maintaining, and expanding the project.
            </p>
          </div>

          <div className="section-label">Select Amount</div>
          <div className="amounts-grid">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                className={`amount-btn ${!isCustom && selectedAmount === amount ? 'active' : ''}`}
                onClick={() => handlePresetClick(amount)}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          <div className="custom-amount-wrapper">
            <span className="currency-symbol">₹</span>
            <input
              type="text"
              placeholder="Enter custom amount"
              value={customAmount}
              onChange={handleCustomChange}
              className="custom-input"
            />
          </div>

          <button
            className="donate-submit-btn"
            disabled={!isValidAmount}
            onClick={handleDonate}
          >
            Donate Us ❤️ {isValidAmount ? `(₹${currentAmount})` : ''}
          </button>

          <div className="status-instruction">
            Complete your payment in your UPI app.
          </div>

          {showFallback && (
            <div className="fallback-box">
              <div className="fallback-text">Your device could not open a UPI app automatically.</div>
              <div className="fallback-text">Please open your UPI app and send your chosen amount to this UPI ID:</div>
              <div className="upi-id-display">{UPI_ID}</div>
              <button className="copy-btn" onClick={handleCopyUpi}>
                {copied ? 'Copied to Clipboard!' : 'Copy UPI ID'}
              </button>
            </div>
          )}

          <div className="trust-section">
            <div className="trust-title">Where does your support go?</div>
            <div className="trust-desc">
              Support may be used for development, hosting, infrastructure, maintenance, security, design, and other costs required to operate and grow NoteZ and our work.
            </div>

            <div className="trust-title">Security & Privacy</div>
            <div className="trust-desc" style={{ marginBottom: '0' }}>
              This website never asks for or stores your UPI PIN, passwords, or financial credentials. All payments process securely inside your own trusted UPI application.
            </div>
          </div>

          <div className="voluntary-notice">
            Donations are completely voluntary.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationBox;
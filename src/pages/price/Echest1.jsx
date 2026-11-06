import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Echest1() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [activeStorage, setActiveStorage] = useState("documents");
  const [dragActive, setDragActive] = useState(false);

  const messages = [
    "Preparing your NoteZ Premium space...",
    "Securing your student storage...",
    "Preparing document vault...",
    "Preparing photo vault...",
    "Checking your storage...",
    "Your premium space is ready."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 650);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const text = "Search your NoteZ storage...";
    let index = 0;

    const interval = setInterval(() => {
      setSearchText(text.slice(0, index));

      index++;

      if (index > text.length) {
        index = 0;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loading]);

  const handleUploadClick = () => {
    if (activeStorage === "documents") {
      document.getElementById("document-upload")?.click();
    } else {
      document.getElementById("photo-upload")?.click();
    }
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;

    console.log("Selected files:", Array.from(files));

    alert(
      `${files.length} file${files.length > 1 ? "s" : ""} selected. AWS S3 upload logic can be connected here.`
    );
  };

  const handleDocumentChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handlePhotoChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const files = event.dataTransfer.files;
    handleFiles(files);
  };

  if (loading) {
    return (
      <>
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family:
              Inter,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            background: #050505;
          }

          .echest-loader {
            min-height: 100vh;
            width: 100%;
            background:
              radial-gradient(
                circle at 50% 40%,
                rgba(255, 193, 7, 0.13),
                transparent 28%
              ),
              #050505;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            position: relative;
          }

          .loader-orb {
            position: absolute;
            width: 320px;
            height: 320px;
            border: 1px solid rgba(255, 193, 7, 0.15);
            border-radius: 50%;
            animation: orbSpin 8s linear infinite;
          }

          .loader-orb::before,
          .loader-orb::after {
            content: "";
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(255, 193, 7, 0.08);
          }

          .loader-orb::before {
            inset: 35px;
          }

          .loader-orb::after {
            inset: 75px;
          }

          .loader-center {
            position: relative;
            z-index: 2;
            width: min(700px, 90%);
            text-align: center;
          }

          .loader-logo {
            font-size: clamp(36px, 8vw, 76px);
            font-weight: 900;
            letter-spacing: -4px;
            color: white;
            margin-bottom: 10px;
          }

          .loader-logo span {
            color: #ffc107;
            text-shadow:
              0 0 10px rgba(255, 193, 7, 0.7),
              0 0 35px rgba(255, 193, 7, 0.35);
          }

          .loader-title {
            font-size: clamp(15px, 2vw, 20px);
            color: #bcbcbc;
            min-height: 30px;
            animation: textFade 0.5s ease;
          }

          .loader-line {
            margin: 32px auto 0;
            height: 3px;
            width: min(420px, 80%);
            background: rgba(255,255,255,0.08);
            overflow: hidden;
            border-radius: 20px;
          }

          .loader-line span {
            display: block;
            width: 35%;
            height: 100%;
            background: #ffc107;
            box-shadow: 0 0 18px #ffc107;
            animation: loadingLine 1.2s ease-in-out infinite;
          }

          .loader-dots {
            margin-top: 25px;
            display: flex;
            justify-content: center;
            gap: 8px;
          }

          .loader-dot {
            width: 7px;
            height: 7px;
            background: #ffc107;
            border-radius: 50%;
            animation: dotJump 1s infinite;
          }

          .loader-dot:nth-child(2) {
            animation-delay: 0.15s;
          }

          .loader-dot:nth-child(3) {
            animation-delay: 0.3s;
          }

          @keyframes orbSpin {
            from {
              transform: rotate(0deg) scale(1);
            }

            50% {
              transform: rotate(180deg) scale(1.08);
            }

            to {
              transform: rotate(360deg) scale(1);
            }
          }

          @keyframes loadingLine {
            0% {
              transform: translateX(-130%);
            }

            50% {
              transform: translateX(130%);
            }

            100% {
              transform: translateX(280%);
            }
          }

          @keyframes dotJump {
            0%, 100% {
              transform: translateY(0);
              opacity: 0.35;
            }

            50% {
              transform: translateY(-7px);
              opacity: 1;
            }
          }

          @keyframes textFade {
            from {
              opacity: 0;
              transform: translateY(8px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <div className="echest-loader">
          <div className="loader-orb"></div>

          <div className="loader-center">
            <div className="loader-logo">
              NoteZ<span>.</span>
            </div>

            <div className="loader-title" key={messageIndex}>
              {messages[messageIndex]}
            </div>

            <div className="loader-line">
              <span></span>
            </div>

            <div className="loader-dots">
              <div className="loader-dot"></div>
              <div className="loader-dot"></div>
              <div className="loader-dot"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #050505;
          color: #fff;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        .echest-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(255, 193, 7, 0.08),
              transparent 25%
            ),
            radial-gradient(
              circle at 90% 35%,
              rgba(255, 193, 7, 0.06),
              transparent 25%
            ),
            #050505;
          overflow-x: hidden;
          position: relative;
        }

        .echest-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(
              rgba(255,255,255,0.018) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.018) 1px,
              transparent 1px
            );
          background-size: 50px 50px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 80%
          );
        }

        .echest-header {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          background: rgba(5, 5, 5, 0.76);
          border-bottom: 1px solid rgba(255, 193, 7, 0.12);
          backdrop-filter: blur(18px);
        }

        .brand {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .brand span {
          color: #ffc107;
          text-shadow: 0 0 15px rgba(255,193,7,.5);
        }

        .premium-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,193,7,.3);
          background: rgba(255,193,7,.07);
          color: #ffc107;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .5px;
          animation: badgePulse 2.5s ease-in-out infinite;
        }

        .premium-dot {
          width: 7px;
          height: 7px;
          background: #ffc107;
          border-radius: 50%;
          box-shadow: 0 0 12px #ffc107;
        }

        .hero {
          width: min(1180px, 92%);
          margin: auto;
          padding: 85px 0 35px;
          text-align: center;
          position: relative;
        }

        .hero-small {
          color: #ffc107;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 18px;
          animation: fadeUp .7s ease both;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(42px, 8vw, 82px);
          line-height: .95;
          letter-spacing: -5px;
          font-weight: 950;
          animation: fadeUp .8s ease .1s both;
        }

        .hero h1 span {
          color: #ffc107;
          text-shadow:
            0 0 15px rgba(255,193,7,.4),
            0 0 50px rgba(255,193,7,.15);
        }

        .hero-description {
          max-width: 650px;
          margin: 24px auto 0;
          color: #9c9c9c;
          line-height: 1.7;
          font-size: 15px;
          animation: fadeUp .8s ease .2s both;
        }

        .search-shell {
          width: min(760px, 94%);
          margin: 45px auto 0;
          padding: 8px;
          border-radius: 25px;
          background: linear-gradient(
            120deg,
            rgba(255,193,7,.4),
            rgba(255,255,255,.06),
            rgba(255,193,7,.25)
          );
          background-size: 250% 250%;
          animation:
            gradientMove 6s ease infinite,
            fadeUp .8s ease .3s both;
          box-shadow:
            0 25px 80px rgba(0,0,0,.5),
            0 0 50px rgba(255,193,7,.07);
        }

        .search-box {
          min-height: 72px;
          border-radius: 19px;
          background: #0c0c0c;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 0 23px;
          text-align: left;
        }

        .search-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #ffc107;
          background: rgba(255,193,7,.09);
          font-size: 20px;
        }

        .typing-text {
          flex: 1;
          color: #bdbdbd;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
        }

        .typing-cursor {
          color: #ffc107;
          animation: cursorBlink .8s infinite;
        }

        .storage-area {
          width: min(1100px, 92%);
          margin: 30px auto 100px;
        }

        .storage-top {
          display: grid;
          grid-template-columns: 1.5fr .8fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .glass-card {
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(
            145deg,
            rgba(255,255,255,.065),
            rgba(255,255,255,.018)
          );
          border-radius: 25px;
          backdrop-filter: blur(16px);
          box-shadow: 0 20px 70px rgba(0,0,0,.25);
        }

        .usage-card {
          padding: 27px;
          animation: cardEnter .8s ease both;
        }

        .usage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .usage-title {
          font-size: 18px;
          font-weight: 850;
        }

        .usage-sub {
          color: #777;
          font-size: 12px;
          margin-top: 6px;
        }

        .usage-number {
          color: #ffc107;
          font-weight: 900;
          font-size: 22px;
        }

        .usage-bar {
          margin-top: 22px;
          height: 9px;
          background: rgba(255,255,255,.07);
          border-radius: 99px;
          overflow: hidden;
        }

        .usage-progress {
          width: 8%;
          height: 100%;
          background: linear-gradient(90deg, #ffc107, #ffe082);
          border-radius: 99px;
          box-shadow: 0 0 18px rgba(255,193,7,.45);
          animation: progressGlow 2s infinite;
        }

        .storage-type {
          padding: 27px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .storage-type small {
          color: #777;
          margin-bottom: 8px;
        }

        .storage-type strong {
          font-size: 28px;
        }

        .storage-type strong span {
          color: #ffc107;
        }

        .storage-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 18px;
        }

        .storage-tab {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: #aaa;
          padding: 18px;
          border-radius: 20px;
          cursor: pointer;
          text-align: left;
          transition: .3s ease;
        }

        .storage-tab:hover {
          transform: translateY(-3px);
          border-color: rgba(255,193,7,.3);
        }

        .storage-tab.active {
          background: rgba(255,193,7,.08);
          border-color: rgba(255,193,7,.45);
          color: white;
          box-shadow: 0 10px 40px rgba(255,193,7,.06);
        }

        .tab-icon {
          font-size: 25px;
          margin-bottom: 9px;
        }

        .tab-title {
          font-weight: 850;
          font-size: 15px;
        }

        .tab-description {
          margin-top: 5px;
          color: #777;
          font-size: 12px;
        }

        .vault {
          padding: 28px;
          animation: cardEnter .7s ease both;
        }

        .vault-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .vault-heading h2 {
          margin: 0;
          font-size: 24px;
        }

        .vault-heading p {
          margin: 7px 0 0;
          color: #777;
          font-size: 13px;
        }

        .upload-zone {
          min-height: 310px;
          border: 1px dashed rgba(255,193,7,.35);
          border-radius: 23px;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 30px;
          position: relative;
          overflow: hidden;
          transition: .3s ease;
          background:
            radial-gradient(
              circle at center,
              rgba(255,193,7,.055),
              transparent 55%
            );
        }

        .upload-zone::before {
          content: "";
          position: absolute;
          width: 160px;
          height: 160px;
          border: 1px solid rgba(255,193,7,.15);
          border-radius: 50%;
          animation: uploadOrbit 5s linear infinite;
        }

        .upload-zone.dragging {
          border-color: #ffc107;
          background: rgba(255,193,7,.08);
          transform: scale(1.01);
        }

        .upload-content {
          position: relative;
          z-index: 2;
        }

        .upload-icon {
          width: 74px;
          height: 74px;
          margin: auto;
          display: grid;
          place-items: center;
          border-radius: 23px;
          font-size: 30px;
          color: #ffc107;
          background: rgba(255,193,7,.08);
          border: 1px solid rgba(255,193,7,.2);
          animation: floatIcon 3s ease-in-out infinite;
        }

        .upload-title {
          margin-top: 22px;
          font-size: 21px;
          font-weight: 850;
        }

        .upload-description {
          color: #777;
          font-size: 13px;
          margin-top: 8px;
        }

        .upload-button {
          margin-top: 22px;
          border: 0;
          padding: 13px 24px;
          border-radius: 14px;
          background: #ffc107;
          color: #111;
          font-weight: 900;
          cursor: pointer;
          transition: .25s ease;
          box-shadow: 0 8px 30px rgba(255,193,7,.2);
        }

        .upload-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 14px 35px rgba(255,193,7,.3);
        }

        .upload-button:active {
          transform: scale(.97);
        }

        .security-note {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 11px;
        }

        .security-note span {
          color: #ffc107;
        }

        .bottom-info {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .info-box {
          padding: 20px;
          border-radius: 20px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.06);
          transition: .3s ease;
        }

        .info-box:hover {
          transform: translateY(-4px);
          border-color: rgba(255,193,7,.22);
        }

        .info-icon {
          color: #ffc107;
          font-size: 20px;
        }

        .info-box strong {
          display: block;
          margin-top: 12px;
          font-size: 13px;
        }

        .info-box p {
          color: #6f6f6f;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 0;
        }

        .back-button {
          border: 1px solid rgba(255,255,255,.1);
          color: #aaa;
          background: rgba(255,255,255,.03);
          padding: 9px 14px;
          border-radius: 11px;
          cursor: pointer;
          transition: .25s ease;
        }

        .back-button:hover {
          color: white;
          border-color: rgba(255,193,7,.35);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(25px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes badgePulse {
          0%,100% {
            box-shadow: 0 0 0 rgba(255,193,7,0);
          }

          50% {
            box-shadow: 0 0 25px rgba(255,193,7,.1);
          }
        }

        @keyframes cursorBlink {
          0%,49% {
            opacity: 1;
          }

          50%,100% {
            opacity: 0;
          }
        }

        @keyframes progressGlow {
          0%,100% {
            box-shadow: 0 0 10px rgba(255,193,7,.2);
          }

          50% {
            box-shadow: 0 0 25px rgba(255,193,7,.55);
          }
        }

        @keyframes uploadOrbit {
          from {
            transform: rotate(0deg) scale(.9);
            opacity: .3;
          }

          50% {
            transform: rotate(180deg) scale(1.15);
            opacity: .65;
          }

          to {
            transform: rotate(360deg) scale(.9);
            opacity: .3;
          }
        }

        @keyframes floatIcon {
          0%,100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @media (max-width: 800px) {
          .echest-header {
            padding: 0 4%;
          }

          .hero {
            padding-top: 60px;
          }

          .hero h1 {
            letter-spacing: -3px;
          }

          .storage-top {
            grid-template-columns: 1fr;
          }

          .bottom-info {
            grid-template-columns: 1fr;
          }

          .storage-tabs {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .echest-header {
            height: 65px;
          }

          .brand {
            font-size: 21px;
          }

          .premium-badge {
            padding: 7px 10px;
            font-size: 10px;
          }

          .hero {
            width: 94%;
            padding-top: 48px;
          }

          .hero h1 {
            font-size: 47px;
          }

          .hero-description {
            font-size: 13px;
          }

          .search-box {
            min-height: 62px;
            padding: 0 15px;
          }

          .search-icon {
            width: 35px;
            height: 35px;
          }

          .typing-text {
            font-size: 12px;
          }

          .storage-area {
            width: 94%;
          }

          .usage-card,
          .storage-type,
          .vault {
            padding: 20px;
          }

          .upload-zone {
            min-height: 280px;
          }

          .vault-heading {
            align-items: flex-start;
          }

          .back-button {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div className="echest-page">

        <header className="echest-header">
          <div className="brand">
            NoteZ<span>.</span>
          </div>

          <div className="premium-badge">
            <span className="premium-dot"></span>
            PREMIUM STORAGE
          </div>
        </header>

        <main>

          <section className="hero">

            <div className="hero-small">
              NoteZ Premium • E-Chest 01
            </div>

            <h1>
              Your digital
              <br />
              <span>student vault.</span>
            </h1>

            <p className="hero-description">
              Store your important student documents and photos
              inside your private NoteZ Premium space.
            </p>

            <div className="search-shell">
              <div className="search-box">

                <div className="search-icon">
                  ⌕
                </div>

                <div className="typing-text">
                  {searchText}
                  <span className="typing-cursor">|</span>
                </div>

              </div>
            </div>

          </section>

          <section className="storage-area">

            <div className="storage-top">

              <div className="glass-card usage-card">

                <div className="usage-header">

                  <div>
                    <div className="usage-title">
                      Premium storage
                    </div>

                    <div className="usage-sub">
                      E-Chest Student Plan
                    </div>
                  </div>

                  <div className="usage-number">
                    0.08 / 1 GB
                  </div>

                </div>

                <div className="usage-bar">
                  <div className="usage-progress"></div>
                </div>

              </div>

              <div className="glass-card storage-type">

                <small>PLAN</small>

                <strong>
                  ₹<span>50</span>
                  <small> / month</small>
                </strong>

              </div>

            </div>

            <div className="storage-tabs">

              <button
                className={`storage-tab ${
                  activeStorage === "documents" ? "active" : ""
                }`}
                onClick={() => setActiveStorage("documents")}
              >
                <div className="tab-icon">▣</div>

                <div className="tab-title">
                  Document Storage
                </div>

                <div className="tab-description">
                  PDF, DOC, DOCX and student files
                </div>
              </button>

              <button
                className={`storage-tab ${
                  activeStorage === "photos" ? "active" : ""
                }`}
                onClick={() => setActiveStorage("photos")}
              >
                <div className="tab-icon">▧</div>

                <div className="tab-title">
                  Photo Storage
                </div>

                <div className="tab-description">
                  Save your important student images
                </div>
              </button>

            </div>

            <div className="glass-card vault">

              <div className="vault-heading">

                <div>
                  <h2>
                    {activeStorage === "documents"
                      ? "Document Vault"
                      : "Photo Vault"}
                  </h2>

                  <p>
                    {activeStorage === "documents"
                      ? "Keep your academic documents organized."
                      : "Keep your important photos safely stored."}
                  </p>
                </div>

              return (
    <button
      className="back-button"
      onClick={() => navigate('/MONEY')}
    >
      ← Plans
    </button>

              </div>

              <div
                className={`upload-zone ${
                  dragActive ? "dragging" : ""
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
              >

                <div className="upload-content">

                  <div className="upload-icon">
                    {activeStorage === "documents"
                      ? "▣"
                      : "▧"}
                  </div>

                  <div className="upload-title">
                    {activeStorage === "documents"
                      ? "Drop your documents here"
                      : "Drop your photos here"}
                  </div>

                  <div className="upload-description">
                    or choose files from your device
                  </div>

                  <button
                    className="upload-button"
                    onClick={handleUploadClick}
                  >
                    + Add{" "}
                    {activeStorage === "documents"
                      ? "Document"
                      : "Photo"}
                  </button>

                  <div className="security-note">
                    <span>●</span>
                    Private student storage
                  </div>

                </div>

              </div>

              <input
                id="document-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={handleDocumentChange}
              />

              <input
                id="photo-upload"
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />

              <div className="bottom-info">

                <div className="info-box">
                  <div className="info-icon">◈</div>

                  <strong>
                    Student focused
                  </strong>

                  <p>
                    Designed for academic documents,
                    certificates and important photos.
                  </p>
                </div>

                <div className="info-box">
                  <div className="info-icon">⌁</div>

                  <strong>
                    Simple storage
                  </strong>

                  <p>
                    Upload your files without complicated
                    storage management.
                  </p>
                </div>

                <div className="info-box">
                  <div className="info-icon">◇</div>

                  <strong>
                    Premium space
                  </strong>

                  <p>
                    Your E-Chest plan gives you dedicated
                    storage inside NoteZ.
                  </p>
                </div>

              </div>

            </div>

          </section>

        </main>

      </div>
    </>
  );
}
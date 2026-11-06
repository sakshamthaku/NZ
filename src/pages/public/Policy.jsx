import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Policy() {
  const navigate = useNavigate();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 350);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const trustItems = [
    {
      icon: "🔒",
      title: "Your account is protected",
      text: "Your account is protected through secure authentication.",
    },
    {
      icon: "☁️",
      title: "Trusted cloud services",
      text: "Your NoteZ data is stored using trusted cloud services, including Firebase and, where applicable, AWS services.",
    },
    {
      icon: "💬",
      title: "Your chats are private",
      text: "Your chats are private and are stored only to provide and operate the communication service.",
    },
    {
      icon: "📁",
      title: "Your documents and photos belong to you",
      text: "Your documents and photos belong to you and are not intended to be publicly exposed through NoteZ.",
    },
    {
      icon: "🚫",
      title: "We do not sell your personal information",
      text: "We do not sell your personal information as part of our service model.",
    },
    {
      icon: "🛡️",
      title: "Security measures",
      text: "We use security measures designed to protect your information against unauthorized access.",
    },
    {
      icon: "👤",
      title: "How your information is used",
      text: "Your information is used to provide NoteZ features, improve the service, maintain security, and support your account.",
    },
    {
      icon: "🗑️",
      title: "Data deletion",
      text: "You can request deletion of your account/data, subject to applicable legal and operational requirements.",
    },
  ];

  return (
    <div className="notez-policy-page">

      {/* =========================
          BACKGROUND EFFECTS
      ========================== */}
      <div className="policy-glow glow-one"></div>
      <div className="policy-glow glow-two"></div>

      {/* =========================
          HEADER
      ========================== */}
      <header className="policy-header">

        <button
          className="policy-brand"
          onClick={() => navigate("/")}
          aria-label="Go to NoteZ home"
        >
          <span className="brand-book">

            <span className="book-page book-left"></span>
            <span className="book-page book-right"></span>

            <span className="book-line line-one"></span>
            <span className="book-line line-two"></span>

          </span>

          <span className="brand-name">NoteZ</span>
        </button>

        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

      </header>

      {/* =========================
          MAIN
      ========================== */}
      <main className="policy-main">

        {/* =========================
            HERO
        ========================== */}
        <section className="policy-hero">

          {/* Animated Book */}
          <div className="hero-book-area">

            <div className="hero-book">

              <div className="hero-page hero-left">

                <span className="page-line"></span>
                <span className="page-line short"></span>
                <span className="page-line"></span>
                <span className="page-line medium"></span>

              </div>

              <div className="hero-spine"></div>

              <div className="hero-page hero-right">

                <span className="page-line"></span>
                <span className="page-line medium"></span>
                <span className="page-line"></span>
                <span className="page-line short"></span>

              </div>

            </div>

            <div className="book-shadow"></div>

          </div>

          {/* Hero Text */}
          <div className="hero-content">

            <div className="trust-label">
              <span className="trust-check">✓</span>
              NoteZ Trust Promise
            </div>

            <h1>
              Your Data,
              <br />
              <span>Your Trust.</span>
            </h1>

            <p>
              Your privacy matters to us.
              NoteZ is built for students with
              privacy and security in mind.
            </p>

          </div>

        </section>

        {/* =========================
            POLICY CARD
        ========================== */}
        <section className="policy-card">

          <div className="policy-card-header">

            <div>

              <div className="small-title">
                NOTEZ • TRUST & PRIVACY
              </div>

              <h2>
                Your privacy matters to us.
              </h2>

            </div>

            <div className="privacy-badge">
              <span>✓</span>
              Privacy Focused
            </div>

          </div>

          {/* Main Introduction */}
          <div className="policy-introduction">

            <p>
              At <strong>NoteZ</strong>, we are committed to keeping
              your personal information and content protected.
              Your account information and the content you choose
              to store on NoteZ are handled through trusted cloud
              infrastructure and security controls.
            </p>

          </div>

          {/* =========================
              TRUST GRID
          ========================== */}
          <div className="trust-grid">

            {trustItems.map((item, index) => (

              <article
                className="trust-item"
                key={item.title}
                style={{
                  animationDelay: `${index * 70}ms`,
                }}
              >

                <div className="trust-icon">
                  {item.icon}
                </div>

                <div className="trust-text">

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.text}
                  </p>

                </div>

              </article>

            ))}

          </div>

          {/* =========================
              NOTEZ PROMISE
          ========================== */}
          <div className="notez-promise">

            <div className="quote-icon">
              “
            </div>

            <p>
              NoteZ is built for students —
              your notes, conversations, documents
              and memories should stay yours.
            </p>

          </div>

          {/* =========================
              SIMPLE INFORMATION BOX
          ========================== */}
          <div className="information-box">

            <div className="information-icon">
              i
            </div>

            <p>
              This page explains NoteZ's simple trust
              and privacy approach. It is intended to
              clearly explain how we handle your information
              while using NoteZ.
            </p>

          </div>

          {/* =========================
              HOME BUTTON
          ========================== */}
          <button
            className="home-button"
            onClick={() => navigate("/")}
          >
            Continue to NoteZ
            <span>→</span>
          </button>

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="policy-footer">

        <div className="footer-brand">

          <strong>NoteZ</strong>

          <span>
            Student productivity • communication • storage
          </span>

        </div>

        <div className="footer-copy">
          © 2026 NoteZ. Built with privacy in mind.
        </div>

      </footer>

      {/* =========================
          BACK TO TOP
      ========================== */}
      <button
        className={`top-button ${
          showTop ? "top-visible" : ""
        }`}
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
        aria-label="Back to top"
      >
        ↑
      </button>

      {/* =========================
          INTERNAL CSS
      ========================== */}
      <style>{`

        * {
          box-sizing: border-box;
        }

        .notez-policy-page {

          --green: #16a957;
          --green-dark: #08783d;
          --green-light: #eaf9f0;
          --green-border: #cce9d7;

          --text: #12221a;
          --muted: #65756d;

          min-height: 100vh;

          color: var(--text);

          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(22,169,87,.11),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(22,169,87,.08),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #fbfffc,
              #f1faf5 55%,
              #ffffff
            );

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          overflow-x: hidden;

          position: relative;
        }


        /* =========================
           BACKGROUND GLOW
        ========================== */

        .policy-glow {

          position: fixed;

          width: 300px;
          height: 300px;

          border-radius: 50%;

          background: rgba(22,169,87,.07);

          filter: blur(55px);

          pointer-events: none;

          z-index: 0;
        }

        .glow-one {
          left: -160px;
          top: 25%;
        }

        .glow-two {
          right: -160px;
          bottom: 15%;
        }


        /* =========================
           HEADER
        ========================== */

        .policy-header {

          width: min(
            1180px,
            calc(100% - 40px)
          );

          margin: auto;

          padding: 22px 0;

          display: flex;

          justify-content: space-between;

          align-items: center;

          position: relative;

          z-index: 10;
        }


        .policy-brand {

          border: none;

          background: transparent;

          display: flex;

          align-items: center;

          gap: 10px;

          cursor: pointer;

          padding: 5px;
        }


        .brand-name {

          color: var(--green-dark);

          font-size: 25px;

          font-weight: 900;

          letter-spacing: -1px;
        }


        /* Small Logo */

        .brand-book {

          width: 35px;

          height: 31px;

          position: relative;

          display: inline-block;
        }


        .book-page {

          position: absolute;

          bottom: 2px;

          width: 16px;

          height: 25px;

          background:
            linear-gradient(
              145deg,
              #36c879,
              #078b43
            );

          box-shadow:
            0 5px 13px
            rgba(9,128,62,.18);
        }


        .book-left {

          left: 1px;

          border-radius:
            5px 2px 4px 3px;

          transform: skewY(4deg);
        }


        .book-right {

          right: 1px;

          border-radius:
            2px 5px 3px 4px;

          transform: skewY(-4deg);
        }


        .book-line {

          position: absolute;

          width: 8px;

          height: 2px;

          background: rgba(255,255,255,.8);

          border-radius: 10px;

          top: 14px;

          z-index: 2;
        }


        .line-one {
          left: 5px;
        }

        .line-two {
          right: 5px;
        }


        .back-button {

          border: 1px solid #d5e8dc;

          background: rgba(255,255,255,.8);

          color: var(--green-dark);

          padding: 9px 15px;

          border-radius: 12px;

          font-size: 13px;

          font-weight: 750;

          cursor: pointer;

          transition: .25s ease;

          backdrop-filter: blur(10px);
        }


        .back-button:hover {

          transform: translateY(-2px);

          border-color: #9ed4b3;

          box-shadow:
            0 10px 25px
            rgba(0,100,50,.08);
        }


        /* =========================
           MAIN
        ========================== */

        .policy-main {

          width: min(
            1180px,
            calc(100% - 40px)
          );

          margin: auto;

          position: relative;

          z-index: 2;
        }


        /* =========================
           HERO
        ========================== */

        .policy-hero {

          min-height: 440px;

          display: grid;

          grid-template-columns:
            390px 1fr;

          gap: 70px;

          align-items: center;

          padding:
            30px 25px
            60px;
        }


        /* =========================
           BOOK
        ========================== */

        .hero-book-area {

          height: 310px;

          display: grid;

          place-items: center;

          position: relative;

          perspective: 900px;
        }


        .hero-book {

          width: 270px;

          height: 185px;

          display: flex;

          position: relative;

          filter:
            drop-shadow(
              0 25px 22px
              rgba(3,93,43,.14)
            );

          transform-style: preserve-3d;

          animation:
            bookFloat
            4.8s
            ease-in-out
            infinite;
        }


        .hero-page {

          width: 50%;

          height: 100%;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #effaf3
            );

          border: 3px solid #bfe6cd;

          position: relative;

          overflow: hidden;
        }


        .hero-left {

          border-radius:
            14px 3px 4px 15px;

          transform-origin: right center;

          animation:
            leftPage
            5s
            ease-in-out
            infinite;
        }


        .hero-right {

          border-radius:
            3px 14px 15px 4px;

          transform-origin: left center;

          animation:
            rightPage
            5s
            ease-in-out
            infinite;
        }


        .hero-spine {

          position: absolute;

          left: 50%;

          top: 0;

          bottom: 0;

          width: 10px;

          transform:
            translateX(-50%);

          border-radius: 50%;

          background:
            linear-gradient(
              90deg,
              #08783a,
              #43ca7c,
              #08783a
            );

          box-shadow:
            0 0 15px
            rgba(24,169,87,.28);

          z-index: 3;
        }


        .page-line {

          display: block;

          height: 5px;

          width: 68%;

          margin:
            28px auto 0;

          border-radius: 10px;

          background: #bde8cc;
        }


        .page-line + .page-line {
          margin-top: 16px;
        }


        .page-line.short {
          width: 43%;
        }


        .page-line.medium {
          width: 55%;
        }


        .book-shadow {

          position: absolute;

          width: 220px;

          height: 25px;

          background:
            rgba(0,88,42,.12);

          filter: blur(15px);

          bottom: 25px;

          border-radius: 50%;

          animation:
            shadowPulse
            4.8s
            ease-in-out
            infinite;
        }


        /* =========================
           HERO TEXT
        ========================== */

        .hero-content {
          max-width: 650px;
        }


        .trust-label {

          display: inline-flex;

          align-items: center;

          gap: 8px;

          color: var(--green-dark);

          background: var(--green-light);

          border:
            1px solid
            var(--green-border);

          padding:
            8px 13px;

          border-radius: 999px;

          font-size: 13px;

          font-weight: 800;

          animation:
            fadeUp
            .7s
            ease
            both;
        }


        .trust-check {

          width: 21px;

          height: 21px;

          display: grid;

          place-items: center;

          color: white;

          background: var(--green);

          border-radius: 50%;

          font-size: 12px;
        }


        .hero-content h1 {

          font-size:
            clamp(
              48px,
              7vw,
              78px
            );

          line-height: .98;

          letter-spacing: -4px;

          margin:
            24px 0 18px;

          font-weight: 900;

          animation:
            fadeUp
            .8s
            .08s
            ease
            both;
        }


        .hero-content h1 span {
          color: var(--green);
        }


        .hero-content p {

          color: var(--muted);

          max-width: 620px;

          font-size: 18px;

          line-height: 1.75;

          margin: 0;

          animation:
            fadeUp
            .8s
            .16s
            ease
            both;
        }


        /* =========================
           POLICY CARD
        ========================== */

        .policy-card {

          background:
            rgba(255,255,255,.9);

          border:
            1px solid
            rgba(196,226,207,.9);

          border-radius: 28px;

          box-shadow:
            0 25px 70px
            rgba(0,77,38,.08);

          padding:
            clamp(22px,4vw,45px);

          backdrop-filter:
            blur(18px);
        }


        .policy-card-header {

          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          gap: 25px;

          padding-bottom: 25px;

          border-bottom:
            1px solid #dcebe2;
        }


        .small-title {

          font-size: 11px;

          color: var(--green);

          font-weight: 900;

          letter-spacing: 1.4px;
        }


        .policy-card h2 {

          margin:
            8px 0 0;

          font-size:
            clamp(
              25px,
              4vw,
              36px
            );

          letter-spacing: -1.5px;
        }


        .privacy-badge {

          flex-shrink: 0;

          display: flex;

          align-items: center;

          gap: 7px;

          color: var(--green-dark);

          background: #edfbf2;

          border:
            1px solid
            #c9ead6;

          border-radius: 999px;

          padding:
            9px 13px;

          font-size: 12px;

          font-weight: 800;
        }


        .privacy-badge span {

          width: 18px;

          height: 18px;

          display: grid;

          place-items: center;

          color: white;

          background: var(--green);

          border-radius: 50%;
        }


        /* =========================
           INTRO
        ========================== */

        .policy-introduction p {

          color: #4d6257;

          font-size: 16px;

          line-height: 1.8;

          margin:
            26px 0;
        }


        /* =========================
           TRUST GRID
        ========================== */

        .trust-grid {

          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap: 14px;
        }


        .trust-item {

          display: flex;

          gap: 14px;

          align-items: flex-start;

          padding: 19px;

          border:
            1px solid
            #e2eee7;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #f8fdf9
            );

          border-radius: 18px;

          transition:
            .25s ease;

          animation:
            cardIn
            .65s
            ease
            both;
        }


        .trust-item:hover {

          transform:
            translateY(-4px);

          border-color:
            #b9dfc8;

          box-shadow:
            0 15px 30px
            rgba(0,92,45,.07);
        }


        .trust-icon {

          flex:
            0 0 42px;

          width: 42px;

          height: 42px;

          border-radius: 13px;

          display: grid;

          place-items: center;

          background: #ecfaf1;

          font-size: 19px;
        }


        .trust-text h3 {

          margin:
            1px 0 5px;

          font-size: 15px;
        }


        .trust-text p {

          margin: 0;

          color: #687a70;

          line-height: 1.55;

          font-size: 13px;
        }


        /* =========================
           NOTEZ PROMISE
        ========================== */

        .notez-promise {

          position: relative;

          margin-top: 24px;

          padding:
            28px
            28px
            28px
            65px;

          border-radius: 20px;

          background:
            linear-gradient(
              135deg,
              #effbf3,
              #f8fdf9
            );

          border:
            1px solid
            #ccebd8;

          overflow: hidden;
        }


        .quote-icon {

          position: absolute;

          left: 23px;

          top: 10px;

          font-size: 62px;

          line-height: 1;

          color: #78d49d;

          font-family: Georgia, serif;
        }


        .notez-promise p {

          margin: 0;

          color: #17633a;

          font-size: 18px;

          font-weight: 750;

          line-height: 1.6;
        }


        /* =========================
           INFORMATION BOX
        ========================== */

        .information-box {

          margin-top: 18px;

          display: flex;

          gap: 12px;

          align-items: flex-start;

          padding: 15px 17px;

          border-radius: 14px;

          background: #fbfdfc;

          border:
            1px dashed
            #cfe2d7;
        }


        .information-icon {

          width: 24px;

          height: 24px;

          flex:
            0 0 24px;

          border-radius: 50%;

          display: grid;

          place-items: center;

          color: var(--green-dark);

          background: #eaf8ef;

          font-weight: 900;
        }


        .information-box p {

          margin: 0;

          color: #6a786f;

          line-height: 1.55;

          font-size: 12px;
        }


        /* =========================
           HOME BUTTON
        ========================== */

        .home-button {

          margin-top: 20px;

          border: none;

          border-radius: 13px;

          padding:
            13px 20px;

          background:
            linear-gradient(
              135deg,
              #16aa58,
              #07863f
            );

          color: white;

          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 10px 24px
            rgba(14,148,74,.18);

          transition: .25s ease;
        }


        .home-button:hover {

          transform:
            translateY(-2px);

          box-shadow:
            0 15px 28px
            rgba(14,148,74,.25);
        }


        .home-button span {

          margin-left: 7px;
        }


        /* =========================
           FOOTER
        ========================== */

        .policy-footer {

          width:
            min(
              1180px,
              calc(100% - 40px)
            );

          margin: auto;

          padding:
            25px 0 35px;

          border-top:
            1px solid
            #dcebe2;

          display: flex;

          justify-content:
            space-between;

          gap: 20px;

          color: #78887f;

          font-size: 12px;

          position: relative;

          z-index: 2;
        }


        .footer-brand {

          display: flex;

          flex-direction: column;

          gap: 4px;
        }


        .footer-brand strong {

          color: var(--green-dark);

          font-size: 16px;
        }


        /* =========================
           TOP BUTTON
        ========================== */

        .top-button {

          position: fixed;

          right: 22px;

          bottom: 22px;

          width: 44px;

          height: 44px;

          border:
            1px solid
            #bde2cb;

          border-radius: 50%;

          color: white;

          background: var(--green);

          cursor: pointer;

          box-shadow:
            0 10px 25px
            rgba(0,95,46,.2);

          opacity: 0;

          transform:
            translateY(15px);

          pointer-events: none;

          transition: .25s ease;

          z-index: 20;

          font-size: 18px;

          font-weight: 900;
        }


        .top-button.top-visible {

          opacity: 1;

          transform:
            translateY(0);

          pointer-events: auto;
        }


        /* =========================
           ANIMATIONS
        ========================== */

        @keyframes bookFloat {

          0%,100% {

            transform:
              translateY(0)
              rotateX(2deg)
              rotateZ(-1deg);
          }

          50% {

            transform:
              translateY(-14px)
              rotateX(5deg)
              rotateZ(1deg);
          }
        }


        @keyframes shadowPulse {

          0%,100% {

            transform: scale(.95);

            opacity: .7;
          }

          50% {

            transform: scale(1.08);

            opacity: .35;
          }
        }


        @keyframes leftPage {

          0%,100% {
            transform: rotateY(0);
          }

          45%,55% {
            transform: rotateY(7deg);
          }
        }


        @keyframes rightPage {

          0%,100% {
            transform: rotateY(0);
          }

          45%,55% {
            transform: rotateY(-7deg);
          }
        }


        @keyframes fadeUp {

          from {

            opacity: 0;

            transform:
              translateY(18px);
          }

          to {

            opacity: 1;

            transform:
              translateY(0);
          }
        }


        @keyframes cardIn {

          from {

            opacity: 0;

            transform:
              translateY(12px);
          }

          to {

            opacity: 1;

            transform:
              translateY(0);
          }
        }


        /* =========================
           TABLET
        ========================== */

        @media (max-width: 850px) {

          .policy-hero {

            grid-template-columns: 1fr;

            gap: 15px;

            text-align: center;

            padding-top: 15px;
          }


          .hero-book-area {

            height: 230px;
          }


          .hero-book {

            width: 220px;

            height: 150px;
          }


          .book-shadow {

            width: 180px;
          }


          .hero-content {

            margin: auto;
          }


          .trust-label {

            margin: auto;
          }


          .hero-content p {

            margin: auto;
          }


          .policy-card-header {

            flex-direction: column;
          }


          .privacy-badge {

            align-self: flex-start;
          }
        }


        /* =========================
           MOBILE
        ========================== */

        @media (max-width: 620px) {

          .policy-header,
          .policy-main,
          .policy-footer {

            width:
              calc(100% - 24px);
          }


          .policy-header {

            padding: 15px 0;
          }


          .brand-name {

            font-size: 22px;
          }


          .back-button {

            padding:
              8px 11px;
          }


          .policy-hero {

            padding:
              5px
              8px
              38px;

            min-height: auto;
          }


          .hero-book-area {

            height: 195px;
          }


          .hero-book {

            width: 190px;

            height: 130px;
          }


          .hero-content h1 {

            font-size:
              clamp(
                42px,
                13vw,
                58px
              );

            letter-spacing: -3px;
          }


          .hero-content p {

            font-size: 15px;

            line-height: 1.65;
          }


          .policy-card {

            padding: 20px 15px;

            border-radius: 21px;
          }


          .policy-card h2 {

            font-size: 25px;
          }


          .trust-grid {

            grid-template-columns: 1fr;
          }


          .trust-item {

            padding: 15px;
          }


          .notez-promise {

            padding:
              23px
              18px
              23px
              50px;
          }


          .notez-promise p {

            font-size: 15px;
          }


          .policy-footer {

            flex-direction: column;

            padding-bottom: 28px;
          }


          .top-button {

            right: 14px;

            bottom: 14px;
          }
        }


        /* =========================
           REDUCE MOTION
        ========================== */

        @media (prefers-reduced-motion: reduce) {

          .hero-book,
          .book-shadow,
          .hero-left,
          .hero-right,
          .hero-content h1,
          .hero-content p,
          .trust-label,
          .trust-item {

            animation: none !important;
          }
        }

      `}</style>

    </div>
  );
}
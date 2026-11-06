import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/Firebase";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Firebase authentication state — keeps Login / Sign Out synced in real time.
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      closeMenu();
      navigate("/login");
    } catch (error) {
      console.error("NoteZ sign out failed:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`notez-pro-header ${scrolled ? "is-scrolled" : ""}`}>
        {/* Decorative animated background */}
        <div className="header-glow header-glow-one"></div>
        <div className="header-glow header-glow-two"></div>

        <div className="notez-header-inner">

          {/* LOGO */}
          <Link to="/" className="notez-brand" onClick={closeMenu}>
            <span className="notez-brand-icon">
              N
            </span>

            <span className="notez-brand-text">
              NoteZ
              <small>PRO</small>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className={`notez-navigation ${menuOpen ? "open" : ""}`}>
            <Link
              to="/"
              className={location.pathname === "/" ? "active" : ""}
              onClick={closeMenu}
            >
              Home
            </Link>

            <Link
              to="/ai"
              className={location.pathname === "/ai" ? "active" : ""}
              onClick={closeMenu}
            >
              AI
            </Link>

            <Link
              to="/note"
              className={location.pathname === "/note" ? "active" : ""}
              onClick={closeMenu}
            >
              Notes
            </Link>

            <Link
              to="/calender"
              className={location.pathname === "/calender" ? "active" : ""}
              onClick={closeMenu}
            >
              Calendar
            </Link>

            <Link
              to="/task"
              className={location.pathname === "/task" ? "active" : ""}
              onClick={closeMenu}
            >
              Tasks
            </Link>

            <Link
              to="/WORKS"
              className={location.pathname === "/WORKS" ? "active" : ""}
              onClick={closeMenu}
            >
              Workspace
            </Link>

              <Link
              to="/policy"
            className="notez-policy-link"
             aria-label="Read NoteZ Data and Trust Policy"
             onClick={closeMenu}
             >
              NoteZ trusted policy
           </Link>
          </nav>

          {/* RIGHT SIDE */}
          <div className="notez-header-actions">

            {/* PREMIUM BUTTON */}
            <Link
              to="SHOPING"
              className="notez-pro-button"
              onClick={closeMenu}
            >
              <span className="pro-shine"></span>
              <span className="pro-star">✦</span>
              PRO
            </Link>

            {/* AUTH BUTTON — LOGIN WHEN SIGNED OUT, SIGN OUT WHEN LOGGED IN */}
            {authReady && currentUser ? (
              <button
                type="button"
                className="notez-login-button notez-signout-button"
                onClick={handleSignOut}
                title={`Sign out ${currentUser.email || ""}`}
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="notez-login-button"
                onClick={closeMenu}
              >
                Login
              </Link>
            )}

            {/* MOBILE MENU */}
            <button
              className={`notez-menu-button ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

          </div>
        </div>

        {/* BOTTOM SLANTED EDGE */}
        <div className="notez-header-edge"></div>
      </header>

      <style>{`

        /* =========================================================
           NOTEZ PRO PREMIUM HEADER
           Medium / Responsive / Curved + Slanted
        ========================================================= */

        .notez-pro-header {
          --green: #16a34a;
          --green-light: #22c55e;
          --green-dark: #087f3e;
          --green-deep: #063d24;
          --white: #ffffff;

          position: sticky;
          top: 0;
          z-index: 9999;

          width: 100%;
          height: 76px;

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f7fff9 48%,
              #ecfff2 100%
            );

          border-bottom: 1px solid rgba(22,163,74,.12);

          box-shadow:
            0 8px 30px rgba(6,61,36,.08);

          overflow: visible;

          transition:
            height .35s ease,
            box-shadow .35s ease,
            background .35s ease;

          isolation: isolate;
        }

        .notez-pro-header.is-scrolled {
          height: 68px;

          box-shadow:
            0 12px 32px rgba(6,61,36,.13);
        }

        /* =========================================================
           HEADER INNER
        ========================================================= */

        .notez-header-inner {
          position: relative;
          z-index: 5;

          width: min(1400px, calc(100% - 32px));
          height: 100%;

          margin: auto;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 22px;
        }

        /* =========================================================
           LOGO
        ========================================================= */

        .notez-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;

          text-decoration: none;

          min-width: max-content;

          transition:
            transform .25s ease,
            filter .25s ease;
        }

        .notez-brand:hover {
          transform: translateY(-2px);
          filter: drop-shadow(0 8px 15px rgba(22,163,74,.16));
        }

        .notez-brand-icon {
          width: 40px;
          height: 40px;

          display: grid;
          place-items: center;

          border-radius: 13px 7px 13px 7px;

          background:
            linear-gradient(
              145deg,
              #22c55e,
              #0b8f45
            );

          color: white;

          font-size: 19px;
          font-weight: 950;

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.45),
            0 8px 20px rgba(22,163,74,.22);

          transform: rotate(-3deg);

          transition: .3s ease;
        }

        .notez-brand:hover .notez-brand-icon {
          transform:
            rotate(0deg)
            scale(1.06);
        }

        .notez-brand-text {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #073d25;

          font-size: 21px;
          line-height: 1;

          font-weight: 950;
          letter-spacing: -1px;
        }

        .notez-brand-text small {
          padding: 4px 7px;

          border-radius: 999px;

          background: #e0f9e8;
          color: #087f3e;

          font-size: 8px;
          font-weight: 950;

          letter-spacing: 1.2px;

          border: 1px solid rgba(22,163,74,.12);
        }

        /* =========================================================
           NAVIGATION
        ========================================================= */

        .notez-navigation {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 4px;

          margin-left: auto;
        }

        .notez-navigation a {
          position: relative;

          padding: 9px 12px;

          color: #466355;

          text-decoration: none;

          font-size: 12px;
          font-weight: 750;

          border-radius: 10px;

          transition:
            color .25s ease,
            background .25s ease,
            transform .25s ease;
        }

        .notez-navigation a::after {
          content: "";

          position: absolute;

          left: 50%;
          bottom: 4px;

          width: 0;
          height: 2px;

          border-radius: 10px;

          background: linear-gradient(
            90deg,
            #16a34a,
            #4ade80
          );

          transform: translateX(-50%);

          transition: width .25s ease;
        }

        .notez-navigation a:hover {
          color: #087f3e;
          background: #edfff3;

          transform: translateY(-1px);
        }

        .notez-navigation a:hover::after,
        .notez-navigation a.active::after {
          width: 22px;
        }

        .notez-navigation a.active {
          color: #087f3e;
          background: #effcf3;
        }

        /* =========================================================
           ACTIONS
        ========================================================= */

        .notez-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          min-width: max-content;
        }

        /* =========================================================
           PRO BUTTON
        ========================================================= */

        .notez-pro-button {
          position: relative;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 5px;

          height: 36px;
          padding: 0 14px;

          border-radius: 11px;

          overflow: hidden;

          text-decoration: none;

          color: white;

          font-size: 10px;
          font-weight: 950;

          letter-spacing: 1px;

          background:
            linear-gradient(
              135deg,
              #19b653,
              #087f3e
            );

          border: 1px solid rgba(255,255,255,.18);

          box-shadow:
            0 8px 20px rgba(22,163,74,.23),
            inset 0 1px 0 rgba(255,255,255,.28);

          transition:
            transform .25s ease,
            box-shadow .25s ease;
        }

        .notez-pro-button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 12px 26px rgba(22,163,74,.31),
            inset 0 1px 0 rgba(255,255,255,.35);
        }

        .notez-pro-button:active {
          transform: translateY(0) scale(.97);
        }

        .pro-star {
          font-size: 13px;

          animation:
            proStar 2.2s ease-in-out infinite;
        }

        @keyframes proStar {

          0%,100% {
            transform: rotate(0deg) scale(1);
          }

          50% {
            transform: rotate(15deg) scale(1.18);
          }

        }

        .pro-shine {
          position: absolute;

          top: 0;
          left: -80px;

          width: 45px;
          height: 100%;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.45),
              transparent
            );

          transform: skewX(-20deg);

          animation:
            proShine 4s infinite;
        }

        @keyframes proShine {

          0% {
            left: -80px;
          }

          35%,100% {
            left: 130%;
          }

        }

        /* =========================================================
           LOGIN
        ========================================================= */

        .notez-login-button {
          height: 34px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          padding: 0 13px;

          border-radius: 10px;

          border: 1px solid #d8ebdf;

          background: rgba(255,255,255,.8);

          color: #315545;

          text-decoration: none;

          font-size: 10px;
          font-weight: 850;

          transition: .25s ease;
        }

        .notez-login-button:hover {
          background: #effcf3;
          border-color: #a7e5ba;

          color: #087f3e;

          transform: translateY(-1px);
        }

        /* =========================================================
           DECORATIVE GLOW
        ========================================================= */

        .header-glow {
          position: absolute;

          pointer-events: none;

          border-radius: 50%;

          filter: blur(25px);

          opacity: .35;

          z-index: -1;
        }

        .header-glow-one {
          width: 130px;
          height: 130px;

          right: 16%;

          top: -90px;

          background: #86efac;

          animation:
            headerGlowOne 7s ease-in-out infinite;
        }

        .header-glow-two {
          width: 100px;
          height: 100px;

          left: 28%;

          bottom: -80px;

          background: #bbf7d0;

          animation:
            headerGlowTwo 8s ease-in-out infinite;
        }

        @keyframes headerGlowOne {

          0%,100% {
            transform: translate(0,0);
          }

          50% {
            transform: translate(-20px,20px);
          }

        }

        @keyframes headerGlowTwo {

          0%,100% {
            transform: translate(0,0);
          }

          50% {
            transform: translate(20px,-15px);
          }

        }

        /* =========================================================
           CURVED / SLANTED BOTTOM EDGE
        ========================================================= */

        .notez-header-edge {
          position: absolute;

          z-index: 4;

          left: -2%;
          bottom: -17px;

          width: 104%;
          height: 30px;

          background: #ffffff;

          border-radius:
            50% 50% 0 0 /
            100% 100% 0 0;

          transform:
            rotate(-.35deg);

          box-shadow:
            0 -4px 10px rgba(6,61,36,.025);

          pointer-events: none;
        }

        /* =========================================================
           MOBILE MENU BUTTON
        ========================================================= */

        .notez-menu-button {
          width: 37px;
          height: 35px;

          display: none;

          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 4px;

          border: 1px solid #d8ebdf;
          border-radius: 10px;

          background: white;

          cursor: pointer;

          transition: .25s ease;
        }

        .notez-menu-button span {
          width: 16px;
          height: 2px;

          border-radius: 10px;

          background: #087f3e;

          transition: .25s ease;
        }

        .notez-menu-button:hover {
          background: #effcf3;
          transform: translateY(-1px);
        }

        .notez-menu-button.active span:nth-child(1) {
          transform:
            translateY(6px)
            rotate(45deg);
        }

        .notez-menu-button.active span:nth-child(2) {
          opacity: 0;
        }

        .notez-menu-button.active span:nth-child(3) {
          transform:
            translateY(-6px)
            rotate(-45deg);
        }

        /* =========================================================
           TABLET & MOBILE BREAKPOINTS (FULL RESPONSIVE MENU)
        ========================================================= */

        @media (max-width: 950px) {

          .notez-menu-button {
            display: flex !important;
          }

          .notez-navigation {
            position: absolute !important;
            top: 74px !important;
            left: 16px !important;
            right: 16px !important;
            width: auto !important;

            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;

            padding: 14px !important;
            gap: 6px !important;

            border: 1px solid rgba(22, 163, 74, 0.2) !important;
            border-radius: 18px !important;

            background: rgba(255, 255, 255, 0.98) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;

            box-shadow: 0 20px 50px rgba(6, 61, 36, 0.18) !important;

            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;

            transform: translateY(-12px) scale(0.98) !important;
            transform-origin: top !important;

            transition: 
              opacity 0.25s ease,
              transform 0.25s ease,
              visibility 0.25s ease !important;
            
            z-index: 10000 !important;
          }

          .notez-navigation.open {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;

            transform: translateY(0) scale(1) !important;
          }

          .notez-navigation a {
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 12px 14px !important;
            border-radius: 12px !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            text-align: left !important;
          }

          .notez-navigation a::after {
            display: none !important;
          }

        }

        /* =========================================================
           SMALL PHONES
        ========================================================= */

        @media (max-width: 480px) {

          .notez-pro-header {
            height: 68px;
          }

          .notez-header-inner {
            width: calc(100% - 16px);
          }

          .notez-brand-text small {
            display: none;
          }

          .notez-brand-text {
            font-size: 17px;
          }

          .notez-brand-icon {
            width: 34px;
            height: 34px;
          }

          .notez-pro-button {
            padding: 0 9px;
            font-size: 9px;
          }

          .notez-login-button {
            padding: 0 10px;
            font-size: 9px;
          }

        }

        /* =========================================================
           AUTH BUTTON
           Same existing header style — only adds button reset + feedback.
        ========================================================= */

        .notez-signout-button {
          cursor: pointer;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .notez-signout-button:active {
          transform: translateY(0) scale(.97);
        }

        /* =========================================================
           REDUCE MOTION
        ========================================================= */

        @media (prefers-reduced-motion: reduce) {

          .notez-pro-header *,
          .notez-pro-header *::before,
          .notez-pro-header *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }

        }

      `}</style>
    </>
  );
}
import React from "react";
import { Link } from "react-router-dom";
import {
  FaLeaf,
  FaArrowUp,
  FaCircle
} from "react-icons/fa";

const Footer = () => {

  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <footer className="notez-footer-wrapper">

      <style>{`

        /* =====================================================
           NOTEZ PRO FOOTER
           GREEN / BLACK FUTURISTIC
           ===================================================== */

        .notez-footer-wrapper {
          position: relative;

          overflow: hidden;

          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(34,197,94,.12),
              transparent 28%
            ),

            radial-gradient(
              circle at 85% 80%,
              rgba(16,185,129,.08),
              transparent 30%
            ),

            linear-gradient(
              180deg,
              #020604 0%,
              #031109 50%,
              #020604 100%
            );

          border-top:
            1px solid
            rgba(74,222,128,.16);

          padding:
            55px 20px 22px;

          color: white;

          font-family:
            Inter,
            Poppins,
            system-ui,
            sans-serif;

          isolation: isolate;
        }

        /* animated top line */

        .notez-footer-wrapper::before {
          content: "";

          position: absolute;

          top: 0;
          left: 0;

          width: 100%;
          height: 2px;

          background:
            linear-gradient(
              90deg,
              transparent,
              #16a34a,
              #4ade80,
              #86efac,
              #16a34a,
              transparent
            );

          background-size: 200% 100%;

          animation:
            footerScan 5s linear infinite;
        }

        @keyframes footerScan {

          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }

        }

        /* =====================================================
           FLOATING LIGHTS
           ===================================================== */

        .notez-footer-glow {
          position: absolute;

          width: 220px;
          height: 220px;

          border-radius: 50%;

          background:
            rgba(34,197,94,.08);

          filter: blur(45px);

          pointer-events: none;

          animation:
            footerFloat 7s ease-in-out infinite;
        }

        .notez-footer-glow.one {
          top: -100px;
          left: 5%;
        }

        .notez-footer-glow.two {
          right: 5%;
          bottom: -130px;

          background:
            rgba(16,185,129,.07);

          animation-delay:
            -3s;
        }

        @keyframes footerFloat {

          0%,100% {
            transform:
              translate3d(0,0,0)
              scale(1);
          }

          50% {
            transform:
              translate3d(0,-18px,0)
              scale(1.08);
          }

        }

        /* =====================================================
           FOOTER CONTAINER
           ===================================================== */

        .notez-footer-container {
          position: relative;

          z-index: 5;

          max-width: 1250px;

          margin: 0 auto;

          padding: 28px;

          display: grid;

          grid-template-columns:
            1.2fr
            1fr
            1fr;

          gap: 45px;

          border:
            1px solid
            rgba(74,222,128,.12);

          border-radius: 24px;

          background:
            rgba(4,15,9,.72);

          backdrop-filter:
            blur(20px);

          -webkit-backdrop-filter:
            blur(20px);

          box-shadow:
            0 25px 80px
            rgba(0,0,0,.42);

        }

        /* =====================================================
           BRAND
           ===================================================== */

        .notez-footer-brand {
          display: inline-flex;

          align-items: center;

          gap: 10px;

          width: fit-content;

          color: white;

          text-decoration: none;

          font-size: 1.4rem;

          font-weight: 950;

          letter-spacing: -.5px;

          transition:
            transform .22s ease,
            filter .22s ease;
        }

        .notez-footer-brand:hover {
          transform:
            translateY(-3px);

          filter:
            drop-shadow(
              0 0 13px
              rgba(74,222,128,.65)
            );
        }

        .notez-footer-brand svg {
          color: #4ade80;

          filter:
            drop-shadow(
              0 0 8px
              rgba(74,222,128,.45)
            );

          animation:
            footerLeaf 3s ease-in-out infinite;
        }

        @keyframes footerLeaf {

          0%,100% {
            transform:
              rotate(0deg);
          }

          50% {
            transform:
              rotate(-7deg)
              translateY(-2px);
          }

        }

        .notez-footer-description {
          margin-top: 13px;

          max-width: 330px;

          color: #81958a;

          font-size: .78rem;

          line-height: 1.7;
        }

        .notez-footer-status {
          display: inline-flex;

          align-items: center;

          gap: 7px;

          margin-top: 17px;

          padding:
            7px 10px;

          border-radius: 999px;

          border:
            1px solid
            rgba(74,222,128,.15);

          background:
            rgba(34,197,94,.06);

          color: #86efac;

          font-size: .65rem;

          font-weight: 800;

          letter-spacing: .5px;
        }

        .notez-footer-status-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background:
            #4ade80;

          box-shadow:
            0 0 10px
            rgba(74,222,128,.9);

          animation:
            footerPulse 1.7s ease-in-out infinite;
        }

        @keyframes footerPulse {

          0%,100% {
            opacity: .45;
            transform: scale(.75);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }

        }

        /* =====================================================
           FOOTER COLUMNS
           ===================================================== */

        .notez-footer-column-title {
          margin: 0 0 15px;

          color: white;

          font-size: .78rem;

          font-weight: 900;

          letter-spacing: 1px;

          text-transform: uppercase;
        }

        .notez-footer-links {
          display: grid;

          gap: 9px;

          list-style: none;

          margin: 0;
          padding: 0;
        }

        .notez-footer-link {
          position: relative;

          display: inline-flex;

          align-items: center;

          width: fit-content;

          color: #84998d;

          text-decoration: none;

          font-size: .78rem;

          transition:
            color .2s ease,
            transform .2s ease;
        }

        .notez-footer-link::before {
          content: "";

          width: 0;
          height: 1px;

          margin-right: 0;

          background:
            #4ade80;

          transition:
            width .2s ease,
            margin-right .2s ease;
        }

        .notez-footer-link:hover {
          color: #86efac;

          transform:
            translateX(4px);
        }

        .notez-footer-link:hover::before {
          width: 10px;

          margin-right: 6px;
        }

        /* =====================================================
           JOIN US
           ===================================================== */

        .notez-footer-join {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          padding:
            10px 15px;

          margin-top: 4px;

          border:
            1px solid
            rgba(74,222,128,.22);

          border-radius: 11px;

          color: #d8ffe5;

          text-decoration: none;

          background:
            linear-gradient(
              135deg,
              rgba(34,197,94,.16),
              rgba(6,78,59,.25)
            );

          font-size: .75rem;

          font-weight: 900;

          letter-spacing: .7px;

          transition:
            all .22s ease;
        }

        .notez-footer-join:hover {
          transform:
            translateY(-3px);

          color: white;

          border-color:
            rgba(74,222,128,.5);

          box-shadow:
            0 10px 28px
            rgba(34,197,94,.14);
        }

        /* =====================================================
           BOTTOM BAR
           ===================================================== */

        .notez-footer-bottom {
          position: relative;

          z-index: 5;

          max-width: 1250px;

          margin:
            20px auto 0;

          padding-top: 18px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;

          border-top:
            1px solid
            rgba(74,222,128,.09);
        }

        .notez-footer-copy {
          color: #66786e;

          font-size: .7rem;
        }

        .notez-footer-made {
          color: #607268;

          font-size: .68rem;

          display: flex;

          align-items: center;

          gap: 5px;
        }

        .notez-footer-made span {
          color: #4ade80;
        }

        /* =====================================================
           TOP BUTTON
           ===================================================== */

        .notez-footer-top {
          width: 37px;
          height: 37px;

          display: flex;

          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(74,222,128,.16);

          border-radius: 10px;

          background:
            rgba(34,197,94,.07);

          color: #86efac;

          cursor: pointer;

          transition:
            all .22s ease;
        }

        .notez-footer-top:hover {
          transform:
            translateY(-4px);

          background:
            rgba(34,197,94,.15);

          color: white;

          box-shadow:
            0 10px 25px
            rgba(34,197,94,.14);
        }

        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 850px) {

          .notez-footer-container {
            grid-template-columns:
              1fr 1fr;

            gap: 30px;
          }

          .notez-footer-brand-area {
            grid-column: 1 / -1;
          }

        }

        @media (max-width: 600px) {

          .notez-footer-wrapper {
            padding:
              35px 12px 18px;
          }

          .notez-footer-container {
            grid-template-columns: 1fr;

            gap: 25px;

            padding: 22px;

            border-radius: 19px;
          }

          .notez-footer-brand-area {
            grid-column: auto;
          }

          .notez-footer-bottom {
            flex-direction: column;

            text-align: center;
          }

          .notez-footer-top {
            width: 35px;
            height: 35px;
          }

        }

        @media (prefers-reduced-motion: reduce) {

          .notez-footer-wrapper *,
          .notez-footer-wrapper::before {
            animation: none !important;
            transition: none !important;
          }

        }

      `}</style>

      {/* animated background */}
      <div className="notez-footer-glow one" />
      <div className="notez-footer-glow two" />

      <div className="notez-footer-container">

        {/* ===================================================
            BRAND
            =================================================== */}

        <div className="notez-footer-brand-area">

          <Link
            to="/"
            className="notez-footer-brand"
          >
            <FaLeaf />

            <span>
              NoteZ
            </span>
          </Link>

          <p className="notez-footer-description">
            Smart productivity tools designed to
            make student workflows simpler,
            faster and more organized.
          </p>

          <div className="notez-footer-status">

            <span
              className="notez-footer-status-dot"
            />

            NoteZ systems active

          </div>

        </div>

        {/* ===================================================
            EXPLORE
            =================================================== */}

        <div>

          <h4 className="notez-footer-column-title">
            Explore
          </h4>

          <ul className="notez-footer-links">

            <li>
              <Link
                to="/about"
                className="notez-footer-link"
              >
                About
              </Link>
            </li>

            <li>
              <Link
                to="/contact"
                className="notez-footer-link"
              >
                Feedback
              </Link>
            </li>

             <li>
                           <Link
                             to="/policy"
                           className="notez-policy-link"
                            aria-label="Read NoteZ Data and Trust Policy"
                            >
                             NoteZ trusted policy
                          </Link>
            </li>


            <li>
              <Link
                to="/D"
                className="notez-footer-link"
              >
                Explore Tools
              </Link>
            </li>

          </ul>

        </div>

        {/* ===================================================
            COMMUNITY
            =================================================== */}

        <div>

          <h4 className="notez-footer-column-title">
            Community
          </h4>

          <ul className="notez-footer-links">

            <li>
              <Link
                to="/Join"
                className="notez-footer-join"
              >
                JOIN US
              </Link>
            </li>

          </ul>

        </div>

      </div>

      {/* =====================================================
          BOTTOM
          ===================================================== */}

      <div className="notez-footer-bottom">

        <div className="notez-footer-copy">
          © 2026 NoteZ. All Rights Reserved.
        </div>

        <div className="notez-footer-made">

          Built for students
          <span>
            ●
          </span>
          built with NoteZ

        </div>

        <button
          className="notez-footer-top"
          onClick={scrollTop}
          aria-label="Back to top"
        >
          <FaArrowUp size={13} />
        </button>

      </div>

    </footer>
  );
};

export default Footer;
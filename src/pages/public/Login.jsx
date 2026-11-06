import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { app } from "../../firebase/Firebase";

/*
  NOTEZ LOGIN PAGE
  - Login page only (NOT signup)
  - No Header / Footer
  - No image dependency
  - Firebase import matches:
      src/firebase/firebase.js
  - Existing login functionality is preserved:
      Google login
      Email + password login
      Forgot password link
      Signup navigation
*/

const auth = getAuth(app);

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");

  const showMessage = (text) => {
    setMessage(text);
    window.clearTimeout(window.__notezLoginToastTimer);
    window.__notezLoginToastTimer = window.setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      showMessage("Login successful.");
      setTimeout(() => navigate("/"), 500);
    } catch (error) {
      let text = "Unable to login. Please try again.";

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/user-not-found"
      ) {
        text = "Email or password is incorrect.";
      } else if (error?.code === "auth/too-many-requests") {
        text = "Too many attempts. Please try again later.";
      } else if (error?.code === "auth/invalid-email") {
        text = "Please enter a valid email address.";
      }

      showMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);

      showMessage("Google login successful.");
      setTimeout(() => navigate("/"), 500);
    } catch (error) {
      if (error?.code === "auth/popup-closed-by-user") {
        showMessage("Google login was cancelled.");
      } else if (error?.code === "auth/popup-blocked") {
        showMessage("Please allow the Google login popup in your browser.");
      } else {
        showMessage("Google login failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          min-height: 100%;
          margin: 0;
        }

        body {
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #eefaf4;
        }

        .notez-login-page {
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          background:
            radial-gradient(circle at 12% 15%, rgba(25, 190, 117, .16), transparent 28%),
            radial-gradient(circle at 90% 80%, rgba(38, 205, 132, .13), transparent 30%),
            linear-gradient(135deg, #effcf6 0%, #e5f7ee 48%, #f7fffb 100%);
        }

        .notez-login-page::before,
        .notez-login-page::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(3px);
          animation: notezFloat 8s ease-in-out infinite;
        }

        .notez-login-page::before {
          width: 280px;
          height: 280px;
          left: -100px;
          top: 8%;
          background: rgba(10, 167, 91, .08);
        }

        .notez-login-page::after {
          width: 360px;
          height: 360px;
          right: -130px;
          bottom: -120px;
          background: rgba(29, 190, 113, .10);
          animation-delay: -3s;
        }

        .notez-login-shell {
          width: min(1040px, 100%);
          min-height: 620px;
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 43%) minmax(0, 57%);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.85);
          border-radius: 34px;
          background: rgba(255,255,255,.76);
          box-shadow:
            0 35px 90px rgba(14, 76, 48, .15),
            0 10px 30px rgba(14, 76, 48, .07);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          animation: notezAppear .7s cubic-bezier(.2,.8,.2,1);
        }

        .notez-brand-panel {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 55px 42px;
          color: white;
          background:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,.17), transparent 22%),
            radial-gradient(circle at 85% 80%, rgba(111,255,181,.15), transparent 30%),
            linear-gradient(145deg, #08764a 0%, #07965b 52%, #12b874 100%);
        }

        .notez-brand-panel::before {
          content: "";
          position: absolute;
          width: 300px;
          height: 300px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 50%;
          right: -150px;
          top: -90px;
          animation: notezOrbit 12s linear infinite;
        }

        .notez-brand-panel::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 50%;
          left: -130px;
          bottom: -100px;
          animation: notezOrbit 10s linear infinite reverse;
        }

        .notez-brand-content {
          width: 100%;
          max-width: 360px;
          position: relative;
          z-index: 2;
          text-align: left;
        }

        .notez-logo-mark {
          width: 82px;
          height: 82px;
          display: grid;
          place-items: center;
          border-radius: 24px;
          margin-bottom: 28px;
          font-size: 36px;
          font-weight: 950;
          letter-spacing: -3px;
          color: white;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.25);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.2),
            0 18px 40px rgba(0,0,0,.14);
          animation: notezSoftPulse 3.4s ease-in-out infinite;
        }

        .notez-brand-content h1 {
          margin: 0;
          font-size: clamp(42px, 5vw, 62px);
          line-height: .95;
          letter-spacing: -3px;
          font-weight: 950;
        }

        .notez-brand-content h1 span {
          opacity: .72;
        }

        .notez-brand-content p {
          margin: 18px 0 0;
          max-width: 330px;
          color: rgba(255,255,255,.82);
          font-size: 17px;
          line-height: 1.65;
          font-weight: 500;
        }

        .notez-brand-line {
          width: 72px;
          height: 4px;
          margin-top: 28px;
          border-radius: 999px;
          background: rgba(255,255,255,.85);
          animation: notezLine 2.6s ease-in-out infinite;
        }

        .notez-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px clamp(30px, 6vw, 78px);
          background: rgba(255,255,255,.90);
        }

        .notez-form {
          width: min(440px, 100%);
        }

        .notez-form-top {
          margin-bottom: 28px;
        }

        .notez-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          margin-bottom: 15px;
          border-radius: 999px;
          color: #08784b;
          background: #e9faf1;
          border: 1px solid #cceedd;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }

        .notez-kicker i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #08a866;
          box-shadow: 0 0 0 5px rgba(8,168,102,.10);
          animation: notezBlink 1.7s ease-in-out infinite;
        }

        .notez-form h2 {
          margin: 0;
          color: #10271d;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.05;
          letter-spacing: -1.8px;
          font-weight: 900;
        }

        .notez-form-subtitle {
          margin: 11px 0 0;
          color: #72867c;
          font-size: 14px;
          line-height: 1.6;
        }

        .notez-google {
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
          border: 1px solid #dfeae4;
          border-radius: 14px;
          background: white;
          color: #263a31;
          font-weight: 800;
          cursor: pointer;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }

        .notez-google:hover {
          transform: translateY(-2px);
          border-color: #9bd8b9;
          box-shadow: 0 12px 28px rgba(15, 110, 68, .10);
        }

        .notez-google:disabled {
          opacity: .65;
          cursor: wait;
          transform: none;
        }

        .notez-google-icon {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 950;
        }

        .notez-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: #9aaaA2;
          font-size: 11px;
          font-weight: 800;
        }

        .notez-divider::before,
        .notez-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #e3ece7;
        }

        .notez-field {
          margin-bottom: 17px;
        }

        .notez-field label {
          display: block;
          margin-bottom: 7px;
          color: #30453c;
          font-size: 12px;
          font-weight: 850;
        }

        .notez-input-wrap {
          position: relative;
        }

        .notez-input {
          width: 100%;
          height: 51px;
          padding: 0 15px;
          border: 1px solid #dce8e2;
          border-radius: 13px;
          outline: none;
          color: #183027;
          background: #fbfefd;
          font: inherit;
          font-size: 14px;
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .notez-input.password {
          padding-right: 48px;
        }

        .notez-input::placeholder {
          color: #a0aea8;
        }

        .notez-input:focus {
          background: white;
          border-color: #20a968;
          box-shadow: 0 0 0 4px rgba(20,170,101,.10);
        }

        .notez-password-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #779086;
          cursor: pointer;
          font-size: 16px;
        }

        .notez-password-toggle:hover {
          background: #eefaf4;
          color: #078b55;
        }

        .notez-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin: -4px 0 18px;
        }

        .notez-link {
          border: 0;
          background: transparent;
          color: #078c56;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
        }

        .notez-link:hover {
          text-decoration: underline;
        }

        .notez-login-button {
          width: 100%;
          min-height: 53px;
          border: 0;
          border-radius: 15px;
          color: white;
          background: linear-gradient(135deg, #07894f, #0db96f);
          box-shadow: 0 13px 28px rgba(8, 146, 82, .24);
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform .22s ease, box-shadow .22s ease;
        }

        .notez-login-button::after {
          content: "";
          position: absolute;
          top: 0;
          left: -90px;
          width: 70px;
          height: 100%;
          transform: skewX(-18deg);
          background: rgba(255,255,255,.28);
          animation: notezShine 3.4s ease-in-out infinite;
        }

        .notez-login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(8, 146, 82, .30);
        }

        .notez-login-button:disabled {
          opacity: .65;
          cursor: wait;
          transform: none;
        }

        .notez-bottom {
          margin-top: 22px;
          text-align: center;
          color: #788b82;
          font-size: 13px;
        }

        .notez-bottom a {
          color: #087e4e;
          font-weight: 900;
          text-decoration: none;
        }

        .notez-bottom a:hover {
          text-decoration: underline;
        }

        .notez-toast {
          position: fixed;
          z-index: 50;
          left: 50%;
          bottom: 26px;
          transform: translate(-50%, 20px);
          width: min(420px, calc(100% - 30px));
          padding: 13px 16px;
          border: 1px solid rgba(255,255,255,.8);
          border-radius: 14px;
          color: #16362a;
          background: rgba(255,255,255,.94);
          box-shadow: 0 18px 45px rgba(15, 74, 48, .18);
          backdrop-filter: blur(16px);
          font-size: 13px;
          font-weight: 750;
          opacity: 0;
          pointer-events: none;
          transition: .28s ease;
        }

        .notez-toast.show {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        @keyframes notezAppear {
          from { opacity: 0; transform: translateY(18px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes notezFloat {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-18px,0); }
        }

        @keyframes notezOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes notezSoftPulse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes notezLine {
          0%, 100% { width: 55px; opacity: .65; }
          50% { width: 95px; opacity: 1; }
        }

        @keyframes notezBlink {
          0%, 100% { opacity: .55; }
          50% { opacity: 1; }
        }

        @keyframes notezShine {
          0%, 35% { left: -90px; }
          70%, 100% { left: 120%; }
        }

        @media (max-width: 820px) {
          .notez-login-page {
            padding: 18px;
            overflow: auto;
          }

          .notez-login-shell {
            min-height: auto;
            grid-template-columns: 1fr;
            border-radius: 27px;
          }

          .notez-brand-panel {
            min-height: 255px;
            padding: 35px 30px;
          }

          .notez-brand-content {
            text-align: center;
          }

          .notez-logo-mark {
            width: 65px;
            height: 65px;
            margin: 0 auto 17px;
            border-radius: 19px;
            font-size: 29px;
          }

          .notez-brand-content h1 {
            font-size: 40px;
          }

          .notez-brand-content p {
            margin-left: auto;
            margin-right: auto;
            font-size: 14px;
          }

          .notez-brand-line {
            margin: 20px auto 0;
          }

          .notez-form-panel {
            padding: 34px 24px 38px;
          }
        }

        @media (max-width: 480px) {
          .notez-login-page {
            padding: 10px;
          }

          .notez-login-shell {
            border-radius: 22px;
          }

          .notez-brand-panel {
            min-height: 215px;
            padding: 28px 20px;
          }

          .notez-brand-content h1 {
            font-size: 35px;
            letter-spacing: -2px;
          }

          .notez-brand-content p {
            margin-top: 10px;
            font-size: 13px;
          }

          .notez-form-panel {
            padding: 29px 18px 31px;
          }

          .notez-form h2 {
            font-size: 30px;
          }

          .notez-google,
          .notez-login-button,
          .notez-input {
            min-height: 50px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .notez-login-page *,
          .notez-login-page::before,
          .notez-login-page::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }
        }
      `}</style>

      <main className="notez-login-page">
        <section className="notez-login-shell">
          <aside className="notez-brand-panel">
            <div className="notez-brand-content">
              <div className="notez-logo-mark">Nz</div>
              <h1>Note<span>Z</span></h1>
              <p>
                Your digital student workspace for notes,
                tasks, planning and focused productivity.
              </p>
              <div className="notez-brand-line" />
            </div>
          </aside>

          <section className="notez-form-panel">
            <form className="notez-form" onSubmit={handleLogin}>
              <div className="notez-form-top">
                <div className="notez-kicker">
                  <i />
                  NoteZ Pro
                </div>

                <h2>Welcome back</h2>
                <p className="notez-form-subtitle">
                  Sign in to continue to your personal workspace.
                </p>
              </div>

              <button
                type="button"
                className="notez-google"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                <span className="notez-google-icon">G</span>
                {googleLoading ? "Signing in..." : "Continue with Google"}
              </button>

              <div className="notez-divider">
                <span>OR</span>
              </div>

              <div className="notez-field">
                <label htmlFor="notez-email">Email Address</label>
                <input
                  id="notez-email"
                  className="notez-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="notez-field">
                <label htmlFor="notez-password">Password</label>

                <div className="notez-input-wrap">
                  <input
                    id="notez-password"
                    className="notez-input password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="notez-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              <div className="notez-forgot-row">
                <Link className="notez-link" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <button
                className="notez-login-button"
                type="submit"
                disabled={loading || googleLoading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>

              <div className="notez-bottom">
  <div>
    Don't have an account?{" "}
    <Link to="/signup">Create an account</Link>
  </div>

  <Link
    to="/policy"
    className="notez-policy-link"
    aria-label="Read NoteZ Data and Trust Policy"
  >
    NoteZ — Your Data, Your Trust
  </Link>
</div>
            </form>
          </section>
        </section>

        <div className={`notez-toast ${message ? "show" : ""}`}>
          {message}
        </div>
      </main>
    </>
  );
}

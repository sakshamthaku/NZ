import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/Firebase";

function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Kept from the existing code so other code depending on this state is not broken.
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const existingUser = localStorage.getItem("currentUser");

    if (existingUser) {
      toast.warn(
        "You are currently signed in. Log out first to create a new account."
      );
    }
  }, []);

  const handleSignup = useCallback(
    async (e) => {
      e.preventDefault();

      if (
        !username.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        toast.error("Please fill all fields");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      setLoading(true);

      try {
        // Create account in Firebase Authentication.
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        const user = userCredential.user;

        // Save the user's profile in Firestore.
        await setDoc(doc(db, "users", user.uid), {
          username: username.trim(),
          email: email.trim(),
          role: "user",
          createdAt: new Date().toISOString(),
          status: "Active",
        });

        toast.success("Account Created Successfully");

        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } catch (error) {
        console.error("Signup error:", error);

        switch (error?.code) {
          case "auth/email-already-in-use":
            toast.error("Email already exists");
            break;

          case "auth/invalid-email":
            toast.error("Invalid email address");
            break;

          case "auth/weak-password":
            toast.error("Password should be at least 6 characters");
            break;

          case "auth/network-request-failed":
            toast.error("Network error. Please check your internet connection.");
            break;

          default:
            toast.error(error?.message || "Failed to create account");
            break;
        }
      } finally {
        setLoading(false);
      }
    },
    [username, email, password, confirmPassword, navigate]
  );

  return (
    <div className="notez-signup-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .notez-signup-page {
          --nz-green: #08a968;
          --nz-green-2: #12b978;
          --nz-green-dark: #087a4e;
          --nz-line: #d9eee4;
          --nz-text: #102a20;
          --nz-muted: #71847c;

          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 28px;

          color: var(--nz-text);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          background:
            radial-gradient(
              circle at 8% 10%,
              rgba(16, 185, 129, 0.19),
              transparent 28%
            ),
            radial-gradient(
              circle at 92% 90%,
              rgba(8, 169, 104, 0.16),
              transparent 30%
            ),
            linear-gradient(135deg, #eefbf5 0%, #fbfffd 48%, #e8f8ef 100%);
        }

        .notez-signup-page *,
        .notez-signup-page *::before,
        .notez-signup-page *::after {
          box-sizing: border-box;
        }

        .nz-background-ring {
          position: absolute;
          width: 470px;
          height: 470px;
          left: -220px;
          top: -220px;
          border-radius: 50%;
          border: 1px solid rgba(8, 169, 104, 0.13);
          box-shadow:
            0 0 0 34px rgba(8, 169, 104, 0.035),
            0 0 0 70px rgba(8, 169, 104, 0.025);
          animation: nzRingRotate 16s linear infinite;
          pointer-events: none;
        }

        .nz-background-orb {
          position: absolute;
          width: 360px;
          height: 360px;
          right: -160px;
          bottom: -170px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.20),
            transparent 68%
          );
          filter: blur(8px);
          animation: nzOrbFloat 7s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes nzRingRotate {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes nzOrbFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-18px, -15px, 0);
          }
        }

        .nz-signup-shell {
          position: relative;
          z-index: 2;
          width: min(1080px, 100%);
          min-height: min(690px, calc(100vh - 56px));

          display: grid;
          grid-template-columns: minmax(0, 46%) minmax(0, 54%);

          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 32px;

          background: rgba(255, 255, 255, 0.73);

          box-shadow:
            0 40px 100px rgba(18, 84, 56, 0.16),
            0 14px 38px rgba(18, 84, 56, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);

          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);

          animation: nzShellIn 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes nzShellIn {
          from {
            opacity: 0;
            transform: translateY(22px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .nz-brand-panel {
          position: relative;
          min-width: 0;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 50px;
          color: white;

          background:
            radial-gradient(
              circle at 15% 14%,
              rgba(255, 255, 255, 0.18),
              transparent 24%
            ),
            radial-gradient(
              circle at 88% 86%,
              rgba(0, 58, 36, 0.22),
              transparent 35%
            ),
            linear-gradient(145deg, #08764c 0%, #079a60 52%, #0ab878 100%);
        }

        .nz-brand-panel::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow:
            0 0 0 34px rgba(255, 255, 255, 0.035),
            0 0 0 70px rgba(255, 255, 255, 0.025);
          animation: nzBrandRing 12s linear infinite;
        }

        .nz-brand-panel::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          right: -70px;
          top: -70px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.07);
          filter: blur(4px);
        }

        @keyframes nzBrandRing {
          to {
            transform: rotate(360deg);
          }
        }

        .nz-brand-content {
          position: relative;
          z-index: 2;
          width: min(100%, 420px);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .nz-brand-logo {
          width: 84px;
          height: 84px;
          display: grid;
          place-items: center;
          margin-bottom: 22px;
          border-radius: 24px;
          color: white;
          font-size: 31px;
          font-weight: 950;
          letter-spacing: -2px;
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow:
            0 20px 48px rgba(0, 50, 31, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.30);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          animation: nzLogoFloat 3.8s ease-in-out infinite;
        }

        @keyframes nzLogoFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-7px) rotate(1deg);
          }
        }

        .nz-brand-content h1 {
          margin: 0;
          font-size: clamp(38px, 5vw, 56px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -3px;
          text-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        }

        .nz-pro-pill {
          display: inline-flex;
          align-items: center;
          margin-left: 9px;
          padding: 6px 10px;
          vertical-align: middle;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #d9ffed;
          background: rgba(255, 255, 255, 0.12);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .nz-brand-content p {
          max-width: 360px;
          margin: 16px 0 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 15px;
          line-height: 1.65;
        }

        .nz-feature-list {
          width: min(330px, 100%);
          display: grid;
          gap: 10px;
          margin-top: 30px;
        }

        .nz-feature {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 13px;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.90);
          background: rgba(255, 255, 255, 0.085);
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: nzFeatureIn 0.7s ease both;
        }

        .nz-feature:nth-child(2) {
          animation-delay: 0.1s;
        }

        .nz-feature:nth-child(3) {
          animation-delay: 0.2s;
        }

        @keyframes nzFeatureIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .nz-feature-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #d5ffeb;
          box-shadow: 0 0 0 5px rgba(213, 255, 235, 0.08);
        }

        .nz-form-panel {
          min-width: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 55px 62px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.97),
              rgba(247, 255, 251, 0.90)
            );
        }

        .nz-form-panel::before {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          right: -110px;
          top: -115px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.14),
            transparent 68%
          );
          pointer-events: none;
        }

        .nz-form-wrap {
          width: min(430px, 100%);
          position: relative;
          z-index: 2;
        }

        .nz-heading {
          margin-bottom: 24px;
        }

        .nz-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 6px 10px;
          border: 1px solid #cceedd;
          border-radius: 999px;
          color: var(--nz-green-dark);
          background: #e7f9ef;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .nz-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--nz-green);
          box-shadow: 0 0 0 5px rgba(8, 169, 104, 0.09);
          animation: nzPulse 1.7s ease-in-out infinite;
        }

        @keyframes nzPulse {
          50% {
            transform: scale(1.35);
            opacity: 0.65;
          }
        }

        .nz-heading h2 {
          margin: 0;
          color: #10291f;
          font-size: clamp(29px, 3.5vw, 40px);
          line-height: 1.08;
          letter-spacing: -1.7px;
          font-weight: 950;
        }

        .nz-heading p {
          margin: 10px 0 0;
          color: var(--nz-muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .nz-field {
          margin-bottom: 14px;
        }

        .nz-field label {
          display: block;
          margin: 0 0 7px 2px;
          color: #496159;
          font-size: 12px;
          font-weight: 800;
        }

        .nz-input-wrap {
          position: relative;
        }

        .nz-input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
          transform: translateY(-50%);
          color: #6c887c;
          font-size: 11px;
          font-weight: 950;
          pointer-events: none;
        }

        .nz-input {
          width: 100%;
          min-height: 52px;
          padding: 13px 15px 13px 43px;
          border: 1px solid var(--nz-line);
          border-radius: 14px;
          outline: none;
          color: #173127;
          background: rgba(255, 255, 255, 0.82);
          font: inherit;
          font-size: 14px;
          box-shadow: 0 7px 20px rgba(20, 86, 57, 0.035);
          transition:
            border-color 0.22s ease,
            box-shadow 0.22s ease,
            transform 0.22s ease,
            background 0.22s ease;
        }

        .nz-input::placeholder {
          color: #a0afa9;
        }

        .nz-input:hover {
          border-color: #b9dfcc;
          background: rgba(255, 255, 255, 0.96);
        }

        .nz-input:focus {
          border-color: #11a96a;
          background: white;
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(17, 169, 106, 0.10),
            0 12px 28px rgba(17, 169, 106, 0.07);
        }

        .nz-submit {
          width: 100%;
          min-height: 54px;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
          border: 0;
          border-radius: 15px;
          color: white;
          background: linear-gradient(
            135deg,
            #078b56 0%,
            #08a968 52%,
            #10b978 100%
          );
          box-shadow:
            0 15px 30px rgba(8, 169, 104, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            filter 0.22s ease;
        }

        .nz-submit::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -45%;
          width: 30%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.38),
            transparent
          );
          transform: skewX(-18deg);
          transition: left 0.65s ease;
        }

        .nz-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: saturate(1.05);
          box-shadow:
            0 20px 38px rgba(8, 169, 104, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }

        .nz-submit:hover:not(:disabled)::before {
          left: 125%;
        }

        .nz-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .nz-submit:disabled {
          opacity: 0.66;
          cursor: not-allowed;
        }

        .nz-login-note {
          margin: 18px 0 0;
          text-align: center;
          color: #7a8c85;
          font-size: 13px;
        }

        .nz-login-note a {
          color: #078d57;
          font-weight: 900;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .nz-login-note a:hover {
          color: #055f3d;
          text-decoration: underline;
        }

        .nz-secure-note {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 20px;
          color: #8a9a94;
          font-size: 10px;
          font-weight: 750;
        }

        .nz-secure-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16b978;
          box-shadow: 0 0 0 4px rgba(22, 185, 120, 0.10);
        }

        @media (max-width: 900px) {
          .notez-signup-page {
            padding: 18px;
            overflow-y: auto;
          }

          .nz-signup-shell {
            max-width: 570px;
            min-height: auto;
            grid-template-columns: 1fr;
          }

          .nz-brand-panel {
            min-height: 310px;
            padding: 32px 25px;
          }

          .nz-feature-list {
            display: none;
          }

          .nz-form-panel {
            padding: 40px 30px 45px;
          }
        }

        @media (max-width: 560px) {
          .notez-signup-page {
            min-height: 100dvh;
            padding: 10px;
          }

          .nz-signup-shell {
            width: 100%;
            border-radius: 24px;
          }

          .nz-brand-panel {
            min-height: 245px;
            padding: 25px 18px;
          }

          .nz-brand-logo {
            width: 63px;
            height: 63px;
            margin-bottom: 14px;
            border-radius: 18px;
            font-size: 23px;
          }

          .nz-brand-content h1 {
            font-size: 34px;
            letter-spacing: -2px;
          }

          .nz-pro-pill {
            padding: 5px 8px;
            font-size: 8px;
          }

          .nz-brand-content p {
            max-width: 300px;
            margin-top: 10px;
            font-size: 12px;
          }

          .nz-form-panel {
            padding: 30px 18px 32px;
          }

          .nz-heading {
            margin-bottom: 19px;
          }

          .nz-heading h2 {
            font-size: 28px;
          }

          .nz-heading p {
            font-size: 12px;
          }

          .nz-input {
            min-height: 49px;
            border-radius: 13px;
          }

          .nz-submit {
            min-height: 51px;
            border-radius: 14px;
          }
        }

        @media (max-width: 360px) {
          .nz-brand-panel {
            min-height: 220px;
          }

          .nz-brand-content h1 {
            font-size: 30px;
          }

          .nz-form-panel {
            padding-left: 15px;
            padding-right: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .notez-signup-page *,
          .notez-signup-page *::before,
          .notez-signup-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="nz-background-ring" aria-hidden="true"></div>
      <div className="nz-background-orb" aria-hidden="true"></div>

      <main className="nz-signup-shell">
        <section className="nz-brand-panel">
          <div className="nz-brand-content">
            <div className="nz-brand-logo" aria-label="NoteZ">
              Nz
            </div>

            <h1>
              NoteZ
              <span className="nz-pro-pill">PRO</span>
            </h1>

            <p>
              Your digital student workspace. Create your account and bring
              your notes, tasks and productivity tools together.
            </p>

            <div className="nz-feature-list">
              <div className="nz-feature">
                <span className="nz-feature-dot"></span>
                One simple productivity workspace
              </div>

              <div className="nz-feature">
                <span className="nz-feature-dot"></span>
                Fast and clean student experience
              </div>

              <div className="nz-feature">
                <span className="nz-feature-dot"></span>
                Secure account creation
              </div>
            </div>
          </div>
        </section>

        <section className="nz-form-panel">
          <div className="nz-form-wrap">
            <div className="nz-heading">
              <span className="nz-eyebrow">NoteZ Pro</span>

              <h2>Create an account</h2>

              <p>
                Start your personal productivity workspace in a few seconds.
              </p>
            </div>

            <form onSubmit={handleSignup}>
              <div className="nz-field">
                <label htmlFor="signup-username">Username</label>

                <div className="nz-input-wrap">
                  <span className="nz-input-icon" aria-hidden="true">
                    N
                  </span>

                  <input
                    id="signup-username"
                    type="text"
                    className="nz-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="nz-field">
                <label htmlFor="signup-email">Email Address</label>

                <div className="nz-input-wrap">
                  <span className="nz-input-icon" aria-hidden="true">
                    @
                  </span>

                  <input
                    id="signup-email"
                    type="email"
                    className="nz-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="nz-field">
                <label htmlFor="signup-password">Password</label>

                <div className="nz-input-wrap">
                  <span className="nz-input-icon" aria-hidden="true">
                    ●
                  </span>

                  <input
                    id="signup-password"
                    type="password"
                    className="nz-input"
                    placeholder="Create your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="nz-field">
                <label htmlFor="signup-confirm-password">
                  Confirm Password
                </label>

                <div className="nz-input-wrap">
                  <span className="nz-input-icon" aria-hidden="true">
                    ✓
                  </span>

                  <input
                    id="signup-confirm-password"
                    type="password"
                    className="nz-input"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="nz-submit"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className="nz-login-note">
              Already have an account? <Link to="/login">Login</Link> <div></div>
              
               <Link
            

    to="/policy"
    className="notez-policy-link"
    aria-label="Read NoteZ Data and Trust Policy"
  >
    NoteZ — Your Data, Your Trust
  </Link>

            </p>

            <div className="nz-secure-note">
              <span className="nz-secure-dot"></span>
              Secure NoteZ account creation
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default React.memo(Signup);

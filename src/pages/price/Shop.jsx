import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/*
  NOTEZ SHOP PAYMENT GATE

  Plans:
  Plan 1 = ₹50 / 1 GB
  Plan 2 = ₹100 / 10 GB

  IMPORTANT:
  This frontend does NOT declare a payment successful by itself.

  Secure flow should be:

  1. User selects plan.
  2. Shop creates payment order through your backend.
  3. User pays through UPI.
  4. Payment gateway/backend verifies payment.
  5. Backend updates order status = "paid".
  6. This page receives the verified status.
  7. User is sent ONLY to the plan they purchased.

  Expected backend endpoints:

  POST /api/payments/create-order
  GET  /api/payments/status/:orderId

  Example create-order body:

  {
    "planId": "echest1",
    "amount": 50
  }

  Backend response:

  {
    "orderId": "NOTEZ_xxxxxxxxx",
    "status": "pending"
  }

  Status endpoint should return:

  {
    "status": "pending"
  }

  OR

  {
    "status": "paid"
  }
*/

const PLANS = {
  echest1: {
    id: "echest1",
    name: "NoteZ Basic",
    storage: "1 GB",
    amount: 50,
    title: "1 GB Student Storage",
    destination: "/Echest1",
  },

  echest2: {
    id: "echest2",
    name: "NoteZ Pro",
    storage: "10 GB",
    amount: 100,
    title: "10 GB Student Storage",
    destination: "/Echest2",
  },
};

const UPI_ID = "sakshamthakur2024@oksbi";
const MERCHANT_NAME = "NoteZ";

/*
  Put your uploaded QR image here:

  public/img/notez-upi-qr.png

  Then this path works:
  /img/notez-upi-qr.png
*/

const QR_IMAGE = "/img/notez-upi-qr.png";

export default function Shop() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedPlan, setSelectedPlan] = useState("echest1");

  const [orderId, setOrderId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const [utr, setUtr] = useState("");
  const [message, setMessage] = useState("");

  const [copied, setCopied] = useState(false);

  /*
    If Echest1/Echest2 sends:

    navigate("/SHOPING", {
      state: {
        planId: "echest1"
      }
    });

    this automatically selects the correct plan.
  */
  useEffect(() => {
    const incomingPlan = location?.state?.planId;

    if (
      incomingPlan &&
      Object.prototype.hasOwnProperty.call(PLANS, incomingPlan)
    ) {
      setSelectedPlan(incomingPlan);
    }
  }, [location]);

  const plan = useMemo(() => {
    return PLANS[selectedPlan];
  }, [selectedPlan]);

  /*
    UPI intent link.

    This can open a UPI application on supported mobile devices.

    It does NOT prove that payment succeeded.
    The backend still needs to verify payment.
  */
  const upiLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: MERCHANT_NAME,
      am: String(plan.amount),
      cu: "INR",
      tn: `NoteZ ${plan.name} - ${plan.storage}`,
    });

    return `upi://pay?${params.toString()}`;
  }, [plan]);

  const selectPlan = (planId) => {
    if (loading || checking) return;

    setSelectedPlan(planId);
    setOrderId("");
    setPaymentStatus("idle");
    setMessage("");
    setUtr("");
  };

  const copyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  /*
    CREATE PAYMENT ORDER

    Your backend should create the actual payment/order record.

    Do NOT create the payment order only in the browser
    if you want secure payment verification.
  */
  const createPaymentOrder = async () => {
    setLoading(true);
    setMessage("");
    setPaymentStatus("creating");

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.amount,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create payment order.");
      }

      const data = await response.json();

      if (!data?.orderId) {
        throw new Error("Payment order ID was not returned.");
      }

      setOrderId(data.orderId);
      setPaymentStatus("pending");

      setMessage(
        `Payment order created for ${plan.name}. Complete the ₹${plan.amount} payment.`
      );
    } catch (error) {
      console.error("Payment order error:", error);

      setPaymentStatus("error");

      setMessage(
        "Payment service is temporarily unavailable. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    OPEN UPI APP

    Mobile browsers may support this directly.
  */
  const openUPI = async () => {
    if (!orderId) {
      await createPaymentOrder();
    }

    /*
      Give the browser a moment to create the order.
      The payment button itself remains safe because
      payment verification happens separately.
    */

    setTimeout(() => {
      window.location.href = upiLink;
    }, 250);
  };

  /*
    CHECK VERIFIED PAYMENT

    This asks your backend whether the payment has actually
    been verified.

    The backend must NOT trust the user's "I Paid" button.
  */
  const checkPayment = async () => {
    if (!orderId) {
      setMessage("Create a payment order first.");
      return;
    }

    setChecking(true);
    setPaymentStatus("checking");
    setMessage("Checking your payment securely...");

    try {
      const response = await fetch(
        `/api/payments/status/${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Payment status request failed.");
      }

      const data = await response.json();

      if (data?.status === "paid") {
        /*
          IMPORTANT:

          The destination is determined from the original
          selected order.

          A secure backend should also return the verified
          planId and we verify that it matches.
        */

        if (data.planId && data.planId !== plan.id) {
          setPaymentStatus("error");
          setMessage(
            "Security check failed: the payment plan does not match this purchase."
          );
          return;
        }

        setPaymentStatus("paid");
        setMessage("Payment verified successfully.");

        /*
          Small delay gives the user time to see the success
          state before entering the purchased product.
        */
        setTimeout(() => {
          navigate(plan.destination, {
            replace: true,
            state: {
              verifiedPurchase: true,
              orderId,
              planId: plan.id,
            },
          });
        }, 900);

        return;
      }

      if (data?.status === "failed") {
        setPaymentStatus("failed");
        setMessage(
          "The payment was not completed. Please try again."
        );
        return;
      }

      setPaymentStatus("pending");
      setMessage(
        "Payment is not verified yet. If you have just paid, wait a moment and check again."
      );
    } catch (error) {
      console.error("Payment verification error:", error);

      setPaymentStatus("error");
      setMessage(
        "Unable to check payment right now. Please try again."
      );
    } finally {
      setChecking(false);
    }
  };

  /*
    OPTIONAL UTR SUBMISSION

    This does NOT mark the payment as paid.

    Your backend must independently verify the UTR/payment.
  */
  const submitUTR = async () => {
    const cleanUTR = utr.trim();

    if (!orderId) {
      setMessage("Create a payment order first.");
      return;
    }

    if (cleanUTR.length < 8) {
      setMessage("Enter a valid UTR / transaction reference.");
      return;
    }

    setChecking(true);
    setMessage("Sending transaction reference for verification...");

    try {
      const response = await fetch("/api/payments/submit-utr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          utr: cleanUTR,
          planId: plan.id,
        }),
      });

      if (!response.ok) {
        throw new Error("UTR submission failed.");
      }

      setMessage(
        "Transaction reference submitted. We will only unlock the plan after verification."
      );

      setPaymentStatus("pending");
    } catch (error) {
      console.error("UTR error:", error);

      setMessage(
        "Could not submit the transaction reference. Please try again."
      );
    } finally {
      setChecking(false);
    }
  };

  /*
    Automatic polling.

    This is NOT the source of truth.
    It only asks the backend repeatedly.

    The backend remains responsible for payment verification.
  */
  useEffect(() => {
    if (!orderId || paymentStatus !== "pending") {
      return;
    }

    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const response = await fetch(
          `/api/payments/status/${encodeURIComponent(orderId)}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (data?.status === "paid") {
          if (data.planId && data.planId !== plan.id) {
            setPaymentStatus("error");
            setMessage(
              "Security check failed: purchased plan mismatch."
            );
            return;
          }

          setPaymentStatus("paid");
          setMessage("Payment verified. Opening your purchased plan...");

          setTimeout(() => {
            navigate(plan.destination, {
              replace: true,
              state: {
                verifiedPurchase: true,
                orderId,
                planId: plan.id,
              },
            });
          }, 900);
        }

        if (data?.status === "failed") {
          setPaymentStatus("failed");
          setMessage("Payment failed.");
        }
      } catch (error) {
        console.error("Automatic payment check:", error);
      }
    };

    const interval = setInterval(poll, 5000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [orderId, paymentStatus, plan.id, plan.destination, navigate]);

  return (
    <>
      <div className="notez-shop-page">

        {/* BACKGROUND ANIMATION */}
        <div className="shop-orb shop-orb-one" />
        <div className="shop-orb shop-orb-two" />

        {/* HEADER */}
        <header className="shop-header">
          <button
            className="brand-button"
            onClick={() => navigate("/")}
            type="button"
          >
            <span className="brand-icon">N</span>

            <span className="brand-text">
              NoteZ
            </span>

            <span className="brand-pro">
              PRO
            </span>
          </button>

          <div className="secure-badge">
            <span className="secure-dot" />
            Secure Checkout
          </div>
        </header>

        {/* MAIN */}
        <main className="shop-container">

          <section className="shop-title-section">
            <div className="title-pill">
              NOTEZ PAYMENT
            </div>

            <h1>
              Upgrade your
              <span> student storage.</span>
            </h1>

            <p>
              Choose your storage plan and complete your UPI payment
              securely.
            </p>
          </section>

          {/* PLAN SELECTOR */}
          <section className="plan-selector">

            {/* PLAN 1 */}
            <button
              type="button"
              className={`plan-card ${
                selectedPlan === "echest1"
                  ? "selected"
                  : ""
              }`}
              onClick={() => selectPlan("echest1")}
            >
              <div className="plan-top">
                <span className="plan-number">
                  01
                </span>

                {selectedPlan === "echest1" && (
                  <span className="selected-check">
                    ✓ Selected
                  </span>
                )}
              </div>

              <h2>
                NoteZ Basic
              </h2>

              <div className="storage-number">
                1 GB
              </div>

              <div className="plan-price">
                ₹50
                <small>/month</small>
              </div>

              <div className="plan-description">
                Student document & picture storage
              </div>
            </button>

            {/* PLAN 2 */}
            <button
              type="button"
              className={`plan-card ${
                selectedPlan === "echest2"
                  ? "selected"
                  : ""
              }`}
              onClick={() => selectPlan("echest2")}
            >
              <div className="plan-top">
                <span className="plan-number">
                  02
                </span>

                {selectedPlan === "echest2" && (
                  <span className="selected-check">
                    ✓ Selected
                  </span>
                )}
              </div>

              <h2>
                NoteZ Pro
              </h2>

              <div className="storage-number">
                10 GB
              </div>

              <div className="plan-price">
                ₹100
                <small>/month</small>
              </div>

              <div className="plan-description">
                More space for documents, certificates & pictures
              </div>
            </button>

          </section>

          {/* PAYMENT CARD */}
          <section className="payment-card">

            <div className="payment-heading">
              <div>
                <span className="small-label">
                  SELECTED PLAN
                </span>

                <h2>
                  {plan.name}
                </h2>
              </div>

              <div className="payment-amount">
                ₹{plan.amount}
                <span>/month</span>
              </div>
            </div>

            <div className="payment-divider" />

            <div className="payment-grid">

              {/* QR */}
              <div className="scanner-section">

                <div className="scanner-title">
                  <span className="scanner-icon">
                    QR
                  </span>

                  <div>
                    <strong>
                      NoteZ Scanner
                    </strong>

                    <small>
                      Scan with any UPI app
                    </small>
                  </div>
                </div>

                <div className="qr-box">
                  <img
                     src="notez-upi-qr.png"
                    alt="NoteZ UPI payment scanner"
                 
                  />

                  <div className="qr-corner qr-corner-tl" />
                  <div className="qr-corner qr-corner-tr" />
                  <div className="qr-corner qr-corner-bl" />
                  <div className="qr-corner qr-corner-br" />
                </div>

                <div className="upi-id-box">
                  <span>
                    UPI ID
                  </span>

                  <strong>
                    {UPI_ID}
                  </strong>

                  <button
                    type="button"
                    onClick={copyUPI}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>

              </div>

              {/* INSTRUCTIONS */}
              <div className="instruction-section">

                <span className="small-label">
                  HOW TO PAY
                </span>

                <div className="step">
                  <span>1</span>

                  <div>
                    <strong>
                      Select your plan
                    </strong>

                    <p>
                      Choose either 1 GB or 10 GB.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <span>2</span>

                  <div>
                    <strong>
                      Scan the NoteZ QR
                    </strong>

                    <p>
                      Open Google Pay, PhonePe, Paytm,
                      BHIM or another UPI app.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <span>3</span>

                  <div>
                    <strong>
                      Pay ₹{plan.amount}
                    </strong>

                    <p>
                      Confirm the amount before completing
                      your UPI payment.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <span>4</span>

                  <div>
                    <strong>
                      Wait for verification
                    </strong>

                    <p>
                      NoteZ checks the payment before
                      unlocking your storage.
                    </p>
                  </div>
                </div>

                {/* MOBILE UPI */}
                <a
                  href={upiLink}
                  className="upi-open-button"
                  onClick={() => {
                    if (!orderId) {
                      createPaymentOrder();
                    }
                  }}
                >
                  Open UPI App
                  <span>↗</span>
                </a>

                {/* CREATE ORDER */}
                {!orderId && (
                  <button
                    type="button"
                    className="primary-payment-button"
                    disabled={loading}
                    onClick={createPaymentOrder}
                  >
                    {loading
                      ? "Preparing payment..."
                      : `Start ₹${plan.amount} Payment`}
                  </button>
                )}

                {/* VERIFY */}
                {orderId && (
                  <button
                    type="button"
                    className="verify-button"
                    disabled={checking || paymentStatus === "paid"}
                    onClick={checkPayment}
                  >
                    {checking
                      ? "Checking..."
                      : paymentStatus === "paid"
                      ? "Payment Verified ✓"
                      : "Check Payment Status"}
                  </button>
                )}

              </div>
            </div>

            {/* UTR */}
            {orderId && (
              <div className="utr-section">

                <div>
                  <span className="small-label">
                    TRANSACTION REFERENCE
                  </span>

                  <p>
                    If your payment provider gives you a UTR /
                    transaction reference, you can submit it here.
                  </p>
                </div>

                <div className="utr-row">
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="Enter UTR / transaction ID"
                    maxLength={40}
                  />

                  <button
                    type="button"
                    disabled={checking || !utr.trim()}
                    onClick={submitUTR}
                  >
                    Submit
                  </button>
                </div>

              </div>
            )}

            {/* STATUS */}
            {message && (
              <div
                className={`payment-status ${
                  paymentStatus === "paid"
                    ? "status-success"
                    : paymentStatus === "error" ||
                      paymentStatus === "failed"
                    ? "status-error"
                    : "status-normal"
                }`}
              >
                <span className="status-light" />
                {message}
              </div>
            )}

            {/* SECURITY */}
            <div className="security-note">

              <div className="security-icon">
                ✓
              </div>

              <div>
                <strong>
                  Your payment is protected
                </strong>

                <p>
                  NoteZ does not unlock a plan simply because
                  a payment button was pressed. Your payment
                  must be verified before access is granted.
                </p>
              </div>

            </div>

          </section>

          {/* MONTHLY INFORMATION */}
          <section className="monthly-card">

            <div className="monthly-icon">
              ↻
            </div>

            <div>
              <strong>
                Monthly plan
              </strong>

              <p>
                Your selected storage plan is billed monthly.
                If you want automatic renewal, connect this
                checkout to a supported recurring-payment
                provider/mandate system.
              </p>
            </div>

          </section>

        </main>

        {/* FOOTER */}
        <footer className="shop-footer">
          <span>
            © {new Date().getFullYear()} NoteZ
          </span>

          <span>
            Secure student storage
          </span>
        </footer>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f4faf7;
        }

        button,
        input {
          font: inherit;
        }

        .notez-shop-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 15% 15%,
              rgba(23, 180, 112, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 80%,
              rgba(0, 110, 70, 0.09),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #f7fffb,
              #eef8f3
            );
          color: #10251d;
        }

        .shop-orb {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(55px);
          opacity: 0.25;
          pointer-events: none;
          animation: floatOrb 8s ease-in-out infinite;
        }

        .shop-orb-one {
          top: -100px;
          left: -100px;
          background: #22c55e;
        }

        .shop-orb-two {
          right: -120px;
          bottom: 50px;
          background: #0f8b62;
          animation-delay: -4s;
        }

        @keyframes floatOrb {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(25px, 18px, 0);
          }
        }

        .shop-header {
          height: 76px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 5;
          border-bottom: 1px solid rgba(0, 70, 45, 0.08);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(20px);
        }

        .brand-button {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #10251d;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          font-size: 22px;
          font-weight: 900;
          background:
            linear-gradient(
              145deg,
              #0ca866,
              #087b4c
            );
          box-shadow:
            0 8px 20px rgba(4, 133, 81, 0.2);
        }

        .brand-text {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .brand-pro {
          padding: 5px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #087b4c;
          background: #dff8eb;
        }

        .secure-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #287359;
        }

        .secure-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #12a76b;
          box-shadow: 0 0 0 5px rgba(18, 167, 107, 0.12);
          animation: pulseDot 2s infinite;
        }

        @keyframes pulseDot {
          50% {
            box-shadow:
              0 0 0 9px rgba(18, 167, 107, 0);
          }
        }

        .shop-container {
          width: min(1050px, 92%);
          margin: auto;
          padding: 55px 0 35px;
          position: relative;
          z-index: 2;
        }

        .shop-title-section {
          text-align: center;
          max-width: 700px;
          margin: auto;
          animation: fadeUp 0.7s ease both;
        }

        .title-pill {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #087b4c;
          background: #ddf7ea;
          border: 1px solid #c8eedc;
        }

        .shop-title-section h1 {
          margin: 16px 0 10px;
          font-size: clamp(34px, 5vw, 56px);
          line-height: 1.02;
          letter-spacing: -2.8px;
        }

        .shop-title-section h1 span {
          color: #07935a;
        }

        .shop-title-section p {
          margin: 0;
          color: #6a7d75;
          font-size: 16px;
        }

        .plan-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 38px;
        }

        .plan-card {
          text-align: left;
          padding: 25px;
          border-radius: 24px;
          border: 1px solid #dcebe4;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 14px 45px rgba(12, 70, 45, 0.06);
          cursor: pointer;
          transition:
            transform 0.25s ease,
            border 0.25s ease,
            box-shadow 0.25s ease;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 20px 50px rgba(12, 70, 45, 0.1);
        }

        .plan-card.selected {
          border: 2px solid #0ba66a;
          background:
            linear-gradient(
              145deg,
              rgba(235, 255, 246, 0.95),
              rgba(255, 255, 255, 0.95)
            );
          box-shadow:
            0 18px 55px rgba(11, 166, 106, 0.14);
        }

        .plan-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .plan-number {
          font-size: 11px;
          font-weight: 900;
          color: #8ba199;
        }

        .selected-check {
          font-size: 11px;
          font-weight: 800;
          color: #07935a;
        }

        .plan-card h2 {
          margin: 20px 0 5px;
          font-size: 21px;
        }

        .storage-number {
          font-size: 31px;
          font-weight: 900;
          color: #078e56;
          letter-spacing: -1px;
        }

        .plan-price {
          margin-top: 13px;
          font-size: 25px;
          font-weight: 900;
        }

        .plan-price small {
          margin-left: 4px;
          font-size: 12px;
          color: #81928b;
          font-weight: 600;
        }

        .plan-description {
          margin-top: 8px;
          font-size: 13px;
          color: #71847b;
        }

        .payment-card {
          margin-top: 22px;
          padding: 30px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(10, 100, 65, 0.1);
          box-shadow:
            0 25px 80px rgba(12, 70, 45, 0.1);
          backdrop-filter: blur(25px);
          animation: fadeUp 0.8s ease both;
        }

        .payment-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .small-label {
          display: block;
          margin-bottom: 6px;
          color: #8a9a93;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .payment-heading h2 {
          margin: 0;
          font-size: 25px;
        }

        .payment-amount {
          font-size: 31px;
          font-weight: 900;
          color: #078e56;
        }

        .payment-amount span {
          font-size: 12px;
          color: #809089;
          font-weight: 600;
        }

        .payment-divider {
          height: 1px;
          margin: 25px 0;
          background: #e5eee9;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 40px;
        }

        .scanner-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .scanner-title strong,
        .scanner-title small {
          display: block;
        }

        .scanner-title strong {
          font-size: 15px;
        }

        .scanner-title small {
          margin-top: 3px;
          color: #82928b;
          font-size: 12px;
        }

        .scanner-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: white;
          background: #0a9a60;
          font-size: 11px;
          font-weight: 900;
        }

        .qr-box {
          width: min(330px, 100%);
          aspect-ratio: 1;
          padding: 18px;
          margin: auto;
          position: relative;
          border-radius: 22px;
          background: white;
          border: 1px solid #e1ebe6;
          box-shadow:
            0 15px 35px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .qr-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          border-radius: 10px;
        }

        .qr-corner {
          width: 22px;
          height: 22px;
          position: absolute;
          border-color: #08a465;
        }

        .qr-corner-tl {
          top: 9px;
          left: 9px;
          border-top: 3px solid;
          border-left: 3px solid;
        }

        .qr-corner-tr {
          top: 9px;
          right: 9px;
          border-top: 3px solid;
          border-right: 3px solid;
        }

        .qr-corner-bl {
          bottom: 9px;
          left: 9px;
          border-bottom: 3px solid;
          border-left: 3px solid;
        }

        .qr-corner-br {
          bottom: 9px;
          right: 9px;
          border-bottom: 3px solid;
          border-right: 3px solid;
        }

        .upi-id-box {
          width: min(330px, 100%);
          margin: 15px auto 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px;
          border-radius: 13px;
          background: #f1f8f4;
          border: 1px solid #dcece4;
          font-size: 11px;
        }

        .upi-id-box span {
          color: #8b9993;
        }

        .upi-id-box strong {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
        }

        .upi-id-box button {
          border: 0;
          padding: 6px 9px;
          border-radius: 8px;
          color: #087b4c;
          background: #d8f4e5;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .instruction-section {
          padding: 3px 0;
        }

        .step {
          display: flex;
          gap: 13px;
          margin: 18px 0;
        }

        .step > span {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: #0a9b60;
          font-size: 11px;
          font-weight: 900;
        }

        .step strong {
          font-size: 14px;
        }

        .step p {
          margin: 4px 0 0;
          color: #7a8c84;
          font-size: 12px;
          line-height: 1.5;
        }

        .upi-open-button,
        .primary-payment-button,
        .verify-button {
          width: 100%;
          min-height: 48px;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 13px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #079d61,
              #057b4b
            );
          box-shadow:
            0 10px 25px rgba(6, 139, 86, 0.18);
          text-decoration: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 850;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .upi-open-button:hover,
        .primary-payment-button:hover,
        .verify-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 14px 30px rgba(6, 139, 86, 0.25);
        }

        .verify-button {
          background:
            linear-gradient(
              135deg,
              #152e25,
              #0a9b60
            );
        }

        .upi-open-button + .primary-payment-button {
          margin-top: 10px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none !important;
        }

        .utr-section {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #e4eee9;
        }

        .utr-section p {
          margin: 5px 0 14px;
          color: #809089;
          font-size: 12px;
        }

        .utr-row {
          display: flex;
          gap: 9px;
        }

        .utr-row input {
          flex: 1;
          min-width: 0;
          height: 45px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid #d9e8e1;
          outline: none;
          background: #fbfefc;
        }

        .utr-row input:focus {
          border-color: #0aa365;
          box-shadow:
            0 0 0 4px rgba(10, 163, 101, 0.08);
        }

        .utr-row button {
          padding: 0 17px;
          border: 0;
          border-radius: 11px;
          color: white;
          background: #112a21;
          cursor: pointer;
          font-weight: 800;
        }

        .payment-status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 13px;
          border-radius: 12px;
          font-size: 12px;
          line-height: 1.45;
        }

        .status-normal {
          background: #f0f7f4;
          color: #477064;
        }

        .status-success {
          background: #e1f8ec;
          color: #087c4e;
        }

        .status-error {
          background: #fff0f0;
          color: #a33434;
        }

        .status-light {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .security-note {
          display: flex;
          gap: 12px;
          margin-top: 22px;
          padding: 15px;
          border-radius: 15px;
          background: #f4faf7;
          border: 1px solid #e1eee8;
        }

        .security-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: #0a9b60;
          font-weight: 900;
        }

        .security-note strong {
          font-size: 12px;
        }

        .security-note p {
          margin: 4px 0 0;
          color: #71847b;
          font-size: 11px;
          line-height: 1.5;
        }

        .monthly-card {
          margin-top: 18px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid #dfebe5;
        }

        .monthly-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #087b4c;
          background: #dff6e9;
          font-size: 20px;
          font-weight: 900;
        }

        .monthly-card strong {
          font-size: 14px;
        }

        .monthly-card p {
          margin: 4px 0 0;
          color: #768981;
          font-size: 12px;
          line-height: 1.5;
        }

        .shop-footer {
          width: min(1050px, 92%);
          margin: auto;
          padding: 20px 0 30px;
          display: flex;
          justify-content: space-between;
          color: #8a9a93;
          font-size: 11px;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 760px) {

          .shop-header {
            height: 65px;
            padding: 0 18px;
          }

          .brand-text {
            font-size: 19px;
          }

          .secure-badge {
            font-size: 10px;
          }

          .shop-container {
            width: 94%;
            padding-top: 35px;
          }

          .shop-title-section h1 {
            letter-spacing: -1.7px;
          }

          .shop-title-section p {
            font-size: 13px;
          }

          .plan-selector {
            grid-template-columns: 1fr;
          }

          .payment-card {
            padding: 20px;
            border-radius: 22px;
          }

          .payment-heading {
            align-items: flex-start;
          }

          .payment-amount {
            font-size: 23px;
          }

          .payment-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .scanner-section {
            order: 1;
          }

          .instruction-section {
            order: 2;
          }

          .qr-box {
            width: min(290px, 100%);
          }

          .upi-id-box {
            width: min(290px, 100%);
          }

          .utr-row {
            flex-direction: column;
          }

          .utr-row button {
            height: 45px;
          }

          .shop-footer {
            padding-bottom: 22px;
            flex-direction: column;
            gap: 5px;
          }
        }

        @media (max-width: 420px) {

          .brand-pro {
            display: none;
          }

          .secure-badge {
            font-size: 9px;
          }

          .shop-title-section h1 {
            font-size: 35px;
          }

          .payment-heading h2 {
            font-size: 20px;
          }

          .payment-amount {
            font-size: 20px;
          }
        }

      `}</style>
    </>
  );
}
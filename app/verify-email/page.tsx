"use client";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import "./verify-email.style.css";
import { setCookie, getCookie, apiUrl } from "../../lib/utils";
const TOTAL_DIGITS = 6;
const RESEND_COOLDOWN = 60;
const CIRCUMFERENCE = 97.4;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const otpValuesRef = useRef<string[]>(Array(TOTAL_DIGITS).fill(""));
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoVerifyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resendCountRef = useRef(0);

  useEffect(() => {
    // window.location.href (not router.push) for the dashboard
    // redirects: those pages' CSS is unscoped global stylesheets, and
    // a client-side transition could paint before it's loaded. A full
    // page nav always waits for CSS first — see app/login/page.tsx.
    if (getCookie("accessToken")) {
      const role = getCookie("role");
      if (role === "Doctor") window.location.href = "/doctor-dashboard";
      else if (role === "User") window.location.href = "/user-dashboard";
      else if (role === "Admin") window.location.href = "/admin-dashboard";
    }

    initParticles();
    startResendTimer();
    const firstInput = document.getElementById("otp-0") as HTMLInputElement;
    firstInput?.focus();

    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (autoVerifyRef.current) clearTimeout(autoVerifyRef.current);
    };
  }, [router]);

  const initParticles = () => {
    const container = document.getElementById("particles");
    if (!container) return;
    const sizes = [6, 8, 10, 5, 7, 9, 12, 5];
    const positions = [
      { left: "10%", animDur: "12s", animDelay: "0s" },
      { left: "25%", animDur: "9s", animDelay: "2s" },
      { left: "40%", animDur: "14s", animDelay: "1s" },
      { left: "55%", animDur: "10s", animDelay: "3s" },
      { left: "70%", animDur: "11s", animDelay: "0.5s" },
      { left: "82%", animDur: "13s", animDelay: "1.5s" },
      { left: "15%", animDur: "8s", animDelay: "4s" },
      { left: "90%", animDur: "15s", animDelay: "2.5s" },
    ];
    positions.forEach((pos, i) => {
      const dot = document.createElement("div");
      dot.className = "particle";
      dot.style.cssText = `width:${sizes[i]}px;height:${sizes[i]}px;left:${pos.left};bottom:-20px;animation-duration:${pos.animDur};animation-delay:${pos.animDelay};`;
      container.appendChild(dot);
    });
  };

  const isComplete = () => otpValuesRef.current.every((v) => v !== "");

  const updateVerifyBtn = () => {
    const btn = document.getElementById("verifyBtn") as HTMLButtonElement;
    if (btn) btn.disabled = !isComplete();
  };

  const setStatus = (type: string, message: string) => {
    const el = document.getElementById("otpStatus");
    if (!el) return;
    el.className = `otp-status ${type}`;
    if (type === "success") {
      el.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>${message}`;
    } else {
      el.textContent = message;
    }
  };

  const clearStatus = () => {
    const el = document.getElementById("otpStatus");
    if (el) { el.className = "otp-status"; el.textContent = ""; }
  };

  const setInputState = (state: "error" | "success" | "normal") => {
    const inputs = Array.from({ length: TOTAL_DIGITS }, (_, i) =>
      document.getElementById(`otp-${i}`) as HTMLInputElement
    );
    inputs.forEach((inp, i) => {
      inp?.classList.remove("error", "success");
      if (state === "error") inp?.classList.add("error");
      if (state === "success") setTimeout(() => inp?.classList.add("success"), i * 60);
    });
  };

  const handleOTPInput = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw.length === TOTAL_DIGITS) {
      raw.split("").forEach((digit, i) => {
        otpValuesRef.current[i] = digit;
        const inp = document.getElementById(`otp-${i}`) as HTMLInputElement;
        if (inp) { inp.value = digit; inp.classList.toggle("filled", true); }
      });
      (document.getElementById(`otp-${TOTAL_DIGITS - 1}`) as HTMLInputElement)?.focus();
      updateVerifyBtn();
      clearStatus();
      if (autoVerifyRef.current) clearTimeout(autoVerifyRef.current);
      autoVerifyRef.current = setTimeout(handleVerify, 300);
      return;
    }
    const digit = raw.slice(-1);
    otpValuesRef.current[idx] = digit;
    e.target.value = digit;
    e.target.classList.toggle("filled", !!digit);
    clearStatus();
    if (digit && idx < TOTAL_DIGITS - 1) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    }
    updateVerifyBtn();
    if (isComplete()) {
      if (autoVerifyRef.current) clearTimeout(autoVerifyRef.current);
      autoVerifyRef.current = setTimeout(handleVerify, 400);
    }
  };

  const handleOTPKeydown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (otpValuesRef.current[idx]) {
        otpValuesRef.current[idx] = "";
        (e.target as HTMLInputElement).value = "";
        (e.target as HTMLInputElement).classList.remove("filled");
      } else if (idx > 0) {
        otpValuesRef.current[idx - 1] = "";
        const prev = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
        if (prev) { prev.value = ""; prev.classList.remove("filled"); prev.focus(); }
      }
      clearStatus(); updateVerifyBtn();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "ArrowRight" && idx < TOTAL_DIGITS - 1) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "Enter" && isComplete()) {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    if (!isComplete()) return;
    const code = otpValuesRef.current.join("");
    const verifyBtn = document.getElementById("verifyBtn") as HTMLButtonElement;
    if (verifyBtn) { verifyBtn.innerHTML = '<div class="spinner"></div>'; verifyBtn.disabled = true; }

    try {
      const response = await fetch(`${apiUrl}/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const res = await response.json();

      if (res.success) {
        setCookie("accessToken", res?.accessToken);
        setCookie("refreshToken", res?.refreshToken);
        setCookie("role", res?.role);
        setInputState("success");
        setStatus("success", "Code verified successfully!");
        if (verifyBtn) {
          verifyBtn.innerHTML = `<div class="check-circle"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>Verified!`;
          verifyBtn.style.background = "var(--teal-400)";
        }
        setTimeout(showSuccessOverlay, 800);
      } else {
        setInputState("error");
        setStatus("error", "Incorrect code. Please check your email and try again.");
        if (verifyBtn) {
          verifyBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Verify Email`;
          verifyBtn.disabled = false;
        }
        setTimeout(() => {
          otpValuesRef.current = Array(TOTAL_DIGITS).fill("");
          for (let i = 0; i < TOTAL_DIGITS; i++) {
            const inp = document.getElementById(`otp-${i}`) as HTMLInputElement;
            if (inp) { inp.value = ""; inp.classList.remove("error", "filled"); }
          }
          clearStatus(); updateVerifyBtn();
          (document.getElementById("otp-0") as HTMLInputElement)?.focus();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      // Previously the button was left disabled with its spinner
      // stuck forever on a network error — there was no way to retry.
      setStatus("error", "Something went wrong. Please check your connection and try again.");
      if (verifyBtn) {
        verifyBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Verify Email`;
        verifyBtn.disabled = false;
      }
    }
  };

  const showSuccessOverlay = () => {
    const overlay = document.getElementById("successOverlay");
    overlay?.classList.add("show");
  };

  const handleDirect = () => {
    const role = getCookie("role");
    if (role === "Doctor") window.location.href = "/doctor-dashboard";
    else if (role === "User") window.location.href = "/user-dashboard";
    else if (role === "Admin") window.location.href = "/admin-dashboard";
    else router.push("/");
  };

  const startResendTimer = () => {
    const resendBtn = document.getElementById("resendBtn") as HTMLButtonElement;
    const timerNum = document.getElementById("timerNum");
    const timerArc = document.getElementById("timerArc") as SVGCircleElement | null;
    const resendBar = document.getElementById("resendBar") as HTMLElement | null;
    if (!resendBtn) return;

    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    let secs = RESEND_COOLDOWN;
    resendBtn.disabled = true;

    if (resendBar) {
      resendBar.style.transition = "none";
      resendBar.style.width = "100%";
      void resendBar.offsetWidth;
      resendBar.style.transition = `width ${RESEND_COOLDOWN}s linear`;
      resendBar.style.width = "0%";
    }

    resendTimerRef.current = setInterval(() => {
      secs--;
      const progress = secs / RESEND_COOLDOWN;
      const offset = CIRCUMFERENCE * (1 - progress);
      if (timerNum) timerNum.textContent = String(secs);
      if (timerArc) timerArc.style.strokeDashoffset = String(offset);
      if (secs <= 0) {
        clearInterval(resendTimerRef.current!);
        resendBtn.disabled = false;
        if (timerNum) timerNum.textContent = "✓";
        if (timerArc) timerArc.style.strokeDashoffset = String(CIRCUMFERENCE);
      }
    }, 1000);
  };

  const handleResend = () => {
    const resendBtn = document.getElementById("resendBtn") as HTMLButtonElement;
    if (resendBtn?.disabled) return;
    resendCountRef.current++;
    startResendTimer();
    otpValuesRef.current = Array(TOTAL_DIGITS).fill("");
    for (let i = 0; i < TOTAL_DIGITS; i++) {
      const inp = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (inp) { inp.value = ""; inp.classList.remove("filled", "error", "success"); }
    }
    clearStatus(); updateVerifyBtn();
    (document.getElementById("otp-0") as HTMLInputElement)?.focus();
    // The backend has no "resend verification code" endpoint (auth
    // controller only has register/login/activate/forgot/reset), so
    // this restarts the cooldown UI without actually sending a new
    // code. Say so instead of silently implying a fresh code went out.
    setStatus("info", "Resending isn't available yet — please use the code from your original email.");
  };

  return (
    <div className="page-verify-email">
      {/* LEFT PANEL */}
      <div className="panel-left">
        <div className="particles" id="particles"></div>
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <span className="brand-name">MediBook</span>
        </div>
        <div className="email-illustration">
          <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="envelope">
              <div className="env-flap"></div>
              <div className="env-body">
                <div className="env-letter">
                  <div className="letter-line accent"></div>
                  <div className="letter-line"></div>
                  <div className="letter-line"></div>
                  <div className="letter-line"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="panel-copy">
            <h2>One step away from<br /><em>your account</em></h2>
            <p>We&apos;ve sent a 6-digit verification code to your inbox.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="step-progress">
            <div className="step-pip done"></div>
            <div className="step-pip active"></div>
            <div className="step-pip future"></div>
            <span className="step-label">Step 2 of 3</span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>Email Verification</p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="panel-right">
        <div className="form-wrap">
          <div className="form-header">
            <div className="step-badge">
              <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Email Verification
            </div>
            <h1>Check your <em>inbox.</em></h1>
            <p className="email-hint">We sent a 6-digit code to<br /><strong>{email || "your email"}</strong></p>
          </div>

          <div className="otp-label">Enter verification code</div>
          <div className="otp-inputs" id="otpInputs" role="group" aria-label="Verification code">
            {Array.from({ length: TOTAL_DIGITS }).map((_, i) => (
              <input
                key={i}
                className="otp-box"
                type="number"
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Digit ${i + 1}`}
                id={`otp-${i}`}
                onChange={(e) => handleOTPInput(e, i)}
                onKeyDown={(e) => handleOTPKeydown(e, i)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <div className="otp-status" id="otpStatus"></div>

          <button className="btn-verify" id="verifyBtn" disabled onClick={handleVerify}>
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            Verify Email
          </button>

          <div className="resend-section">
            <p className="resend-text">Didn&apos;t receive the code?</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="timer-ring-wrap" id="timerRingWrap">
                <svg className="timer-svg" viewBox="0 0 36 36">
                  <circle className="timer-track" cx="18" cy="18" r="15.5" />
                  <circle className="timer-fill" id="timerArc" cx="18" cy="18" r="15.5" strokeDasharray="97.4" strokeDashoffset="0" />
                </svg>
                <div className="timer-num" id="timerNum">60</div>
              </div>
              <div>
                <button className="btn-resend" id="resendBtn" disabled onClick={handleResend}>Resend code</button>
                <div className="resend-bar-wrap"><div className="resend-bar-fill" id="resendBar"></div></div>
              </div>
            </div>
          </div>

          <div className="security-note">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span>This code expires in <strong>10 minutes</strong>. Never share your verification code with anyone.</span>
          </div>
        </div>
      </div>

      {/* SUCCESS OVERLAY */}
      <div className="success-overlay" id="successOverlay">
        <div className="success-icon-wrap" id="successIconWrap">
          <div className="success-circle">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
        <h2 className="success-title">Email <em>verified!</em></h2>
        <p className="success-desc">Your account is ready. Welcome to MediBook!</p>
        <button className="btn-go-dashboard" onClick={handleDirect}>
          Go to Dashboard
          <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

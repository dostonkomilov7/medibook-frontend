"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import "./auth.style.css";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ForgotPasswordPage() {
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const showState = (stateId: string) => {
    document.querySelectorAll<HTMLElement>(".form-state").forEach((el) => el.classList.remove("active"));
    const target = document.getElementById(stateId);
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const setFieldError = (inputId: string, message: string) => {
    const wrap = (document.getElementById(inputId) as HTMLInputElement)?.closest(".field-wrap");
    wrap?.classList.toggle("error", message.length > 0);
    const errEl = document.getElementById(`${inputId}Error`);
    if (errEl) errEl.textContent = message;
  };

  const startResendCountdown = () => {
    const resendBtn = document.getElementById("resendBtn") as HTMLButtonElement;
    const timerEl = document.getElementById("resendTimer");
    const countdownEl = document.getElementById("countdown");
    if (!resendBtn || !timerEl || !countdownEl) return;

    if (countdownRef.current) clearInterval(countdownRef.current);

    let secs = 60;
    resendBtn.disabled = true;
    timerEl.style.display = "block";
    countdownEl.textContent = String(secs);

    countdownRef.current = setInterval(() => {
      secs--;
      countdownEl.textContent = String(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current!);
        resendBtn.disabled = false;
        timerEl.style.display = "none";
      }
    }, 1000);
  };

  const handleSendLink = async () => {
    const emailInput = document.getElementById("emailInput") as HTMLInputElement;
    const sendBtn = document.getElementById("sendLinkBtn") as HTMLButtonElement;
    const email = emailInput.value.trim();

    if (!email) {
      setFieldError("emailInput", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setFieldError("emailInput", "Please enter a valid email address.");
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = `<div class="spinner"></div><span>Sending…</span>`;

    try {
      await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.error(e);
    }

    sendBtn.disabled = false;
    sendBtn.innerHTML = `<span>Send Reset Link</span><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

    const display = document.getElementById("sentEmailDisplay");
    if (display) display.textContent = email;
    showState("state-sent");
    startResendCountdown();
  };

  const handleResend = async () => {
    const resendBtn = document.getElementById("resendBtn") as HTMLButtonElement;
    if (resendBtn.disabled) return;
    resendBtn.disabled = true;
    resendBtn.innerHTML = `<div class="spinner"></div><span>Sending…</span>`;
    await new Promise((r) => setTimeout(r, 1000));
    resendBtn.disabled = false;
    resendBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg><span>Resend email</span>`;
    startResendCountdown();
  };

  return (
    <div className="auth-layout">
      {/* Left Panel */}
      <div className="auth-panel">
        <div className="panel-inner">
          <div className="brand">
            <div className="brand-dot">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span>MediBook</span>
          </div>

          {/* State: Email entry */}
          <div className="form-state active" id="state-email">
            <div className="form-header">
              <div className="form-icon teal">
                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 7 10-7" /></svg>
              </div>
              <h1>Forgot your password?</h1>
              <p>No worries. Enter the email address linked to your account and we&apos;ll send you a reset link.</p>
            </div>
            <div className="form-body">
              <div className="field-group">
                <label htmlFor="emailInput">Email address</label>
                <div className="field-wrap">
                  <svg className="field-icon" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 7 10-7" /></svg>
                  <input type="email" id="emailInput" placeholder="john.doe@email.com" autoComplete="email" />
                </div>
                <span className="field-error" id="emailInputError"></span>
              </div>
              <button className="btn-primary full" id="sendLinkBtn" onClick={handleSendLink}>
                <span>Send Reset Link</span>
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <Link className="back-link" href="/login">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                Back to sign in
              </Link>
            </div>
          </div>

          {/* State: Email sent */}
          <div className="form-state" id="state-sent">
            <div className="form-header">
              <div className="form-icon success">
                <svg viewBox="0 0 24 24"><path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" /></svg>
              </div>
              <h1>Check your inbox</h1>
              <p>We sent a password reset link to <strong id="sentEmailDisplay">your email</strong>. It expires in 15 minutes.</p>
            </div>
            <div className="form-body">
              <div className="inbox-tips">
                <div className="tip-row"><div className="tip-dot teal"></div><span>Check your spam or junk folder if you don&apos;t see it</span></div>
                <div className="tip-row"><div className="tip-dot amber"></div><span>The link expires in 15 minutes for security</span></div>
                <div className="tip-row"><div className="tip-dot blue"></div><span>Only the most recent link will be valid</span></div>
              </div>
              <button className="btn-primary full" id="resendBtn" onClick={handleResend}>
                <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                <span>Resend email</span>
              </button>
              <div className="resend-timer" id="resendTimer" style={{ display: "none" }}>
                Resend available in <strong id="countdown">60</strong>s
              </div>
              <Link className="back-link" href="/login">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Decorative Panel */}
      <div className="auth-deco">
        <div className="deco-content">
          <div className="deco-card">
            <div className="deco-card-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h3>Your health data is safe</h3>
            <p>MediBook uses bank-grade encryption to protect your medical records and personal information.</p>
          </div>
          <div className="deco-stats">
            <div className="deco-stat"><span className="deco-stat-val">256-bit</span><span className="deco-stat-label">AES Encryption</span></div>
            <div className="deco-stat-div"></div>
            <div className="deco-stat"><span className="deco-stat-val">HIPAA</span><span className="deco-stat-label">Compliant</span></div>
            <div className="deco-stat-div"></div>
            <div className="deco-stat"><span className="deco-stat-val">99.9%</span><span className="deco-stat-label">Uptime SLA</span></div>
          </div>
          <div className="deco-quote">
            <svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
            <p>&ldquo;MediBook keeps my appointments and prescriptions perfectly organised.&rdquo;</p>
            <div className="deco-quote-author">
              <div className="deco-avatar">JD</div>
              <div><strong>John Doe</strong><span>Patient since 2023</span></div>
            </div>
          </div>
        </div>
        <div className="deco-bg-orb orb1"></div>
        <div className="deco-bg-orb orb2"></div>
        <div className="deco-grid"></div>
      </div>

    </div>
  );
}

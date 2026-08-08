"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./auth.style.css";

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    if (window.location.search.includes("expired=1")) {
      showState("state-expired");
      return;
    }
    initPasswordToggles();
    renderStrength("");
  }, []);

  const showState = (stateId: string) => {
    document.querySelectorAll<HTMLElement>(".form-state").forEach((el) => el.classList.remove("active"));
    const target = document.getElementById(stateId);
    if (target) target.classList.add("active");
  };

  const setFieldError = (inputId: string, message: string) => {
    const wrap = (document.getElementById(inputId) as HTMLInputElement)?.closest(".field-wrap");
    wrap?.classList.toggle("error", message.length > 0);
    const errEl = document.getElementById(`${inputId}Error`);
    if (errEl) errEl.textContent = message;
  };

  const clearFieldError = (inputId: string) => setFieldError(inputId, "");

  interface StrengthResult {
    score: number;
    label: string;
    cls: string;
    rules: { length: boolean; upper: boolean; number: boolean; special: boolean };
  }

  const evaluatePassword = (pw: string): StrengthResult => {
    const rules = {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
    const score = Object.values(rules).filter(Boolean).length;
    const map: Record<number, { label: string; cls: string }> = {
      0: { label: "Too short", cls: "" },
      1: { label: "Weak", cls: "weak" },
      2: { label: "Fair", cls: "fair" },
      3: { label: "Good", cls: "good" },
      4: { label: "Strong", cls: "strong" },
    };
    return { score, ...map[score], rules };
  };

  const renderStrength = (pw: string) => {
    const wrap = document.getElementById("strengthWrap");
    const label = document.getElementById("strengthLabel");
    if (!wrap || !label) return;
    if (!pw) { wrap.classList.remove("visible"); return; }
    wrap.classList.add("visible");
    const result = evaluatePassword(pw);
    for (let i = 1; i <= 4; i++) {
      const bar = document.getElementById(`sb${i}`);
      if (!bar) continue;
      bar.className = "strength-bar";
      if (i <= result.score && result.cls) bar.classList.add(result.cls);
    }
    label.textContent = result.label;
    label.className = `strength-label${result.cls ? " " + result.cls : ""}`;
    const ruleMap: Record<string, string> = { length: "rule-length", upper: "rule-upper", number: "rule-number", special: "rule-special" };
    for (const [key, elId] of Object.entries(ruleMap)) {
      const el = document.getElementById(elId);
      if (el) el.classList.toggle("met", result.rules[key as keyof typeof result.rules]);
    }
  };

  const initPasswordToggles = () => {
    document.querySelectorAll<HTMLElement>(".toggle-pw").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;
        const input = document.getElementById(targetId) as HTMLInputElement;
        if (!input) return;
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        const showIcon = btn.querySelector<SVGElement>(".eye-show");
        const hideIcon = btn.querySelector<SVGElement>(".eye-hide");
        if (showIcon) showIcon.style.display = isHidden ? "none" : "";
        if (hideIcon) hideIcon.style.display = isHidden ? "" : "none";
      });
    });
  };

  const handleReset = async () => {
    const newPwInput = document.getElementById("newPassword") as HTMLInputElement;
    const confPwInput = document.getElementById("confirmPassword") as HTMLInputElement;
    const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
    const pw = newPwInput.value;
    const conf = confPwInput.value;
    let valid = true;

    if (!pw) { setFieldError("newPassword", "Please enter a new password."); valid = false; }
    else {
      const result = evaluatePassword(pw);
      if (result.score < 2) { setFieldError("newPassword", "Password is too weak."); valid = false; }
    }
    if (!conf) { setFieldError("confirmPassword", "Please confirm your new password."); valid = false; }
    else if (conf !== pw) { setFieldError("confirmPassword", "Passwords do not match."); valid = false; }

    if (!valid) return;

    const originalHTML = resetBtn.innerHTML;
    resetBtn.disabled = true;
    resetBtn.innerHTML = `<div class="spinner"></div><span>Updating…</span>`;

    // Get token from URL
    const token = new URLSearchParams(window.location.search).get("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      // Previously the success screen was shown unconditionally,
      // regardless of whether the request actually succeeded — even a
      // failed/network-errored request told the user their password
      // had been updated.
      if (!res.ok) {
        setFieldError("confirmPassword", "Could not reset your password. The link may have expired.");
        return;
      }
      showState("state-success");
    } catch (e) {
      console.error(e);
      setFieldError("confirmPassword", "Something went wrong. Please check your connection and try again.");
    } finally {
      resetBtn.disabled = false;
      resetBtn.innerHTML = originalHTML;
    }
  };

  return (
    <div className="page-reset-password">
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="panel-inner">
          <div className="brand">
            <div className="brand-dot">
              <svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <span>MediBook</span>
          </div>

          {/* State: Reset form */}
          <div className="form-state active" id="state-reset">
            <div className="form-header">
              <div className="form-icon amber"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
              <h1>Create new password</h1>
              <p>Your new password must be at least 8 characters long.</p>
            </div>
            <div className="form-body">
              <div className="field-group">
                <label htmlFor="newPassword">New password</label>
                <div className="field-wrap">
                  <svg className="field-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  <input type="password" id="newPassword" placeholder="Enter new password" autoComplete="new-password"
                    onChange={(e) => { clearFieldError("newPassword"); renderStrength(e.target.value); }} />
                  <button className="toggle-pw" data-target="newPassword" type="button">
                    <svg className="eye-show" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    <svg className="eye-hide" viewBox="0 0 24 24" style={{ display: "none" }}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  </button>
                </div>
                <span className="field-error" id="newPasswordError"></span>
              </div>

              <div className="strength-wrap" id="strengthWrap">
                <div className="strength-bars">
                  <div className="strength-bar" id="sb1"></div>
                  <div className="strength-bar" id="sb2"></div>
                  <div className="strength-bar" id="sb3"></div>
                  <div className="strength-bar" id="sb4"></div>
                </div>
                <span className="strength-label" id="strengthLabel">Too short</span>
              </div>

              <div className="strength-rules" id="strengthRules">
                <div className="rule" id="rule-length"><div className="rule-icon"></div><span>At least 8 characters</span></div>
                <div className="rule" id="rule-upper"><div className="rule-icon"></div><span>One uppercase letter</span></div>
                <div className="rule" id="rule-number"><div className="rule-icon"></div><span>One number</span></div>
                <div className="rule" id="rule-special"><div className="rule-icon"></div><span>One special character</span></div>
              </div>

              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <div className="field-wrap">
                  <input type="password" id="confirmPassword" placeholder="Re-enter new password" autoComplete="new-password"
                    onChange={() => clearFieldError("confirmPassword")} />
                </div>
                <span className="field-error" id="confirmPasswordError"></span>
              </div>

              <button className="btn-primary full" id="resetBtn" onClick={handleReset}>
                <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                <span>Reset Password</span>
              </button>
              <Link className="back-link" href="/login"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>Back to sign in</Link>
            </div>
          </div>

          {/* State: Expired */}
          <div className="form-state" id="state-expired">
            <div className="form-header">
              <div className="form-icon coral"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div>
              <h1>Link expired</h1>
              <p>This password reset link has expired. Request a new one below.</p>
            </div>
            <div className="form-body">
              <Link className="btn-primary full no-underline" href="/forgot-password">
                <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                <span>Request new link</span>
              </Link>
              <Link className="back-link" href="/login"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>Back to sign in</Link>
            </div>
          </div>

          {/* State: Success */}
          <div className="form-state" id="state-success">
            <div className="form-header">
              <div className="form-icon success"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
              <h1>Password updated!</h1>
              <p>Your password has been reset successfully.</p>
            </div>
            <div className="form-body">
              <div className="success-note">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                <span>All active sessions have been signed out for your security.</span>
              </div>
              <Link className="btn-primary full no-underline" href="/login">
                <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                <span>Sign in now</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-deco">
        <div className="deco-content">
          <div className="deco-card">
            <div className="deco-card-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h3>Your account is protected</h3>
            <p>Use a strong, unique password and enable two-factor authentication.</p>
          </div>
          <div className="deco-tips">
            <div className="deco-tip"><div className="deco-tip-num">01</div><div><strong>Use a passphrase</strong><p>A string of random words is easier to remember.</p></div></div>
            <div className="deco-tip"><div className="deco-tip-num">02</div><div><strong>Never reuse passwords</strong><p>Each account should have its own unique password.</p></div></div>
            <div className="deco-tip"><div className="deco-tip-num">03</div><div><strong>Enable 2FA</strong><p>Two-factor authentication adds a critical layer of protection.</p></div></div>
          </div>
        </div>
        <div className="deco-bg-orb orb1"></div>
        <div className="deco-bg-orb orb2"></div>
        <div className="deco-grid"></div>
      </div>
    </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./login.style.css";
import { setCookie, getCookie, apiUrl } from "../../lib/utils";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // redirectIfAuth
    if (getCookie("accessToken")) {
      const role = getCookie("role");
      if (role === "Doctor") router.push("/doctor-dashboard");
      else if (role === "User") router.push("/user-dashboard");
      else if (role === "Admin") router.push("/doctor-management");
      else router.push("/");
    }
  }, [router]);

  const togglePw = () => {
    const input = document.getElementById("password") as HTMLInputElement;
    const icon = document.getElementById("pw-icon") as HTMLElement;
    if (input.type === "password") {
      input.type = "text";
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      input.type = "password";
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };

  const handleLogin = async () => {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const pwInput = document.getElementById("password") as HTMLInputElement | null;
    const alertEl = document.getElementById("alert") as HTMLElement | null;
    const submitBtn = document.getElementById("login-submit") as HTMLButtonElement | null;
    if (!emailInput || !pwInput || !alertEl || !submitBtn) return;

    const email = emailInput.value.trim();
    const pw = pwInput.value;

    if (!email || !pw) {
      alertEl.textContent = "Please fill in all fields.";
      alertEl.style.display = "block";
      return;
    }
    if (submitBtn.classList.contains("loading")) return; // guard against double submit
    alertEl.style.display = "none";
    submitBtn.classList.add("loading");
    submitBtn.setAttribute("disabled", "true");

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const response = await res.json();

      if (!res.ok || !response.success) {
        alertEl.textContent = response.message || "Incorrect email or password. Please try again.";
        alertEl.style.display = "block";
        return;
      }

      setCookie("accessToken", response?.accessToken);
      setCookie("refreshToken", response?.refreshToken);
      setCookie("userId", response?.userId);
      setCookie("role", response?.role);
      if (response?.role === "Doctor") router.push("/doctor-dashboard");
      else if (response?.role === "User") router.push("/user-dashboard");
      else router.push("/doctor-management");
    } catch (error) {
      console.error(error);
      alertEl.textContent = "Something went wrong. Please check your connection and try again.";
      alertEl.style.display = "block";
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.removeAttribute("disabled");
    }
  };

  return (
    <>
      {/* LEFT PANEL */}
      <div className="panel-left">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L12 7M12 17L12 22M7 12L2 12M22 12L17 12M12 12m-2 0a2 2 0 104 0 2 2 0 00-4 0" />
              <path d="M17.5 6.5L14 10M10 14L6.5 17.5M17.5 17.5L14 14M10 10L6.5 6.5" />
            </svg>
          </div>
          <span className="brand-name">MediBook</span>
        </div>

        <div className="panel-copy">
          <h1>Your health,<br /><em>beautifully</em><br />organized.</h1>
          <p>Book appointments, track your medical history, and connect with top specialists — all in one place.</p>
        </div>

        <div className="stats-row">
          <div className="stat"><span className="stat-num">12k+</span><span className="stat-label">Patients</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-num">340</span><span className="stat-label">Doctors</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-num">98%</span><span className="stat-label">Satisfaction</span></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="panel-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Don&apos;t have an account? <Link href="/register">Create one</Link></p>
          </div>

          <div className="alert" id="alert" style={{ display: "none" }}>Incorrect email or password. Please try again.</div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <input type="email" id="email" placeholder="you@example.com" autoComplete="email" />
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input type="password" id="password" placeholder="••••••••" autoComplete="current-password" />
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <button className="toggle-pw" type="button" onClick={togglePw} aria-label="Show password">
                <svg id="pw-icon" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input type="checkbox" id="remember" />
              Remember me
            </label>
            <Link className="forgot-link" href="/forgot-password">Forgot password?</Link>
          </div>

          <button className="btn-primary" id="login-submit" onClick={handleLogin}>
            <span className="spinner"></span>
            <span className="btn-label">Sign in to MediBook</span>
          </button>

          <div className="divider">
            <div className="divider-line"></div>
            <span>OR CONTINUE WITH</span>
            <div className="divider-line"></div>
          </div>

          <button className="btn-social">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <button className="btn-social">
            <svg viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </button>
        </div>
      </div>
    </>
  );
}

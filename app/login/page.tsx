"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./login.style.css";
import { setCookie, getCookie, apiUrl, AUTH_COOKIE } from "../../lib/utils";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const router = useRouter();
  // Google's Identity Services button only renders as a real (iframe-based)
  // widget — you can't style it as our own "Continue with Google" button
  // and can't synthetically .click() into an iframe from JS. So it's
  // rendered here at the same size, stacked exactly on top of our styled
  // button and made invisible; clicks land on Google's real button while
  // what's visible underneath is ours.
  const googleBtnHostRef = useRef<HTMLDivElement>(null);

  const completeLogin = (response: { userId: string | number; role: string }) => {
    // accessToken/refreshToken are real HttpOnly cookies the backend
    // already set on this same response — a script can't read them, and
    // can't even overwrite them with a same-named plain cookie either,
    // since browsers silently block a non-HttpOnly write from clobbering
    // an existing HttpOnly one. AUTH_COOKIE is what every page's "am I
    // logged in?" check reads instead — set only here (a real, completed
    // login), never on register, so a brand-new signup that hasn't
    // verified its OTP yet doesn't read as "already logged in".
    setCookie("userId", String(response.userId));
    setCookie("role", response.role);
    setCookie(AUTH_COOKIE, "1");
    if (response.role === "Doctor") window.location.href = "/doctor-dashboard";
    else if (response.role === "User") window.location.href = "/user-dashboard";
    else window.location.href = "/admin-dashboard";
  };

  const handleGoogleCredential = async (credentialResponse: { credential: string }) => {
    const alertEl = document.getElementById("alert") as HTMLElement | null;
    try {
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const response = await res.json();
      if (!res.ok || !response.success) {
        if (alertEl) {
          alertEl.textContent = response.message || "Google sign-in failed. Please try again.";
          alertEl.style.display = "block";
        }
        return;
      }
      completeLogin(response);
    } catch (error) {
      console.error(error);
      if (alertEl) {
        alertEl.textContent = "Something went wrong. Please check your connection and try again.";
        alertEl.style.display = "block";
      }
    }
  };

  const initGoogleButton = () => {
    if (!googleClientId || !googleBtnHostRef.current || typeof window === "undefined") return;
    const google = (window as any).google;
    if (!google?.accounts?.id) return;
    google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential });
    google.accounts.id.renderButton(googleBtnHostRef.current, { type: "standard", theme: "outline", size: "large", width: 340 });
  };

  useEffect(() => {
    // redirectIfAuth
    // These three land on the Sidebar-based dashboards, whose CSS is
    // several thousand lines of unscoped global rules per page. A
    // router.push() client-side transition could paint before that
    // page's stylesheet has fully loaded/applied, showing a broken
    // layout until a manual refresh. window.location.href forces a
    // real full-page load, which always waits for CSS first.
    const redirectIfAuth = () => {
      if (getCookie(AUTH_COOKIE)) {
        const role = getCookie("role");
        if (role === "Doctor") window.location.href = "/doctor-dashboard";
        else if (role === "User") window.location.href = "/user-dashboard";
        else if (role === "Admin") window.location.href = "/admin-dashboard";
        else router.push("/");
      }
    };

    redirectIfAuth();

    // Swiping/navigating "back" to this page can restore it from the
    // browser's bfcache instead of remounting it — the effect above
    // never re-runs in that case, so a logged-in user swiping back to
    // /login briefly sees the login form again instead of being sent
    // straight to their dashboard. On top of that, this page's CSS is
    // a large unscoped stylesheet, so the restored snapshot can also
    // come back visibly broken. A real reload (not just re-running the
    // redirect check) fixes both the same way a manual refresh does,
    // and still ends up redirecting once the page comes back fresh.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
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
        credentials: "include",
        body: JSON.stringify({ email, password: pw }),
      });
      const response = await res.json();

      if (!res.ok || !response.success) {
        alertEl.textContent = response.message || "Incorrect email or password. Please try again.";
        alertEl.style.display = "block";
        return;
      }

      completeLogin(response);
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
    <div className="page-login">
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
            <p>Don't have an account? <Link href="/register">Create one</Link></p>
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

          <div className="google-btn-wrap">
            <button className="btn-social" type="button" tabIndex={-1}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <div className="google-btn-real" ref={googleBtnHostRef}></div>
          </div>
        </div>
      </div>
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initGoogleButton}
        />
      )}
    </div>
  );
}

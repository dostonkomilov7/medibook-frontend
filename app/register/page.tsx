"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./register.style.css";
import { setCookie, getCookie, apiUrl } from "../../lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  // Was an uncontrolled radio pair where selecting "Doctor" tried to
  // imperatively set `role-doctor`'s .value to "Doctor" from onChange
  // (see updateSteps below) — but that input's JSX also declares a
  // static value="User", and React's own input-value-tracking
  // safeguard resets the DOM value back to match that JSX prop right
  // after every change event fires, regardless of the imperative
  // write. So "Doctor" never stuck: whichever role you picked, the
  // read at submit time (`roleDoctorEl.value`) always came back
  // "User". Driving the selection through real state sidesteps the
  // fight with React entirely.
  const [role, setRole] = useState<"User" | "Doctor">("User");

  useEffect(() => {
    // window.location.href (not router.push) for the dashboard
    // redirects: those pages' CSS is unscoped global stylesheets, and
    // a client-side transition could paint before it's loaded. A full
    // page nav always waits for CSS first — see app/login/page.tsx.
    const redirectIfAuth = () => {
      if (getCookie("userId")) {
        const role = getCookie("role");
        if (role === "Doctor") window.location.href = "/doctor-dashboard";
        else if (role === "User") window.location.href = "/user-dashboard";
        else if (role === "Admin") window.location.href = "/admin-dashboard";
        else router.push("/");
      }
    };

    redirectIfAuth();

    // Swiping/navigating "back" to this page can restore it from the
    // browser's bfcache instead of remounting it, which skips the
    // effect above — and this page's CSS is a large unscoped
    // stylesheet, so the restored snapshot can also come back visibly
    // broken. A real reload fixes both the same way a manual refresh
    // does, and still ends up redirecting once the page loads fresh.
    // See app/login/page.tsx for the full explanation.
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

  const colors = ["#E24B4A", "#EF9F27", "#1D9E75", "#0F6E56"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  const checkStrength = (val: string) => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    for (let i = 1; i <= 4; i++) {
      const bar = document.getElementById("sb" + i) as HTMLElement;
      if (bar) bar.style.background = i <= score ? colors[score - 1] : "var(--gray-100)";
    }
    const txt = document.getElementById("strength-text") as HTMLElement;
    if (txt) {
      txt.textContent = val.length ? labels[score - 1] || "" : "";
      txt.style.color = val.length && score > 0 ? colors[score - 1] : "var(--gray-400)";
    }
  };

  const updateSteps = () => {
    const steps = ["step-1", "step-2", "step-3"];
    steps.forEach((id, i) => {
      const el2 = document.getElementById(id) as HTMLElement;
      if (el2) el2.className = "step-dot" + (i === 0 ? " active" : "");
    });
    const stepLabel = document.getElementById("step-label") as HTMLElement;
    if (stepLabel) stepLabel.textContent = "Personal info";
  };

  const handleRegister = async () => {
    const fnameEl = document.getElementById("first-name") as HTMLInputElement | null;
    const lnameEl = document.getElementById("last-name") as HTMLInputElement | null;
    const emailEl = document.getElementById("email") as HTMLInputElement | null;
    const phoneEl = document.getElementById("phone") as HTMLInputElement | null;
    const dobEl = document.getElementById("dob") as HTMLInputElement | null;
    const pwEl = document.getElementById("password") as HTMLInputElement | null;
    const termsEl = document.getElementById("terms") as HTMLInputElement | null;
    const alertEl = document.getElementById("alert") as HTMLElement | null;
    const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement | null;
    if (!fnameEl || !lnameEl || !emailEl || !phoneEl || !dobEl || !pwEl || !termsEl || !alertEl || !submitBtn) return;

    const fname = fnameEl.value.trim();
    const lname = lnameEl.value.trim();
    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();
    const dob = dobEl.value;
    const pw = pwEl.value;
    const terms = termsEl.checked;

    if (!fname || !lname || !email || !pw || !phone) {
      alertEl.textContent = "Please fill in all required fields.";
      alertEl.style.display = "block";
      return;
    }
    if (pw.length < 8) {
      alertEl.textContent = "Password must be at least 8 characters.";
      alertEl.style.display = "block";
      return;
    }
    if (!terms) {
      alertEl.textContent = "Please agree to the Terms of Service to continue.";
      alertEl.style.display = "block";
      return;
    }
    if (submitBtn.classList.contains("loading")) return; // guard against double submit

    const fullName = fname + " " + lname;
    alertEl.style.display = "none";
    submitBtn.classList.add("loading");
    submitBtn.setAttribute("disabled", "true");

    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          age: dob || null,
          email,
          password: pw,
          phone,
          role,
        }),
      });
      const response = await res.json();

      if (!res.ok || !response.success) {
        alertEl.textContent = response.message || "Registration failed. Please try again.";
        alertEl.style.display = "block";
        return;
      }

      setCookie("userId", response?.userId);
      setCookie("role", response?.role);
      const emailParam = encodeURIComponent(email);
      router.push(`/verify-email?email=${emailParam}`);
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
    <div className="page-register">
      {/* LEFT: FORM */}
      <div className="panel-left">
        <div className="form-card">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L12 7M12 17L12 22M7 12L2 12M22 12L17 12" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="brand-name">MediBook</span>
          </div>

          <div className="form-header">
            <h2>Create your account</h2>
            <p>Already have one? <Link href="/login">Sign in</Link></p>
          </div>

          <div className="steps">
            <div className="step-dot active" id="step-1"></div>
            <div className="step-dot" id="step-2"></div>
            <div className="step-dot" id="step-3"></div>
            <span className="step-label" id="step-label">Personal info</span>
          </div>

          <div className="field">
            <label>I am registering as</label>
          </div>
          <div className="role-selector">
            <div className="role-option">
              <input type="radio" name="role" id="role-patient" checked={role === "User"} onChange={() => { setRole("User"); updateSteps(); }} />
              <label className="role-label" htmlFor="role-patient">
                <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <span>Patient</span>
                <small>Book appointments</small>
              </label>
            </div>
            <div className="role-option">
              <input type="radio" name="role" id="role-doctor" checked={role === "Doctor"} onChange={() => { setRole("Doctor"); updateSteps(); }} />
              <label className="role-label" htmlFor="role-doctor">
                <svg viewBox="0 0 24 24"><path d="M12 14v7M9 21h6M12 3C9.79 3 8 4.79 8 7v1H6v5a6 6 0 0012 0V8h-2V7c0-2.21-1.79-4-4-4z" /></svg>
                <span>Doctor</span>
                <small>Manage patients</small>
              </label>
            </div>
          </div>

          <div className="alert" id="alert" style={{ display: "none" }}></div>

          <div className="fields-row">
            <div className="field">
              <label htmlFor="first-name">First name</label>
              <div className="input-wrap">
                <input type="text" id="first-name" placeholder="John" autoComplete="given-name" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="last-name">Last name</label>
              <div className="input-wrap">
                <input type="text" id="last-name" placeholder="Doe" autoComplete="family-name" />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <input type="email" id="email" placeholder="you@example.com" autoComplete="email" />
            </div>
          </div>

          <div className="fields-row">
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <div className="input-wrap">
                <input type="tel" id="phone" placeholder="+1 555 000 0000" autoComplete="tel" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <div className="input-wrap">
                <input type="date" id="dob" autoComplete="bday" />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input type="password" id="password" placeholder="At least 8 characters" autoComplete="new-password"
                onChange={(e) => checkStrength(e.target.value)} />
              <button className="toggle-pw" type="button" onClick={togglePw} aria-label="Show password">
                <svg id="pw-icon" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <div className="pw-strength">
              <div className="strength-bar" id="sb1"></div>
              <div className="strength-bar" id="sb2"></div>
              <div className="strength-bar" id="sb3"></div>
              <div className="strength-bar" id="sb4"></div>
              <span className="strength-text" id="strength-text"></span>
            </div>
          </div>

          <div className="terms-row">
            <input type="checkbox" id="terms" />
            <p>I agree to MediBook&apos;s <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
          </div>

          <button className="btn-primary" id="submit-btn" onClick={handleRegister}>
            <span className="spinner"></span>
            <span>Create my account</span>
          </button>
        </div>
      </div>

      {/* RIGHT: BENEFITS */}
      <div className="panel-right">
        <h2 className="benefits-title">Everything you need,<br /><em>all in one place.</em></h2>
        <ul className="benefit-list">
          <li className="benefit-item">
            <div className="benefit-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
            <div className="benefit-text"><h4>Smart scheduling</h4><p>Book with the right specialist in seconds.</p></div>
          </li>
          <li className="benefit-item">
            <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg></div>
            <div className="benefit-text"><h4>Your health records</h4><p>Access your prescriptions anytime, anywhere.</p></div>
          </li>
          <li className="benefit-item">
            <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></div>
            <div className="benefit-text"><h4>Direct messaging</h4><p>Chat with your doctor between visits.</p></div>
          </li>
          <li className="benefit-item">
            <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <div className="benefit-text"><h4>HIPAA compliant</h4><p>End-to-end encryption on all your data.</p></div>
          </li>
        </ul>
        <div className="panel-bottom-tag">
          <div className="tag-dot"></div>
          <span>340 doctors available now</span>
        </div>
      </div>
    </div>
  );
}

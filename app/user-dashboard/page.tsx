"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, notFound } from "next/navigation";
import "./user-dashboard.style.css";
import { getCookie, getUserData, escapeHtml, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

export default function UserDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "User") {
      notFound();
    }
    init();
  }, [router]);

  const init = async () => {
    const userData = await getUserData();
    if (!userData) return;
    const user = userData.users[0];

    const setEl = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    };

    setEl(".headers", user.full_name);
    setEl(".intro", user.full_name);
    setEl(".name", user.full_name);
    setEl(".topbar-avatar", user.full_name[0].toUpperCase());
    setEl(".user-avatar", user.full_name[0].toUpperCase());
    setEl(".role", `${user.role === "User" ? "Patient" : user.role} • ID #${user.id}`);

    const fullDate = String(new Date().toDateString()).split(" ");
    setEl(".date", fullDate.join(", "));

    await getAppointments();
  };

  const getAppointments = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/appointments/${userId}`, { credentials: "include" });
      const data = await res.json();
      const appointments = document.querySelector(".app-list");
      const totalAppointments = document.querySelector(".stat-value");
      if (!appointments) return;

      if (!data.appointments || data.appointments.count === 0) {
        document.querySelector(".table-card")?.insertAdjacentHTML("beforeend",
          `<h5 style="text-align:center;padding:20px 0;">Appointments not found</h5>`);
        return;
      }
      if (totalAppointments) totalAppointments.textContent = data.appointments.count;

      // Reset before appending — without this, re-running getAppointments
      // (Strict Mode double-invoke in dev, or navigating back here)
      // duplicated every row.
      appointments.innerHTML = "";
      data.appointments.rows.forEach((element: any) => {
        appointments.innerHTML += `
          <tr>
            <td>
              <div class="doctor-cell">
                <div class="doc-avatar a">${escapeHtml(element.doctor.user.full_name[0])}</div>
                <div>
                  <div class="doc-name">Dr. ${escapeHtml(element.doctor.user.full_name)}</div>
                  <div class="doc-spec">${escapeHtml(element.doctor.specialization)}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="apt-date">${escapeHtml(element.appointment_date)}</div>
              <div class="apt-time">${escapeHtml(element.appointment_time)}</div>
            </td>
            <td><span class="type-tag in-person">In-person</span></td>
            <td><span class="status-pill confirmed">${escapeHtml(element.status)}</span></td>
            <td><button class="row-action">Details</button></td>
          </tr>`;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const accessTelegram = () => {
    const userId = getCookie("userId");
    window.location.href = `https://t.me/medibook_clinic_bot?start=${userId}`;
  };

  return (
    <div className="page-user-dashboard">
    <div className="app">
      {/* SIDEBAR */}
      <Sidebar>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></a>
          <Link prefetch={false} className="nav-item" href="/my-appointments"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Appointments</span><span className="badge">3</span></Link>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Medical Records</span><span className="badge">Soon</span></a>
          <Link prefetch={false} className="nav-item" href="/chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg><span>Messages</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Health</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Health Metrics</span><span className="badge">Soon</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" /></svg><span>Prescriptions</span><span className="badge">Soon</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Account</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07" /></svg><span>Settings</span><span className="badge">Soon</span></a>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">U</div>
          <div className="user-meta">
            <p className="name">User</p>
            <p className="role">User · ID #777</p>
          </div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        </div>
      </Sidebar>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <HamburgerToggle />
          <h1 className="topbar-title">Good morning, <span className="headers"></span> 👋</h1>
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search doctors, records…" />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="notif-dot"></span>
            </button>
            <div className="topbar-avatar">U</div>
          </div>
        </header>

        <div className="content">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-copy">
              <p className="date"></p>
              <h2>Welcome back, <em className="intro"></em></h2>
            </div>
            <div className="welcome-actions">
              <Link href="/book-appointment"><button className="btn-white">+ Book Appointment</button></Link>
              <button className="btn-outline-white" onClick={accessTelegram}>Go To Telegram</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon teal"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                <span className="stat-change up">New</span>
              </div>
              <div className="stat-value">0</div>
              <div className="stat-label">Total Appointments</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top"><div className="stat-icon coral"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg></div><span className="stat-change neu">Stable</span></div>
              <div className="stat-value">3</div>
              <div className="stat-label">Active Medications</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top"><div className="stat-icon amber"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><span className="stat-change up">↑ Good</span></div>
              <div className="stat-value">72<small style={{ fontSize: 16, color: "var(--gray-400)" }}> bpm</small></div>
              <div className="stat-label">Heart Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><span className="stat-change up">↑ 1 new</span></div>
              <div className="stat-value">12</div>
              <div className="stat-label">Medical Records</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="main-grid">
            <div>
              <div className="section-head"><h3>Upcoming Appointments</h3><Link href="/my-appointments">View all →</Link></div>
              <div className="table-card">
                <table>
                  <thead><tr><th>Doctor</th><th>Date & Time</th><th>Type</th><th>Status</th><th></th></tr></thead>
                  <tbody className="app-list"></tbody>
                </table>
              </div>
              <div className="section-head"><h3>Quick Actions</h3></div>
              <div className="quick-grid">
                <Link href="/book-appointment"><button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></div><span>Book a new appointment</span></button></Link>
                <button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></div><span>Message your doctor</span></button>
                <button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><span>Download medical records</span></button>
                <button className="quick-btn"><div className="quick-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><span>Log health metrics</span></button>
              </div>
            </div>
            <div className="right-col">
              <div className="card">
                <div className="section-head"><h3>Health Summary</h3><a href="#">Details →</a></div>
                <div className="health-items">
                  {[
                    { name: "Blood Pressure", val: "118/76 mmHg", w: "72%", cls: "green" },
                    { name: "Blood Sugar", val: "98 mg/dL", w: "55%", cls: "blue" },
                    { name: "BMI", val: "24.1", w: "60%", cls: "amber" },
                    { name: "Cholesterol", val: "180 mg/dL", w: "45%", cls: "coral" },
                  ].map((h) => (
                    <div className="health-item" key={h.name}>
                      <div className="health-row"><span className="health-name">{h.name}</span><span className="health-val">{h.val}</span></div>
                      <div className="health-bar"><div className={`health-fill ${h.cls}`} style={{ width: h.w }}></div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="section-head"><h3>Medications</h3><a href="#">All →</a></div>
                <div className="med-list">
                  {[
                    { name: "Lisinopril", dose: "10 mg · Once daily", time: "8:00 AM", dot: "green" },
                    { name: "Atorvastatin", dose: "20 mg · Once nightly", time: "10:00 PM", dot: "coral" },
                    { name: "Metformin", dose: "500 mg · Twice daily", time: "8 AM / 8 PM", dot: "blue" },
                  ].map((m) => (
                    <div className="med-item" key={m.name}>
                      <div className={`med-dot ${m.dot}`}></div>
                      <div className="med-info"><div className="med-name">{m.name}</div><div className="med-dose">{m.dose}</div></div>
                      <span className="med-time">{m.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}

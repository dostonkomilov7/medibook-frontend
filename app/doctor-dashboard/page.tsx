"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./doctor-dashboard.style.css";
import "../alert.style.css";
import { getCookie, getUserData, strMonth, getAge, escapeHtml, apiUrl, signOut } from "../../lib/utils";

export default function DoctorDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "Doctor") {
      // router.back() could bounce the user right back to a page that
      // redirects here again (e.g. login), causing a loop. Send them
      // somewhere safe instead, and use MediAlert instead of a
      // blocking native alert().
      (window as any).MediAlert?.toast({ type: "error", title: "Access Denied", message: "You do not have permission to view this page." });
      router.push("/");
      return;
    }
    init();
  }, [router]);

  const init = async () => {
    const userData = await getUserData();
    if (!userData) return;
    const user = userData.users[0];
    const doctor = user.doctors?.[0];

    const setEl = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    };

    setEl(".name", user.full_name);
    setEl(".title-name", user.full_name);
    setEl(".avatar-btn", user.full_name[0].toUpperCase());
    setEl(".doc-avatar-lg", user.full_name[0].toUpperCase());
    setEl(".spec", `${doctor?.specialization} • ${doctor?.room_number}`);
    setEl(".topbar-sub", doctor?.department || "");
    setEl(".date", String(new Date().toDateString()).split(" ").join(", "));

    await getDoctorApp();
  };

  const getDoctorApp = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    const res = await fetch(`${apiUrl}/doctors/${userId}`);
    const data = await res.json();
    const recentPatients = document.querySelector(".recent-patients");
    if (!recentPatients || !data.doctors?.[0]) return;

    const userData = await getUserData();
    const doctor = userData?.users[0]?.doctors?.[0];

    // Reset before appending — without this, re-running getDoctorApp
    // (e.g. React Strict Mode double-invoking effects in dev, or the
    // user navigating back to this page) kept appending rows on top
    // of the ones already rendered, duplicating the list.
    recentPatients.innerHTML = "";
    data.doctors[0].appointments.forEach((element: any) => {
      recentPatients.innerHTML += `
        <tr>
          <td>
            <div class="patient-cell">
              <div class="pt-avatar b">${escapeHtml(element.user.full_name[0].toUpperCase())}</div>
              <div>
                <div class="pt-name">${escapeHtml(element.user.full_name)}</div>
                <div class="pt-id">ID #${escapeHtml(String(element.user.id))} · ${getAge(element.user.age)}y</div>
              </div>
            </div>
          </td>
          <td style="color:var(--gray-600);font-size:13px;">${strMonth(element.appointment_date)} ${element.appointment_date.split("-").at(2)}</td>
          <td style="font-size:13px;color:var(--gray-600);">Problem related to ${escapeHtml(doctor?.department || "")}</td>
          <td><span class="risk-pill medium">Medium</span></td>
          <td><span class="status-pill ${element.status.toLowerCase()}">${escapeHtml(element.status)}</span></td>
        </tr>`;
    });
  };

  const accessTelegram = () => {
    const userId = getCookie("userId");
    window.location.href = `https://t.me/medibook_clinic_bot?start=${userId}`;
  };

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-dot"><svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg></div>
          <span className="brand-text">MediBook</span>
          <span className="brand-badge">MD</span>
        </div>
        <div style={{ padding: "0.75rem 0.75rem 0.25rem" }}>
          <div className="sidebar-doctor">
            <div className="doc-avatar-lg"></div>
            <div className="doc-info"><p className="name"></p><p className="spec"></p></div>
            <div className="online-dot"></div>
          </div>
        </div>
        <nav className="nav-section">
          <p className="nav-label">Clinic</p>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></a>
          <Link className="nav-item" href="/schedule"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Schedule</span></Link>
          <Link className="nav-item" href="/all-patients"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span>My Patients</span></Link>
          <Link className="nav-item" href="/chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg><span>Messages</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Clinical</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Records & Notes</span><span className="badge">Soon</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" /></svg><span>Prescriptions</span><span className="badge">Soon</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Lab Results</span><span className="badge">Soon</span></a>
        </nav>
        <nav className="nav-section" style={{ marginTop: "auto" }}>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07" /></svg><span>Settings</span><span className="badge">Soon</span></a>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
      </aside>
      {/* Below 768px .sidebar slides off-screen (see CSS); without this
          overlay + button there was no way to bring it back, so all
          navigation (including Sign out) became unreachable on mobile. */}
      <div className="sidebar-overlay" onClick={() => { document.querySelector(".sidebar")?.classList.remove("open"); document.querySelector(".sidebar-overlay")?.classList.remove("open"); }}></div>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" aria-label="Toggle menu" onClick={() => { document.querySelector(".sidebar")?.classList.toggle("open"); document.querySelector(".sidebar-overlay")?.classList.toggle("open"); }}>
              <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="topbar-title">Doctor <span>Overview</span></div>
            <div className="topbar-sub"></div>
          </div>
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search patients, records…" />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg><span className="notif-dot"></span></button>
            <div className="avatar-btn"></div>
          </div>
        </header>

        <div className="content">
          {/* Today Banner */}
          <div className="today-banner">
            <div className="banner-copy">
              <p className="date"></p>
              <h2>Good morning, <em className="title-name"></em></h2>
              <p>Have a Nice Day Mr Doctor</p>
            </div>
            <div className="banner-stats">
              <div className="banner-stat"><div className="num">7</div><div className="lbl">Today&apos;s Appts</div></div>
              <div className="banner-divider"></div>
              <div className="banner-stat"><div className="num">142</div><div className="lbl">Active Patients</div></div>
              <div className="banner-divider"></div>
              <div className="banner-stat"><div className="num">4</div><div className="lbl">Messages</div></div>
            </div>
            <button className="btn-teal" onClick={accessTelegram}>Go To Telegram</button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon teal"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div><span className="stat-change up">↑ 8 this week</span></div>
              <div className="stat-value">142</div><div className="stat-label">Total Active Patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon coral"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div><span className="stat-change down">↑ 2 critical</span></div>
              <div className="stat-value">3</div><div className="stat-label">Urgent Cases</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon amber"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><span className="stat-change warn">2 pending</span></div>
              <div className="stat-value">18</div><div className="stat-label">Lab Results</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><span className="stat-change up">↑ 94%</span></div>
              <div className="stat-value">4.9<small style={{ fontSize: 16, color: "var(--gray-400)" }}>★</small></div><div className="stat-label">Patient Rating</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="main-grid">
            <div className="left-col">
              <div>
                <div className="section-head"><h3>Recent Patients</h3><Link href="/all-patients">All patients →</Link></div>
                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th><th>Visit Date</th><th>Condition</th>
                        <th>Risk</th><th>Appointment Status</th>
                      </tr>
                    </thead>
                    <tbody className="recent-patients"></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="right-col">
              <div className="card">
                <div className="section-head" style={{ marginBottom: "1.1rem" }}><h3>This Week</h3><a href="#">Details →</a></div>
                <div className="donut-wrap">
                  <svg className="donut-svg" width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#EDEDEA" strokeWidth="14" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1D9E75" strokeWidth="14" strokeDasharray="107 239" strokeDashoffset="0" strokeLinecap="butt" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#378ADD" strokeWidth="14" strokeDasharray="83 239" strokeDashoffset="-107" strokeLinecap="butt" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#EDEDEA" strokeWidth="14" strokeDasharray="48 239" strokeDashoffset="-190" strokeLinecap="butt" transform="rotate(-90 50 50)" />
                    <text x="50" y="47" textAnchor="middle" fontFamily="DM Serif Display,serif" fontSize="18" fill="#2C2C2A">28</text>
                    <text x="50" y="58" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="#888780">appts</text>
                  </svg>
                  <div className="donut-legend">
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--teal-400)" }}></div><span className="lbl">In-person</span><span className="val">13</span></div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--blue-400)" }}></div><span className="lbl">Virtual</span><span className="val">10</span></div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--gray-200)" }}></div><span className="lbl">Cancelled</span><span className="val">5</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="mediModalOverlay" onClick={(e) => (window as any).MediAlert?._handleOverlayClick(e)}>
        <div className="modal-box" id="mediModalBox">
          <div className="modal-icon-area" id="mediModalIconArea"></div>
          <div className="modal-detail" id="mediModalDetail" style={{ display: "none" }}></div>
          <div className="modal-footer" id="mediModalFooter"></div>
        </div>
      </div>
      <div className="toast-stack" id="toastStack"></div>
    </div>
  );
}

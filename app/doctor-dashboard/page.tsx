"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "./doctor-dashboard.style.css";
import { getCookie, getUserData, strMonth, getAge, escapeHtml, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const URGENCY_RISK: Record<string, { cls: string; label: string }> = {
  Urgent: { cls: "high", label: "Urgent" },
  Soon: { cls: "medium", label: "Soon" },
  Routine: { cls: "low", label: "Routine" },
};

const STATUS_COLORS: Record<string, string> = {
  Confirmed: "#1D9E75",
  Pending: "#EF9F27",
  Completed: "#378ADD",
  Cancelled: "#9A9890",
};
const DONUT_R = 38;
const DONUT_C = 2 * Math.PI * DONUT_R;

// "9:00 AM"/"11:30 PM" -> minutes since midnight, for correctly ordering
// same-day visits (a plain string compare puts "10:00 AM" before "9:00 AM").
function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(t).trim());
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[3]?.toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
}

type Stats = {
  todaysAppts: number; totalPatients: number; pendingCount: number;
  totalAppointments: number; urgentCount: number; weeklyTotal: number; completedCount: number;
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    todaysAppts: 0, totalPatients: 0, pendingCount: 0,
    totalAppointments: 0, urgentCount: 0, weeklyTotal: 0, completedCount: 0,
  });
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "Doctor") {
      notFound();
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
    const res = await fetch(`${apiUrl}/doctors/${userId}`, { credentials: "include" });
    const data = await res.json();
    const recentPatients = document.querySelector(".recent-patients");
    if (!recentPatients || !data.doctors?.[0]) return;

    const appointments: any[] = data.doctors[0].appointments ?? [];

    // Reset before appending — without this, re-running getDoctorApp
    // (e.g. React Strict Mode double-invoking effects in dev, or the
    // user navigating back to this page) kept appending rows on top
    // of the ones already rendered, duplicating the list.
    recentPatients.innerHTML = "";
    // Cap to the 5 most recent visits here — the rest is a click away via
    // "All patients →". Sorted by date (then time) descending so "recent"
    // actually means recent, not just whatever order the API happened to
    // return rows in.
    const recentFive = [...appointments]
      .sort((a: any, b: any) => {
        const dateDiff = String(b.appointment_date).localeCompare(String(a.appointment_date));
        if (dateDiff !== 0) return dateDiff;
        return timeToMinutes(b.appointment_time) - timeToMinutes(a.appointment_time);
      })
      .slice(0, 5);
    recentFive.forEach((element: any) => {
      const risk = URGENCY_RISK[element.urgency] ?? URGENCY_RISK.Routine;
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
          <td><span class="risk-pill ${risk.cls}">${risk.label}</span></td>
          <td style="font-size:13px;color:var(--gray-600);">${escapeHtml(element.reason || "Not specified")}</td>
          <td><span class="status-pill ${element.status.toLowerCase()}">${escapeHtml(element.status)}</span></td>
        </tr>`;
    });

    // Every number below used to be a hardcoded mockup value (7 today's
    // appts, 142 active patients, a fake donut chart keyed off a
    // "type" field the Appointment model doesn't even have…). All of
    // it is now derived from this doctor's real appointment list.
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaysAppts = appointments.filter((a) => a.appointment_date === todayStr).length;
    const totalPatients = new Set(appointments.map((a) => a.user?.id)).size;
    const pendingCount = appointments.filter((a) => a.status === "Pending").length;
    const urgentCount = appointments.filter((a) => a.urgency === "Urgent" && a.status !== "Cancelled" && a.status !== "Completed").length;
    const completedCount = appointments.filter((a) => a.status === "Completed").length;
    console.log(appointments, "AAA")
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const thisWeek = appointments.filter((a) => a.appointment_date >= weekAgoStr && a.appointment_date <= todayStr);
    const byStatus: Record<string, number> = {};
    thisWeek.forEach((a) => { byStatus[a.status] = (byStatus[a.status] ?? 0) + 1; });
    const breakdown = Object.entries(byStatus).map(([status, count]) => ({ status, count }));

    setStats({
      todaysAppts, totalPatients, pendingCount,
      totalAppointments: appointments.length, urgentCount, weeklyTotal: thisWeek.length, completedCount,
    });
    setWeeklyBreakdown(breakdown);
  };

  const accessTelegram = () => {
    const userId = getCookie("userId");
    window.location.href = `https://t.me/medibook_clinic_bot?start=${userId}`;
  };

  return (
    <div className="doctor-shell">
    <div className="app">
      {/* SIDEBAR */}
      <Sidebar badge={<span className="brand-badge">MD</span>}>
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
          <Link prefetch={false} className="nav-item" href="/schedule"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Schedule</span></Link>
          <Link prefetch={false} className="nav-item" href="/all-patients"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span>My Patients</span></Link>
          <Link prefetch={false} className="nav-item" href="/chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg><span>Messages</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Clinical</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Records & Notes</span><span className="badge">Soon</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Lab Results</span><span className="badge">Soon</span></a>
        </nav>
        <nav className="nav-section" style={{ marginTop: "auto" }}>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07" /></svg><span>Settings</span><span className="badge">Soon</span></a>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
      </Sidebar>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <HamburgerToggle />
            <div className="topbar-title">Doctor <span>Overview</span></div>
            <div className="topbar-sub"></div>
          </div>
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search patients, records…" />
          </div>
          <div className="topbar-actions">
            {/* <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg><span className="notif-dot"></span></button> */}
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
              <div className="banner-stat"><div className="num">{stats.todaysAppts}</div><div className="lbl">Today&apos;s Appts</div></div>
              <div className="banner-divider"></div>
              <div className="banner-stat"><div className="num">{stats.totalPatients}</div><div className="lbl">Active Patients</div></div>
              <div className="banner-divider"></div>
              <div className="banner-stat"><div className="num">{stats.pendingCount}</div><div className="lbl">Pending Requests</div></div>
            </div>
            <button className="btn-teal" onClick={accessTelegram}>Go To Telegram</button>
          </div>

          {/* Stats — every card here used to be a fixed mockup number
              (142 patients, 3 urgent, 18 "Lab Results" — a feature that
              doesn't exist server-side, 4.9★ "Patient Rating" — no
              rating system exists either). All four are now computed
              from this doctor's real appointment list; the fake
              "↑ X this week"/"94%" trend badges were dropped since
              there's no real trend computation behind them. */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon teal"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div></div>
              <div className="stat-value">{stats.totalAppointments}</div><div className="stat-label">Total Appointments</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon coral"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div></div>
              <div className="stat-value">{stats.urgentCount}</div><div className="stat-label">Urgent Cases</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon amber"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div></div>
              <div className="stat-value">{stats.weeklyTotal}</div><div className="stat-label">Appointments This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div></div>
              <div className="stat-value">{stats.completedCount}</div><div className="stat-label">Completed Appointments</div>
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
                        <th>Patient</th>
                        <th>Visit Date</th>
                        <th>Urgency</th>
                        <th>Reason</th>
                        <th>Appointment Status</th>
                      </tr>
                    </thead>
                    <tbody className="recent-patients"></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="right-col">
              <div className="card">
                <div className="section-head" style={{ marginBottom: "1.1rem" }}><h3>This Week</h3></div>
                {/* This whole widget used to be a fixed illustration —
                    fake arc lengths adding up to a fake "28 appts", with
                    a legend keyed off a "type" (in-person/virtual) that
                    the Appointment model doesn't even have a column
                    for. It's now a real donut: one arc per appointment
                    status that actually occurred this week, sized to
                    its real share of the week's total. */}
                <div className="donut-wrap">
                  <svg className="donut-svg" width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={DONUT_R} fill="none" stroke="#EDEDEA" strokeWidth="14" />
                    {stats.weeklyTotal > 0 && (() => {
                      let offset = 0;
                      return weeklyBreakdown.map(({ status, count }) => {
                        const len = (count / stats.weeklyTotal) * DONUT_C;
                        const el = (
                          <circle key={status} cx="50" cy="50" r={DONUT_R} fill="none"
                            stroke={STATUS_COLORS[status] ?? "#9A9890"} strokeWidth="14"
                            strokeDasharray={`${len} ${DONUT_C}`} strokeDashoffset={-offset}
                            strokeLinecap="butt" transform="rotate(-90 50 50)" />
                        );
                        offset += len;
                        return el;
                      });
                    })()}
                    <text x="50" y="47" textAnchor="middle" fontFamily="DM Serif Display,serif" fontSize="18" fill="#2C2C2A">{stats.weeklyTotal}</text>
                    <text x="50" y="58" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="#888780">appts</text>
                  </svg>
                  <div className="donut-legend">
                    {weeklyBreakdown.length === 0 ? (
                      <div className="legend-item"><span className="lbl">No appointments this week yet.</span></div>
                    ) : weeklyBreakdown.map(({ status, count }) => (
                      <div className="legend-item" key={status}>
                        <div className="legend-dot" style={{ background: STATUS_COLORS[status] ?? "#9A9890" }}></div>
                        <span className="lbl">{status}</span><span className="val">{count}</span>
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
    </div>
  );
}

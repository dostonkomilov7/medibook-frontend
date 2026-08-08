"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./my-appointments.style.css";
import { getCookie, getUserData, strMonth, escapeHtml, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

export default function MyAppointmentsPage() {
  const router = useRouter();
  const dataRef = useRef<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type = "info") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    init();
  }, [router]);

  const init = async () => {
    const userData = await getUserData();
    if (!userData) return;
    const user = userData.users[0];
    const setEl = (sel: string, val: string) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    setEl(".name", user.full_name);
    setEl(".topbar-avatar", user.full_name[0].toUpperCase());
    setEl(".user-avatar", user.full_name[0].toUpperCase());
    setEl(".role", `${user.role === "User" ? "Patient" : user.role} • ID #${user.id}`);
    await loadAppointments();
  };

  const loadAppointments = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    const res = await fetch(`${apiUrl}/appointments/${userId}`);
    const data = await res.json();
    dataRef.current = data.appointments?.rows || [];

    const upcomingVal = document.getElementById("upcoming-val");
    const pendingVal = document.getElementById("pending-val");
    const completedVal = document.getElementById("completed-val");
    const cancelledVal = document.getElementById("cancelled-val");
    const allCount = document.getElementById("all-count");
    const upcomingCount = document.getElementById("upcoming-count");
    const pendingCount = document.getElementById("pending-count");
    const completedCount = document.getElementById("completed-count");
    const cancelledCount = document.getElementById("cancelled-count");

    if (allCount) allCount.textContent = data.appointments.count;
    if (upcomingVal) upcomingVal.textContent = data.totalUpcoming;
    if (upcomingCount) upcomingCount.textContent = data.totalUpcoming;
    if (pendingVal) pendingVal.textContent = data.totalPending;
    if (pendingCount) pendingCount.textContent = data.totalPending;
    if (completedVal) completedVal.textContent = data.totalCompleted;
    if (completedCount) completedCount.textContent = data.totalCompleted;
    if (cancelledVal) cancelledVal.textContent = data.totalCancelled;
    if (cancelledCount) cancelledCount.textContent = data.totalCancelled;

    const empty = document.getElementById("empty-state");
    if (data.appointments.count === 0) { if (empty) empty.style.display = "block"; return; }

    const upcomingGrid = document.getElementById("upcoming-grid");
    const pastList = document.getElementById("past-list");
    // Clear before appending — previously these were never reset, so
    // re-running loadAppointments (Strict Mode double-invoke in dev,
    // or navigating back to this page) duplicated every card.
    if (upcomingGrid) upcomingGrid.innerHTML = "";
    if (pastList) pastList.innerHTML = "";

    data.appointments.rows.forEach((el: any) => {
      const status = el.status.toLowerCase();
      const mon = strMonth(el.appointment_date);
      const day = el.appointment_date.split("-").at(-1);
      const docName = escapeHtml(el.doctor.user.full_name);
      const spec = escapeHtml(el.doctor.specialization);
      const statusLabel = escapeHtml(el.status);
      if (upcomingGrid) upcomingGrid.innerHTML += `
        <div class="appt-card" data-id="${escapeHtml(String(el.id))}" data-status="${status}" data-doctor="Dr. ${docName}" data-spec="${spec}">
          <div class="appt-card-accent ${el.status === "Pending" ? "amber" : el.status === "Confirmed" ? "blue" : el.status === "Completed" ? "teal" : "coral"}"></div>
          <div class="appt-card-body">
            <div class="appt-card-top">
              <div class="appt-doc-row">
                <div class="appt-doc-avatar b">${escapeHtml(el.doctor.user.full_name[0])}</div>
                <div><div class="appt-doc-name">Dr. ${docName}</div><div class="appt-doc-spec">${spec}</div></div>
              </div>
              <span class="status-pill ${status}">${statusLabel}</span>
            </div>
            <div class="appt-divider"></div>
            <div class="appt-meta-row">
              <div class="appt-meta-item"><div class="appt-meta-label">Date</div><div class="appt-meta-val">${mon} ${day}</div></div>
              <div class="appt-meta-item"><div class="appt-meta-label">Time</div><div class="appt-meta-val">${escapeHtml(el.appointment_time)}</div></div>
              <div class="appt-meta-item"><div class="appt-meta-label">Type</div><div class="appt-meta-val"><div class="type-chip in-person">In-person</div></div></div>
            </div>
            <div class="appt-notes">Room ${escapeHtml(el.doctor.room_number)}, ${escapeHtml(el.doctor.department)} Building.</div>
            <div class="appt-card-actions">
              <a href="https://yandex.com/maps/org/128432379794"><button class="card-btn primary">Directions</button></a>
              ${status === "cancelled" || status === "completed" ? "" : `<button class="card-btn danger" data-cancel-id="${escapeHtml(String(el.id))}">Cancel</button>`}
            </div>
          </div>
        </div>`;
      if (pastList) pastList.innerHTML += `
        <div class="past-item" data-status="${status}" data-doctor="Dr. ${docName}" data-spec="${spec}">
          <div class="past-date-box"><div class="day">${day}</div><div class="mon">${mon}</div></div>
          <div class="past-doc-row">
            <div class="past-doc-avatar d">${escapeHtml(el.doctor.user.full_name[0])}</div>
            <div><div class="past-doc-name">Dr. ${docName}</div><div class="past-doc-spec">${statusLabel} · ${escapeHtml(el.appointment_time)}</div></div>
          </div>
          <div class="past-tags"><span class="past-type in-person">In-person</span><span class="status-pill ${status}">${statusLabel}</span></div>
        </div>`;
    });

    // Wire up the Cancel buttons (previously dead — no handler at all).
    // Delegated + assigned via onclick so re-running this function
    // (which rebuilds the DOM anyway) can't stack duplicate listeners.
    if (upcomingGrid) upcomingGrid.onclick = async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-cancel-id]");
      if (!btn) return;
      const id = btn.dataset.cancelId!;
      btn.setAttribute("disabled", "true");
      try {
        const res = await fetch(`${apiUrl}/appointments/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (!res.ok || !result.success) {
          showToast("Could not cancel appointment", "error");
          btn.removeAttribute("disabled");
          return;
        }
        showToast("Appointment cancelled", "success");
        await loadAppointments();
      } catch (err) {
        console.error("Failed to cancel appointment:", err);
        showToast("Something went wrong", "error");
        btn.removeAttribute("disabled");
      }
    };
  };

  const filterTab = (btn: HTMLElement, tab: string) => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll<HTMLElement>(".appt-card, .past-item").forEach((card) => {
      const status = card.dataset.status;
      const show = tab === "all" || tab === status;
      card.style.display = show ? "" : "none";
    });
  };

  const handleSearch = (q: string) => {
    const lower = q.toLowerCase();
    document.querySelectorAll<HTMLElement>(".appt-card, .past-item").forEach((el) => {
      const doc = el.dataset.doctor?.toLowerCase() ?? "";
      const spec = el.dataset.spec?.toLowerCase() ?? "";
      el.style.display = (!lower || doc.includes(lower) || spec.includes(lower)) ? "" : "none";
    });
  };

  return (
    <div className="app">
      <Sidebar>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/user-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></Link>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Appointments</span><span className="badge">3</span></a>
          <Link prefetch={false} className="nav-item" href="/chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>Messages</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Account</p>
          <a className="nav-item" style={{cursor:"pointer"}} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Sign out</span></a>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">U</div>
          <div className="user-meta"><p className="name">User</p><p className="role">User</p></div>
        </div>
      </Sidebar>

      <div className="main">
        <header className="topbar">
          <HamburgerToggle />
          <h1 className="topbar-title">My <span>Appointments</span></h1>
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search doctor, specialty…" onChange={(e) => handleSearch(e.target.value)}/>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className="notif-dot"></span></button>
            <div className="topbar-avatar">U</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>All <em>Appointments</em></h1>
              <p>Manage, reschedule or book new appointments.</p>
            </div>
            <Link href="/book-appointment"><button className="btn-primary"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Book Appointment</button></Link>
          </div>

          <div className="summary-strip">
            {[
              {id:"upcoming",icon:"teal",label:"Upcoming"},
              {id:"pending",icon:"amber",label:"Pending"},
              {id:"completed",icon:"blue",label:"Completed"},
              {id:"cancelled",icon:"coral",label:"Cancelled"},
            ].map((s) => (
              <div className="strip-card" key={s.id}>
                <div className={`strip-icon ${s.icon}`}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/></svg></div>
                <div className="strip-text"><div className="val" id={`${s.id}-val`}>0</div><div className="lbl">{s.label}</div></div>
              </div>
            ))}
          </div>

          <div className="filter-bar">
            <div className="tabs">
              {["all","upcoming","pending","completed","cancelled"].map((tab) => (
                <button key={tab} className={`tab-btn${tab==="all"?" active":""}`}
                  onClick={(e) => filterTab(e.currentTarget, tab)}>
                  {tab.charAt(0).toUpperCase()+tab.slice(1)} <span className="count" id={`${tab}-count`}>0</span>
                </button>
              ))}
            </div>
          </div>

          <div id="upcoming-section">
            <p className="appt-section-label">Upcoming & Pending</p>
            <div className="appts-grid" id="upcoming-grid"></div>
          </div>
          <div id="past-section" style={{marginTop:"0.5rem"}}>
            <p className="appt-section-label">Past Appointments</p>
            <div className="past-list" id="past-list"></div>
          </div>
          <div className="empty-state" id="empty-state" style={{display:"none"}}>
            <div className="empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/></svg></div>
            <h3>No appointments found</h3>
            <p>Book a new appointment to get started.</p>
            <Link href="/book-appointment"><button className="btn-primary" style={{display:"inline-flex"}}>Book Appointment</button></Link>
          </div>
        </div>
      </div>

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

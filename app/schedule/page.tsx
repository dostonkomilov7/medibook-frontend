"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "../doctor-dashboard/doctor-dashboard.style.css";
import "./schedule.style.css";
import { getCookie, apiUrl, escapeHtml, signOut, getUserData } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

type ApptType = "in-person" | "virtual";
type ApptTag = "" | "followup" | "new-pt" | "urgent";
type ApptStatus = "confirmed" | "pending" | "completed" | "cancelled";
type Filter = "all" | "in-person" | "virtual" | "urgent";

interface Appointment {
  id: string; date: string; time: string; name: string;
  reason: string; type: ApptType; tag: ApptTag; status: ApptStatus;
}

export default function SchedulePage() {
  const router = useRouter();
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const apptsRef = useRef<Appointment[]>([]);
  const stateRef = useRef({ currentDate: todayISO(), activeFilter: "all" as Filter, searchTerm: "", editingId: null as string | null });
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Previously this page had no sidebar profile card at all, unlike
  // doctor-dashboard/all-patients which both show one — same data
  // this page already fetches for the appointment list.
  const [doctor, setDoctor] = useState<any>(null);

  const showToast = (msg: string, type = "info") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "Doctor") {
      notFound();
    }
    init()
    loadAppointments();
  }, [router]);


  // Previously this page showed the same 5 hardcoded fake appointments
  // no matter which date you navigated to or which doctor was signed
  // in — it never talked to the backend at all, so it didn't reflect
  // the doctor's real schedule. Load their actual appointments instead
  // (same endpoint doctor-dashboard/all-patients already use).
  const loadAppointments = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/doctors/${userId}`);
      if (!res.ok) { render(); return; }
      const data = await res.json();
      setDoctor(data.doctors?.[0] ?? null);
      const list = data.doctors?.[0]?.appointments ?? [];
      apptsRef.current = list.map((a: any): Appointment => ({
        id: String(a.id),
        date: a.appointment_date,
        time: a.appointment_time,
        name: a.user?.full_name ?? "Unknown patient",
        reason: `Appointment · ID #${a.user?.id ?? "—"}`,
        type: "in-person",
        tag: "",
        status: (a.status ?? "Pending").toLowerCase() as ApptStatus,
      }));
    } catch (e) {
      console.error("Failed to load schedule:", e);
    }
    render();
  };

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

  };

  // appointment_time is stored as a human string like "9:00 AM" (see
  // the slot picker in book-appointment), not 24-hour "HH:MM" — the
  // old to12h() assumed 24-hour input and would have mangled it (e.g.
  // "9:00 AM".split(":") glues the AM/PM suffix onto the minutes).
  const splitTime = (t: string) => {
    const [hour, period] = t.split(" ");
    return { hour: hour ?? t, min: period ?? "" };
  };

  const visibleAppts = () => apptsRef.current
    .filter((a) => a.date === stateRef.current.currentDate)
    .filter((a) => {
      const f = stateRef.current.activeFilter;
      if (f === "all") return true;
      if (f === "urgent") return a.tag === "urgent";
      return a.type === f;
    })
    .filter((a) => {
      const s = stateRef.current.searchTerm.toLowerCase();
      return !s || a.name.toLowerCase().includes(s) || a.reason.toLowerCase().includes(s);
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const render = () => {
    formatLabels();
    const items = visibleAppts();
    const list = document.getElementById("scheduleList");
    const emptyState = document.getElementById("emptyState") as HTMLElement;
    if (!list) return;
    list.innerHTML = items.map((a, i) => {
      const { hour, min } = splitTime(a.time);
      const tail = i < items.length - 1 ? '<div class="timeline-tail"></div>' : "";
      const typeTag = `<span class="tag ${a.type === "virtual" ? "virtual" : "in-person"}">${a.type === "virtual" ? "Virtual" : "In-person"}</span>`;
      const tagMap: Record<string, string> = { followup: '<span class="tag followup">Follow-up</span>', "new-pt": '<span class="tag new-pt">New Patient</span>', urgent: '<span class="tag urgent">Urgent</span>' };
      return `
        <div class="schedule-item" data-id="${escapeHtml(a.id)}">
          <div class="schedule-time"><div class="hour">${escapeHtml(hour)}</div><div class="min">${escapeHtml(min)}</div></div>
          <div class="schedule-line"><div class="timeline-dot ${a.type === "virtual" ? "teal" : "blue"}"></div>${tail}</div>
          <div class="schedule-body">
            <div class="appt-name">${escapeHtml(a.name)}</div>
            <div class="appt-sub">${escapeHtml(a.reason)}</div>
            <div class="appt-tags">${typeTag}${a.tag ? tagMap[a.tag] || "" : ""}</div>
          </div>
          <div class="schedule-actions-group">
            <button class="schedule-action" data-del="${escapeHtml(a.id)}">Cancel</button>
          </div>
        </div>`;
    }).join("");
    if (emptyState) emptyState.hidden = items.length !== 0;
    updateStats();
  };

  const formatLabels = () => {
    const d = new Date(stateRef.current.currentDate + "T00:00:00");
    const dayLabel = document.getElementById("dayLabel");
    const dateLabel = document.getElementById("dateLabel");
    if (dayLabel) dayLabel.textContent = d.toLocaleDateString("en-US", { weekday: "long" });
    if (dateLabel) dateLabel.textContent = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const updateStats = () => {
    const day = apptsRef.current.filter((a) => a.date === stateRef.current.currentDate && a.status !== "cancelled");
    const set = (id: string, v: number) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    set("statTotal", day.length);
    set("statVirtual", day.filter((a) => a.type === "virtual").length);
    set("statUrgent", day.filter((a) => a.tag === "urgent").length);
    set("statFree", Math.max(0, 8 - day.length));
  };

  const shiftDay = (delta: number) => {
    const d = new Date(stateRef.current.currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    stateRef.current.currentDate = d.toISOString().slice(0, 10);
    render();
  };

  const openModal = (id?: string) => {
    stateRef.current.editingId = id ?? null;
    const modal = document.getElementById("modal") as HTMLElement;
    const title = document.getElementById("modalTitle");
    const deleteBtn = document.getElementById("deleteBtn") as HTMLElement;
    if (title) title.textContent = id ? "Edit Appointment" : "New Appointment";
    if (deleteBtn) deleteBtn.style.display = id ? "block" : "none";
    const a = id ? apptsRef.current.find((x) => x.id === id) : undefined;
    (document.getElementById("fName") as HTMLInputElement).value = a?.name ?? "";
    (document.getElementById("fReason") as HTMLInputElement).value = a?.reason ?? "";
    (document.getElementById("fTime") as HTMLInputElement).value = a?.time ?? "09:00";
    (document.getElementById("fType") as HTMLSelectElement).value = a?.type ?? "in-person";
    (document.getElementById("fTag") as HTMLSelectElement).value = a?.tag ?? "";
    (document.getElementById("fStatus") as HTMLSelectElement).value = a?.status ?? "confirmed";
    if (modal) modal.hidden = false;
  };

  const closeModal = () => {
    const modal = document.getElementById("modal") as HTMLElement;
    if (modal) modal.hidden = true;
    stateRef.current.editingId = null;
  };

  // There's no backend flow for a doctor creating an ad-hoc appointment
  // for an arbitrary walk-in name from this screen (booking requires a
  // real patient_id — see book-appointment), and editing free-form
  // fields here had nothing to persist to either. Both used to silently
  // "succeed" against an in-memory array only, discarding the change on
  // refresh. Be upfront about it instead.
  const save = () => {
    showToast("Creating or editing appointments isn't available from this screen yet.", "warning");
    closeModal();
  };

  const removeAppt = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/appointments/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast("Could not cancel appointment", "error");
        return;
      }
      apptsRef.current = apptsRef.current.filter((a) => a.id !== id);
      render();
    } catch (e) {
      console.error("Failed to cancel appointment:", e);
      showToast("Something went wrong", "error");
    }
  };

  const handleListClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const delId = t.dataset.del;
    if (delId) { removeAppt(delId); return; }
  };

  return (
    <div className="doctor-shell">
      <div className="app page-schedule">
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
            <Link prefetch={false} className="nav-item" href="/doctor-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></Link>
            <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Schedule</span></a>
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

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <HamburgerToggle />
              <div className="topbar-title">Manage <span>Schedule</span></div>
              <div className="topbar-sub">Plan, edit and track your appointments</div>
            </div>
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" id="searchInput" placeholder="Search appointments…" onChange={(e) => { stateRef.current.searchTerm = e.target.value; render(); }} />
            </div>
            <div className="topbar-actions">
              <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg><span className="notif-dot"></span></button>
              <div className="avatar-btn">DR</div>
            </div>
          </header>

          <div className="content">
            <div className="sched-toolbar">
              <div className="date-nav">
                <button className="icon-btn sm" onClick={() => shiftDay(-1)}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg></button>
                <div className="date-display"><p className="dow" id="dayLabel">—</p><p className="full" id="dateLabel">—</p></div>
                <button className="icon-btn sm" onClick={() => shiftDay(1)}><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></button>
                <button className="tbl-btn" onClick={() => { stateRef.current.currentDate = todayISO(); render(); }}>Today</button>
              </div>
              <div className="toolbar-right">
                <div className="filter-chips">
                  {["all", "in-person", "virtual", "urgent"].map((f) => (
                    <button key={f} className={`chip${f === "all" ? " active" : ""}`} onClick={(e) => {
                      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
                      (e.target as HTMLElement).classList.add("active");
                      stateRef.current.activeFilter = f as Filter; render();
                    }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                </div>
                <button className="btn-teal" onClick={() => openModal()}>+ New Appointment</button>
              </div>
            </div>

            <div className="mini-stats">
              <div className="mini-stat"><span className="m-num" id="statTotal">0</span><span className="m-lbl">Scheduled</span></div>
              <div className="mini-stat"><span className="m-num" id="statVirtual">0</span><span className="m-lbl">Virtual</span></div>
              <div className="mini-stat"><span className="m-num" id="statUrgent">0</span><span className="m-lbl">Urgent</span></div>
              <div className="mini-stat"><span className="m-num" id="statFree">0</span><span className="m-lbl">Free slots</span></div>
            </div>

            <div className="card">
              <div className="section-head"><h3>Day Timeline</h3></div>
              <div className="schedule-list" id="scheduleList" onClick={handleListClick}></div>
              <div className="empty-state" id="emptyState" hidden>
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /></svg>
                <p>No appointments match this view.</p>
                <button className="tbl-btn" onClick={() => openModal()}>Add one</button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        <div className="modal-overlay" id="modal" hidden onClick={(e) => { if ((e.target as HTMLElement).id === "modal") closeModal(); }}>
          <div className="modal-card">
            <div className="modal-head">
              <h3 id="modalTitle">New Appointment</h3>
              <button className="icon-btn sm" onClick={closeModal}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="modal-body">
              <label className="field"><span>Patient name</span><input type="text" id="fName" placeholder="e.g. James Mitchell" /></label>
              <label className="field"><span>Reason / notes</span><input type="text" id="fReason" placeholder="e.g. Cardiac follow-up" /></label>
              <div className="field-row">
                <label className="field"><span>Time</span><input type="time" id="fTime" defaultValue="09:00" /></label>
                <label className="field"><span>Type</span><select id="fType"><option value="in-person">In-person</option><option value="virtual">Virtual</option></select></label>
              </div>
              <div className="field-row">
                <label className="field"><span>Category</span><select id="fTag"><option value="">None</option><option value="followup">Follow-up</option><option value="new-pt">New Patient</option><option value="urgent">Urgent</option></select></label>
                <label className="field"><span>Status</span><select id="fStatus"><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="tbl-btn" id="deleteBtn" style={{ display: "none" }} onClick={() => { if (stateRef.current.editingId) { removeAppt(stateRef.current.editingId); closeModal(); } }}>Delete</button>
              <div style={{ flex: 1 }}></div>
              <button className="tbl-btn" onClick={closeModal}>Cancel</button>
              <button className="btn-teal" onClick={save}>Save</button>
            </div>
          </div>
        </div>

        {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
      </div>
    </div>
  );
}

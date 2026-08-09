"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, notFound } from "next/navigation";
import "./all-patients.style.css";
import { getCookie, getUserData, strMonth, getAge, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";
const COLORS = ["#1D9E75", "#378ADD", "#D85A30", "#EF9F27", "#8B7EF8", "#34C97A", "#E0608A", "#22C5D9", "#F07B3F"];
const PER_PAGE = 8;

function riskClass(r: string) { return ({ High: "high", Medium: "medium", Low: "low", Stable: "stable" }[r] || "stable"); }
function statusClass(s: string) { return ({ Active: "active", Inactive: "inactive", Critical: "critical" }[s] || "inactive"); }

export default function AllPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentView, setCurrentView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [drawer, setDrawer] = useState<any>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = "info") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Doctor" && role !== "Admin") {
      notFound();
    }
    init();
  }, [router]);

  // const init = async () => {
  //   try {
  //     const ud = await getUserData();
  //     if (!ud) return;
  //     setUserData(ud);
  //     const userId = getCookie("userId");
  //     if (!userId) return;
  //     const res = await fetch(`${apiUrl}/doctors/${userId}`);
  //     if (!res.ok) { showToast("Failed to load patients.", "error"); return; }
  //     const data = await res.json();
  //     const appts = data.doctors?.[0]?.appointments || [];
  //     setPatients(appts);
  //     setFiltered(appts);
  //   } catch (e) {
  //     console.error("Failed to load patients:", e);
  //     showToast("Failed to load patients.", "error");
  //   }
  // };

  const init = async () => {
    try {
      const userData = await getUserData();
      if (!userData) return;
      setUserData(userData);
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
      setEl(".topbar-sub", doctor ? `Dr ${userData?.users?.[0]?.full_name} • ${doctor.department} • ${fullDate}` : "");

      const userId = getCookie("userId");
      if (!userId) return;
      const res = await fetch(`${apiUrl}/doctors/${userId}`);
      if (!res.ok) { showToast("Failed to load patients.", "error"); return; }
      const data = await res.json();
      const appts = data.doctors?.[0]?.appointments || [];
      setPatients(appts);
      setFiltered(appts);

    } catch (e) {
      console.error("Failed to load patients:", e);
      showToast("Failed to load patients.", "error");
    }

  };

  useEffect(() => {
    let list = [...patients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.user?.full_name?.toLowerCase().includes(q) ||
        String(p.id).toLowerCase().includes(q)
      );
    }
    if (riskFilter) list = list.filter(p => riskFilter === "Medium"); // same as original
    if (statusFilter) list = list.filter(p => p.user?.status === statusFilter);
    setFiltered(list);
    setCurrentPage(1);
  }, [search, riskFilter, statusFilter, patients]);

  const pageSlice = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Stats
  const statTotal = filtered.length;
  const statActive = filtered.filter(p => p.user?.status === "Active").length;
  const statInactive = filtered.filter(p => p.user?.status === "Inactive").length;
  const statToday = 0;

  const doctor = userData?.users?.[0]?.doctors?.[0];
  const fullDate = new Date().toDateString();

  const cancelAppointment = async (id: string, status: string) => {
    if (status !== "Pending") { showToast("Only Pending status can be edited", "info"); return; }
    try {
      const res = await fetch(`${apiUrl}/appointments/${id}`, { method: "DELETE" });
      const response = await res.json();
      showToast(response.message ?? (res.ok ? "Appointment cancelled." : "Could not cancel appointment."), res.ok && response.success ? "info" : "error");
      if (res.ok && response.success) { const ud = await getUserData(); setUserData(ud); init(); }
    } catch (e) {
      console.error("Failed to cancel appointment:", e);
      showToast("Something went wrong.", "error");
    }
  };

  const updateAppointment = async (id: string, status: string) => {
    if (status === "Completed") { showToast("Appointment has been completed", "info"); return; }
    if (status === "Cancelled") { showToast("Appointment has been cancelled", "info"); return; }
    try {
      const res = await fetch(`${apiUrl}/appointments/${id}`, { method: "PATCH" });
      const response = await res.json();
      showToast(response.message ?? (res.ok ? "Appointment updated." : "Could not update appointment."), res.ok && response.success ? "info" : "error");
      if (res.ok && response.success) init();
    } catch (e) {
      console.error("Failed to update appointment:", e);
      showToast("Something went wrong.", "error");
    }
  };

  return (
    <div className="page-all-patients">
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
          <Link prefetch={false} className="nav-item" href="/doctor-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></Link>
          <Link prefetch={false} className="nav-item" href="/schedule"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Schedule</span></Link>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span>My Patients</span></a>
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
            <div className="topbar-title">My <span>Patients</span></div>
            <div className="topbar-sub"></div>
          </div>
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search name, ID, condition…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <button className="icon-btn">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="notif-dot"></span>
            </button>
            <div className="avatar-btn">{userData?.users?.[0]?.full_name?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          {/* Page header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1>All <em>Patients</em></h1>
              <p>Review, track and manage all patients assigned to your care.</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="stats-strip">
            <div className="stat-card">
              <div className="stat-icon teal"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              <div className="stat-text"><div className="val">{statTotal}</div><div className="lbl">Total Patients</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
              <div className="stat-text"><div className="val">{statActive}</div><div className="lbl">Active</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon coral"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
              <div className="stat-text"><div className="val">{statInactive}</div><div className="lbl">Inactive</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
              <div className="stat-text"><div className="val">{statToday}</div><div className="lbl">Seen Today</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
              <div className="stat-text"><div className="val">4.7★</div><div className="lbl">Avg. Rating</div></div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <select className="filter-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
              <option value="">All Risk Levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Stable">Stable</option>
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select className="filter-select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="recent">Sort: Recent</option>
              <option value="visits">Sort: Visits</option>
            </select>
            <div className="toolbar-right">
              <div className="view-toggle">
                <button className={`view-btn${currentView === "table" ? " active" : ""}`} onClick={() => setCurrentView("table")} title="Table view">
                  <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                </button>
                <button className={`view-btn${currentView === "grid" ? " active" : ""}`} onClick={() => setCurrentView("grid")} title="Grid view">
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Table view */}
          {currentView === "table" && filtered.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Condition</th>
                    <th>Visit Date</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Appointment Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((p: any, i) => (
                    <tr key={p.id} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => setDrawer(p)}>
                      <td>
                        <div className="pt-cell">
                          <div className="pt-av" style={{ background: COLORS[i % COLORS.length] }}>{p.user?.full_name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div className="pt-name">{p.user?.full_name}</div>
                            <div className="pt-id">ID: {p.user?.id} · {getAge(p.user?.age)} y</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--gray-600)", fontSize: "13px" }}>{getAge(p.user?.age)}</td>
                      <td style={{ fontSize: "13px", color: "var(--gray-600)" }}>Problem related to {doctor?.department }</td>
                      <td style={{ fontSize: "13px", color: "var(--gray-600)" }}>{strMonth(p.appointment_date)} {p.appointment_date?.split("-").at(2)}</td>
                      <td><span className={`risk-pill ${riskClass("Medium")}`}>Medium</span></td>
                      <td><span className={`status-pill ${statusClass(p.user?.status)}`}>{p.user?.status}</span></td>
                      <td><span className={`status-pill ${p.status?.toLowerCase()}`}>{p.status}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="row-btn view" title="View" onClick={e => { e.stopPropagation(); setDrawer(p); }}>
                            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                          <button className="row-btn cancel" onClick={e => { e.stopPropagation(); cancelAppointment(p.id, p.status); }}>
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                          </button>
                          <button className="row-btn edit" onClick={e => { e.stopPropagation(); updateAppointment(p.id, p.status); }}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-footer">
                <div className="tf-info">Showing <span>{(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)}</span> of <span>{filtered.length}</span> patients</div>
                <div className="pagination">
                  <button className="pg-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`pg-btn${n === currentPage ? " active" : ""}`} onClick={() => setCurrentPage(n)}>{n}</button>
                  ))}
                  <button className="pg-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                    <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid view */}
          {currentView === "grid" && filtered.length > 0 && (
            <div className="patients-grid">
              {pageSlice.map((p: any, i) => (
                <div key={p.id} className="patient-card" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setDrawer(p)}>
                  <div className="pc-top">
                    <div className="pc-av" style={{ background: COLORS[i % COLORS.length] }}>{p.user?.full_name?.[0]?.toUpperCase()}</div>
                    <span className={`risk-pill ${riskClass("Medium")}`}>Medium</span>
                  </div>
                  <div className="pc-name">{p.user?.full_name}</div>
                  <div className="pc-id">ID: {p.user?.id} · {getAge(p.user?.age)} y</div>
                  <div className="pc-divider"></div>
                  <div className="pc-meta">
                    <div className="pc-meta-item"><div className="pm-lbl">Condition</div><div className="pm-val" style={{ fontSize: "12px" }}>Problem related to {doctor?.department}</div></div>
                    <div className="pc-meta-item"><div className="pm-lbl">Status</div><div className="pm-val"><span className={`status-pill ${statusClass(p.user?.status)}`} style={{ fontSize: "11px" }}>{p.user?.status}</span></div></div>
                    <div className="pc-meta-item"><div className="pm-lbl">Visit Date</div><div className="pm-val">{strMonth(p.appointment_date)} {p.appointment_date?.split("-").at(2)}</div></div>
                  </div>
                  <div className="pc-actions">
                    <button className="pc-btn primary" onClick={e => { e.stopPropagation(); setDrawer(p); }}>View Profile</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              <h3>No patients found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* DRAWER */}
      <div className={`drawer-overlay${drawer ? " open" : ""}`} onClick={e => { if ((e.target as HTMLElement).classList.contains("drawer-overlay")) setDrawer(null); }}>
        <div className="drawer">
          <div className="drawer-header">
            <div>
              <h2>Patient Profile</h2>
              <p>Full medical profile</p>
            </div>
            <button className="drawer-close" onClick={() => setDrawer(null)}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {drawer && (
            <div className="drawer-body">
              <div className="pt-hero">
                <div className="pt-hero-av" style={{ background: COLORS[0] }}>{drawer.user?.full_name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="pt-hero-name">{drawer.user?.full_name}</div>
                  <div className="pt-hero-sub">ID: {drawer.user?.id} · {getAge(drawer.user?.age)} years</div>
                  <div className="pt-hero-tags">
                    <span className={`risk-pill ${riskClass("Medium")}`}>Medium Risk</span>
                    <span className={`status-pill ${statusClass(drawer.user?.status)}`}>{drawer.user?.status}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-row">
                <div className="kpi-box"><div className="kv">{strMonth(drawer.appointment_date)} {drawer.appointment_date?.split("-").at(2)}</div><div className="kl">Visit Date</div></div>
                <div className="kpi-box"><div className="kv">{drawer.status}</div><div className="kl">Appointment</div></div>
                <div className="kpi-box"><div className="kv">{doctor?.department}</div><div className="kl">Department</div></div>
              </div>
              <div className="info-section">
                <h4>Clinical Data</h4>
                <div className="info-grid">
                  <div className="info-box"><div className="ib-lbl">Condition</div><div className="ib-val">Problem related to {doctor?.department}</div></div>
                  <div className="info-box"><div className="ib-lbl">Doctor</div><div className="ib-val">Dr. {userData?.users?.[0]?.full_name}</div></div>
                </div>
              </div>
            </div>
          )}
          <div className="drawer-footer">
            <button className="btn-df-ghost" onClick={() => setDrawer(null)}>Close</button>
            <button className="btn-df-primary" onClick={() => { showToast("Appointment scheduled.", "success"); setDrawer(null); }}>Schedule Appointment</button>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && <div className={`toast ${toast.type} show`}>{toast.msg}</div>}
    </div>
    </div>
  );
}

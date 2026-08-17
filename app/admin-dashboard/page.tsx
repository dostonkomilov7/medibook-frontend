"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "./admin-dashboard.style.css";
import { getCookie, getUserData, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const COLORS = ["#1D9E75", "#378ADD", "#D85A30", "#EF9F27", "#8B7EF8", "#34C97A", "#E0608A", "#22C5D9", "#F07B3F"];
const SPEC_CLASS: Record<string, string> = {
  Cardiology: "cardio", Dermatology: "derm", Neurology: "neuro",
  "General Practice": "general", Orthopedics: "ortho", Pediatrics: "pediatric", Oncology: "oncology",
};

type Stats = {
  totalDoctors: number; activeDoctors: number; inactiveDoctors: number;
  totalUsers: number; activeUsers: number; inactiveUsers: number;
  totalPatients: number; totalAppointments: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDoctors: 0, activeDoctors: 0, inactiveDoctors: 0,
    totalUsers: 0, activeUsers: 0, inactiveUsers: 0,
    totalPatients: 0, totalAppointments: 0,
  });

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    if (getCookie("role") !== "Admin") {
      notFound();
    }
    init();
  }, [router]);

  const init = async () => {
    try {
      const ud = await getUserData();
      setUserData(ud);
      const [doctorsRes, usersRes, apptRes] = await Promise.all([
        fetch(`${apiUrl}/doctors`, { credentials: "include" }),
        fetch(`${apiUrl}/users`, { credentials: "include" }),
        fetch(`${apiUrl}/appointments`, { credentials: "include" }),
      ]);
      const doctorsData = doctorsRes.ok ? await doctorsRes.json() : { doctors: [] };
      const usersData = usersRes.ok ? await usersRes.json() : {};
      const apptData = apptRes.ok ? await apptRes.json() : { appointments: [] };
      const docs = doctorsData.doctors ?? [];
      setDoctors(docs);
      setStats({
        totalDoctors: docs.length,
        activeDoctors: doctorsData.countActive ?? 0,
        inactiveDoctors: doctorsData.countInactive ?? 0,
        totalUsers: usersData.users?.count ?? 0,
        activeUsers: usersData.countActive ?? 0,
        inactiveUsers: usersData.countInactive ?? 0,
        totalPatients: usersData.countPatients ?? 0,
        totalAppointments: (apptData.appointments ?? []).length,
      });
    } catch (e) {
      console.error("Failed to load admin dashboard data:", e);
    }
  };

  const adminName = userData?.users?.[0]?.full_name ?? "";
  const fullDate = new Date().toDateString();

  // Department distribution is derived from doctors' real `department`
  // field (not the department-management page's static demo dataset —
  // that list has no backend behind it, so it isn't actually linked to
  // which doctors are assigned where).
  const deptCounts = new Map<string, number>();
  doctors.forEach((d) => { const key = d.department || "Unassigned"; deptCounts.set(key, (deptCounts.get(key) ?? 0) + 1); });
  const deptDist = Array.from(deptCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const maxDeptCount = Math.max(1, ...deptDist.map((d) => d.count));

  const activeDoctors = doctors.filter((d) => d.user?.status === "Active").slice(0, 6);

  return (
    <div className="page-admin-dashboard">
    <div className="app">
      {/* SIDEBAR */}
      <Sidebar badge={<span className="admin-chip">Admin</span>}>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span className="label">Dashboard</span></a>
          <Link prefetch={false} className="nav-item" href="/all-users"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg><span className="label">All Users</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Management</p>
          <Link prefetch={false} className="nav-item" href="/doctor-management"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="label">Doctors</span></Link>
          <Link prefetch={false} className="nav-item" href="/department-management"><svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg><span className="label">Departments</span></Link>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span className="label">Appointments</span><span className="badge">Soon</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">System</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 104.93 19.07M19.07 4.93l-7.07 7.07"/></svg><span className="label">Settings</span><span className="badge">Soon</span></a>
          <a className="nav-item" onClick={signOut} style={{cursor:"pointer"}}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span className="label">Sign out</span></a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-avatar">{adminName?.[0]?.toUpperCase()}</div>
          <div className="admin-meta"><p className="name">{adminName}</p><p className="role">Super Administrator</p></div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </Sidebar>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <HamburgerToggle />
            <div className="topbar-title">Admin <span>Dashboard</span></div>
            <div className="topbar-sub">MediBook Admin Panel · {fullDate}</div>
          </div>
          <div className="topbar-right">
            {/* <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className="notif-dot"></span></button> */}
            <div className="admin-avatar top-avatar" style={{width:"36px",height:"36px",fontSize:"12px",cursor:"pointer"}}>{adminName?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>Welcome back, <em>{adminName || "Admin"}</em></h1>
              <p>Here&apos;s a snapshot of what&apos;s happening across MediBook today.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-strip">
            <div className="stat-card"><div className="stat-icon teal"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div className="stat-text"><div className="val">{stats.totalDoctors}</div><div className="lbl">Total Doctors</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div className="stat-text"><div className="val">{stats.totalPatients}</div><div className="lbl">Total Patients</div></div></div>
            <div className="stat-card"><div className="stat-icon purple"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div className="stat-text"><div className="val">{deptDist.length}</div><div className="lbl">Departments</div></div></div>
            <div className="stat-card"><div className="stat-icon coral"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div className="stat-text"><div className="val">{stats.totalAppointments}</div><div className="lbl">Total Appointments</div></div></div>
          </div>

          <div className="dash-grid">
            {/* LEFT COLUMN */}
            <div className="dash-col-main">
              <div className="panel-card">
                <div className="panel-head"><h3>Active Doctors</h3><Link href="/doctor-management">Manage Doctors →</Link></div>
                {activeDoctors.length === 0 ? (
                  <p className="panel-empty">No active doctors yet.</p>
                ) : activeDoctors.map((d: any) => {
                  const specClass = SPEC_CLASS[d.specialization] || "general";
                  return (
                    <div className="doctor-mini-row" key={d.id}>
                      <div className="doc-av" style={{background: COLORS[Number(d.id) % COLORS.length]}}>{d.user?.full_name?.[0]?.toUpperCase()}</div>
                      <div className="doc-mini-info">
                        <div className="doc-mini-name">{d.user?.full_name}</div>
                        <div className="doc-mini-spec">{d.specialization} · {d.department}</div>
                      </div>
                      <span className={`spec-badge ${specClass}`}>{d.specialization}</span>
                      <span className="status-pill active">Active</span>
                    </div>
                  );
                })}
              </div>

              <div className="panel-card">
                <div className="panel-head"><h3>Departments Overview</h3><Link href="/department-management">Manage Departments →</Link></div>
                {deptDist.length === 0 ? (
                  <p className="panel-empty">No department data yet.</p>
                ) : deptDist.map((d) => (
                  <div className="dept-dist-row" key={d.name}>
                    <div className="dept-dist-head"><span>{d.name}</span><span>{d.count} doctor{d.count === 1 ? "" : "s"}</span></div>
                    <div className="dept-dist-track"><div className="dept-dist-fill" style={{width: `${(d.count / maxDeptCount) * 100}%`}}></div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="dash-col-side">
              <div className="panel-card">
                <div className="panel-head"><h3>Quick Actions</h3></div>
                <div className="quick-actions-grid">
                  <Link className="quick-action-btn" href="/doctor-management">
                    <div className="quick-action-icon teal"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                    <span>Manage Doctors</span>
                  </Link>
                  <Link className="quick-action-btn" href="/department-management">
                    <div className="quick-action-icon purple"><svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg></div>
                    <span>Manage Departments</span>
                  </Link>
                  <Link className="quick-action-btn" href="/all-users">
                    <div className="quick-action-icon blue"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
                    <span>Manage Users</span>
                  </Link>
                  <Link className="quick-action-btn" href="/doctor-management">
                    <div className="quick-action-icon coral"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                    <span>Add Doctor</span>
                  </Link>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-head"><h3>System Snapshot</h3></div>
                <div className="snapshot-row"><span>Active Doctors</span><strong>{stats.activeDoctors}</strong></div>
                <div className="snapshot-row"><span>Inactive Doctors</span><strong>{stats.inactiveDoctors}</strong></div>
                <div className="snapshot-row"><span>Active Users</span><strong>{stats.activeUsers}</strong></div>
                <div className="snapshot-row"><span>Inactive Users</span><strong>{stats.inactiveUsers}</strong></div>
                {/* stats.totalUsers already covers both patients and
                    doctors — GET /users excludes only the Admin role. */}
                <div className="snapshot-row"><span>Total Accounts</span><strong>{stats.totalUsers}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

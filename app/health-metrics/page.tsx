"use client";
import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "./health-metrics.style.css";
import { getCookie, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

type MetricReading = { value: string; unit?: string; recordedAt?: string };

const METRIC_TYPES: { key: string; label: string; color: string; defaultUnit: string; icon: ReactNode }[] = [
  { key: "bloodPressure", label: "Blood Pressure", color: "coral", defaultUnit: "mmHg", icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /> },
  { key: "heartRate", label: "Heart Rate", color: "amber", defaultUnit: "bpm", icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> },
  { key: "bloodSugar", label: "Blood Sugar", color: "blue", defaultUnit: "mg/dL", icon: <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /> },
  { key: "bmi", label: "BMI", color: "teal", defaultUnit: "", icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></> },
  { key: "weight", label: "Weight", color: "blue", defaultUnit: "kg", icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> },
  { key: "cholesterol", label: "Cholesterol", color: "coral", defaultUnit: "mg/dL", icon: <><path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" /></> },
];

export default function HealthMetricsPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [metrics, setMetrics] = useState<Record<string, MetricReading>>({});
  const [editKey, setEditKey] = useState<string | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    const role = getCookie("role");
    if (role !== "Admin" && role !== "User") {
      notFound();
    }
    init();
  }, [router]);

  const init = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/users/${userId}`);
      const data = await res.json();
      const user = data.users?.[0];
      if (user) setAdminName(user.full_name);
    } catch (e) {
      console.error("Failed to load user:", e);
    }
    await fetchHealthMetrics();
  };

  const fetchHealthMetrics = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/health-metrics/${userId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const rows: any[] = data.metrics ?? [];
      const map: Record<string, MetricReading> = {};
      rows.forEach((r) => {
        map[r.type] = { value: r.value, unit: r.unit, recordedAt: r.recordedAt ? new Date(r.recordedAt).toLocaleDateString() : undefined };
      });
      setMetrics(map);
    } catch (e) {
      console.error("Failed to load health metrics:", e);
    }
  };

  const openEdit = (key: string) => {
    const type = METRIC_TYPES.find((m) => m.key === key);
    const existing = metrics[key];
    setFormValue(existing?.value ?? "");
    setFormUnit(existing?.unit ?? type?.defaultUnit ?? "");
    setEditKey(key);
  };

  const saveMetric = async () => {
    if (!editKey || !formValue.trim()) { showToast("Please enter a value.", "error"); return; }
    const userId = getCookie("userId");
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/health-metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: Number(userId), type: editKey, value: formValue.trim(), unit: formUnit.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) { showToast(result.message ?? "Could not save the reading.", "error"); return; }
      showToast("Reading saved.", "success");
      setEditKey(null);
      await fetchHealthMetrics();
    } catch (e) {
      console.error("Failed to save health metric:", e);
      showToast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const editingType = METRIC_TYPES.find((m) => m.key === editKey);

  return (
    <div className="page-health-metrics">
    <div className="app">
      <Sidebar>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/user-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></Link>
          <Link prefetch={false} className="nav-item" href="/my-appointments"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Appointments</span></Link>
          <Link prefetch={false} className="nav-item" href="/chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg><span>Messages</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Health</p>
          <Link prefetch={false} className="nav-item" href="/medical-records"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Medical Records</span></Link>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Health Metrics</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Account</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07" /></svg><span>Settings</span><span className="badge">Soon</span></a>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{adminName?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-meta">
            <p className="name">{adminName || "User"}</p>
            <p className="role">Patient</p>
          </div>
        </div>
      </Sidebar>

      <div className="main">
        <header className="topbar">
          <HamburgerToggle />
          <h1 className="topbar-title">Health <span>Metrics</span></h1>
          <div className="topbar-actions">
            <button className="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="notif-dot"></span>
            </button>
            <div className="topbar-avatar">{adminName?.[0]?.toUpperCase() || "U"}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>Track your <em>Health Metrics</em></h1>
              <p>Monitor vitals like blood pressure, heart rate, and more over time.</p>
            </div>
          </div>

          <div className="metrics-grid">
            {METRIC_TYPES.map((m) => {
              const reading = metrics[m.key];
              return (
                <div className="metric-card" key={m.key}>
                  <div className="metric-card-top">
                    <div className={`metric-icon ${m.color}`}><svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round">{m.icon}</svg></div>
                    <button className="metric-edit-btn" title={`Edit ${m.label}`} onClick={() => openEdit(m.key)}>
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </div>
                  <div className="metric-value">{reading?.value ?? "—"}{reading?.unit ? <small> {reading.unit}</small> : null}</div>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-sub">{reading?.recordedAt ? `Last recorded ${reading.recordedAt}` : "No readings yet"}</div>
                </div>
              );
            })}
          </div>

          <div className="empty-panel">
            <div className="empty-panel-icon">
              <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <h3>Self-reported readings</h3>
            <p>Click the pencil on any card above to log or update your own reading. Readings synced automatically from your doctor visits are coming in a future update.</p>
          </div>
        </div>
      </div>

      {/* EDIT METRIC MODAL */}
      {editKey && editingType && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains("modal-overlay")) setEditKey(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Edit {editingType.label}</h2>
                <p>Log your current reading.</p>
              </div>
              <button className="modal-close" onClick={() => setEditKey(null)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Value</label>
                <input className="form-input" placeholder={editingType.key === "bloodPressure" ? "e.g. 120/80" : "e.g. 72"} value={formValue} onChange={(e) => setFormValue(e.target.value)} autoFocus />
              </div>
              <div className="form-field">
                <label>Unit <span className="optional">(optional)</span></label>
                <input className="form-input" placeholder={editingType.defaultUnit || "e.g. mmHg"} value={formUnit} onChange={(e) => setFormUnit(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setEditKey(null)}>Cancel</button>
              <button className="btn-save" onClick={saveMetric} disabled={saving}>{saving ? "Saving…" : "Save Reading"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
    </div>
  );
}

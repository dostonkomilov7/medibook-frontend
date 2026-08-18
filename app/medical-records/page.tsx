"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import "./medical-records.style.css";
import { getCookie, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

type MedicalRecord = { id: string; date: string; type: string; doctor: string; notes?: string };
type Medication = { id: string; name: string; schedule: string; notes?: string };

export default function MedicalRecordsPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showAddMed, setShowAddMed] = useState(false);
  const [medName, setMedName] = useState("");
  const [medSchedule, setMedSchedule] = useState("");
  const [medNotes, setMedNotes] = useState("");
  const [savingMed, setSavingMed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!getCookie("userId")) { router.push("/login"); return; }
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
      const res = await fetch(`${apiUrl}/users/${userId}`, { credentials: "include" });
      const data = await res.json();
      const user = data.users?.[0];
      if (user) setAdminName(user.full_name);
    } catch (e) {
      console.error("Failed to load user:", e);
    }
    await Promise.all([fetchMedicalRecords(), fetchMedications()]);
  };

  const fetchMedicalRecords = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      // TODO: no backend endpoint for medical records (visit history /
      // diagnoses) yet. Once one exists — e.g. `GET /medical-records/:userId`
      // returning `{ records: [{id, date, type, doctor, notes}, ...] }` —
      // this fetch starts populating the table below as-is.
      const res = await fetch(`${apiUrl}/medical-records/${userId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
      }
    } catch (e) {
      // Endpoint doesn't exist yet — treated as "no records", not an error.
    }
  };

  const fetchMedications = async () => {
    const userId = getCookie("userId");
    if (!userId) return;
    try {
      const res = await fetch(`${apiUrl}/medications/${userId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMedications(data.medications ?? []);
    } catch (e) {
      console.error("Failed to load medications:", e);
    }
  };

  const openAddMed = () => {
    setMedName(""); setMedSchedule(""); setMedNotes("");
    setShowAddMed(true);
  };

  const saveMedication = async () => {
    if (!medName.trim() || !medSchedule.trim()) { showToast("Name and time are required.", "error"); return; }
    const userId = getCookie("userId");
    if (!userId) return;
    setSavingMed(true);
    try {
      const res = await fetch(`${apiUrl}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: Number(userId), name: medName.trim(), schedule: medSchedule.trim(), notes: medNotes.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) { showToast(result.message ?? "Could not add the medication.", "error"); return; }
      showToast("Medication added.", "success");
      setShowAddMed(false);
      await fetchMedications();
    } catch (e) {
      console.error("Failed to add medication:", e);
      showToast("Something went wrong.", "error");
    } finally {
      setSavingMed(false);
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/medications/${id}`, { method: "DELETE", credentials: "include" });
      const result = await res.json();
      if (!res.ok || !result.success) { showToast("Could not remove the medication.", "error"); return; }
      setMedications((prev) => prev.filter((m) => m.id !== id));
      showToast("Medication removed.", "success");
    } catch (e) {
      console.error("Failed to delete medication:", e);
      showToast("Something went wrong.", "error");
    }
  };

  return (
    <div className="page-medical-records">
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
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>Medical Records</span></a>
          <Link prefetch={false} className="nav-item" href="/health-metrics"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span>Health Metrics</span></Link>
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
          <h1 className="topbar-title">Medical <span>Records</span></h1>
          <div className="topbar-actions">
            {/* <button className="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="notif-dot"></span>
            </button> */}
            <div className="topbar-avatar">{adminName?.[0]?.toUpperCase() || "U"}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>Your <em>Medical Records</em></h1>
              <p>Visit history, diagnoses, and medications in one place.</p>
            </div>
          </div>

          <div className="section-head"><h3>Records</h3></div>
          <div className="table-card">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Doctor</th><th>Notes</th></tr></thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-row">No medical records yet.</div></td></tr>
                ) : records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.type}</td>
                    <td>{r.doctor}</td>
                    <td>{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-head"><h3>Medications</h3><button className="btn-add-med" onClick={openAddMed}>+ Add Medication</button></div>
          <div className="card">
            {medications.length === 0 ? (
              <div className="empty-row">No medications on file.</div>
            ) : (
              <div className="med-list">
                {medications.map((m) => (
                  <div className="med-item" key={m.id}>
                    <div className="med-info">
                      <div className="med-name">{m.name}</div>
                      {m.notes && <div className="med-dose">{m.notes}</div>}
                    </div>
                    <span className="med-time">{m.schedule}</span>
                    <button className="med-remove-btn" title="Remove" onClick={() => deleteMedication(m.id)}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="empty-panel">
            <div className="empty-panel-icon">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <h3>Visit history tracking is coming soon</h3>
            <p>Once this feature launches, your visit history and diagnoses from your doctors will appear in the Records table above automatically. Medications above are already yours to manage.</p>
          </div>
        </div>
      </div>

      {/* ADD MEDICATION MODAL */}
      {showAddMed && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains("modal-overlay")) setShowAddMed(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Add Medication</h2>
                <p>Keep track of what you're taking.</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddMed(false)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Medication Name</label>
                <input className="form-input" placeholder="e.g. Lisinopril 10mg" value={medName} onChange={(e) => setMedName(e.target.value)} autoFocus />
              </div>
              <div className="form-field">
                <label>Time / Schedule</label>
                <input className="form-input" placeholder="e.g. 8:00 AM, Once daily" value={medSchedule} onChange={(e) => setMedSchedule(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Notes <span className="optional">(optional)</span></label>
                <textarea className="form-textarea" placeholder="e.g. Take with food" value={medNotes} onChange={(e) => setMedNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddMed(false)}>Cancel</button>
              <button className="btn-save" onClick={saveMedication} disabled={savingMed}>{savingMed ? "Saving…" : "Add Medication"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
    </div>
  );
}

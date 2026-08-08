"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./book-appointment.style.css";
import "../alert.style.css";
import { getCookie, escapeHtml, apiUrl, signOut } from "../../lib/utils";

interface DoctorData { id: string; full_name: string; specialization: string; department: string; }

export default function BookAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const stateRef = useRef({ doctor: null as DoctorData | null, date: null as string | null, time: null as string | null, visitType: "In-Person", reason: "For some reasons", notes: "" });
  const doctorsRef = useRef<DoctorData[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const allSlots = ["8:00 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    fetchDoctors();
  }, [router]);

  const fetchDoctors = async () => {
    const res = await fetch(`${apiUrl}/doctors`);
    const data = await res.json();
    doctorsRef.current = data.doctors || [];
    renderDoctors(data.doctors || []);
  };

  const renderDoctors = (doctors: any[]) => {
    const grid = document.getElementById("doctorGrid");
    if (!grid) return;
    grid.innerHTML = doctors.map((d: any) => `
      <div class="doctor-card" data-specialty="${escapeHtml(d.department)}" data-id="${escapeHtml(String(d.id))}">
        <div class="doc-card-header">
          <div class="doc-card-avatar a">${escapeHtml(d.user.full_name[0])}</div>
          <div class="doc-card-info">
            <div class="doc-card-name">Dr. ${escapeHtml(d.user.full_name)}</div>
            <div class="doc-card-spec">${escapeHtml(d.specialization)}</div>
            <div class="doc-card-rating"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>4.9 <span>· 142 reviews</span></div>
          </div>
        </div>
        <div class="doc-card-meta"><span>St. Mary's Hospital</span></div>
        <button class="select-doc-btn" data-id="${escapeHtml(String(d.id))}" data-name="${escapeHtml(d.user.full_name)}" data-spec="${escapeHtml(d.specialization)}" data-dept="${escapeHtml(d.department)}">Select Doctor</button>
      </div>`).join("");

    // Use a single delegated handler assigned via `onclick` (not
    // addEventListener) so re-running renderDoctors (e.g. React
    // Strict Mode double-invoking effects in dev) replaces the
    // previous handler instead of stacking duplicate listeners.
    grid.onclick = (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(".select-doc-btn");
      if (!btn) return;
      document.querySelectorAll(".doctor-card").forEach((c) => c.classList.remove("selected"));
      btn.closest(".doctor-card")?.classList.add("selected");
      stateRef.current.doctor = { id: btn.dataset.id!, full_name: `Dr. ${btn.dataset.name}`, specialization: btn.dataset.spec!, department: btn.dataset.dept! };
      (document.getElementById("step1Next") as HTMLButtonElement).disabled = false;
    };
  };

  // Real slot availability: fetch existing appointments and mark a slot
  // unavailable only if this doctor already has a non-cancelled
  // appointment at that exact date/time. Previously this was a fake
  // hash derived from the date string, so it never reflected real
  // bookings and allowed double-booking.
  const getSlotsForDate = async (dateStr: string) => {
    const doctorId = stateRef.current.doctor?.id;
    let taken = new Set<string>();
    try {
      const res = await fetch(`${apiUrl}/appointments`);
      if (res.ok) {
        const data = await res.json();
        const list: any[] = data.appointments ?? [];
        taken = new Set(
          list
            .filter((a) => String(a.doctor_id) === String(doctorId) && a.appointment_date === dateStr && a.status !== "Cancelled")
            .map((a) => a.appointment_time)
        );
      }
    } catch (e) {
      console.error("Failed to load slot availability:", e);
    }
    return allSlots.map((t) => ({ time: t, available: !taken.has(t) }));
  };

  const renderCalendar = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const label = document.getElementById("calMonthLabel");
    if (label) label.textContent = `${monthNames[calMonth]} ${calYear}`;
    const grid = document.getElementById("calendarGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    for (let i = 0; i < firstDay; i++) { const el = document.createElement("div"); el.className = "cal-day empty"; grid.appendChild(el); }
    for (let d = 1; d <= daysInMonth; d++) {
      const el = document.createElement("div");
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = new Date(calYear, calMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      el.className = `cal-day${isPast ? " past" : ""}${isToday ? " today" : ""}`;
      if (stateRef.current.date === dateStr) el.classList.add("selected");
      el.textContent = String(d);
      if (!isPast) { el.classList.add("has-slots"); el.addEventListener("click", () => selectDate(dateStr, el)); }
      grid.appendChild(el);
    }
  };

  const selectDate = async (dateStr: string, el: HTMLElement) => {
    document.querySelectorAll(".cal-day").forEach((c) => c.classList.remove("selected"));
    el.classList.add("selected");
    stateRef.current.date = dateStr; stateRef.current.time = null;
    (document.getElementById("step2Next") as HTMLButtonElement).disabled = true;
    const d = new Date(dateStr + "T00:00:00");
    const label = document.getElementById("selectedDateLabel");
    if (label) label.textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const grid = document.getElementById("timeslotGrid");
    if (!grid) return;
    grid.innerHTML = `<p class="timeslot-placeholder">Loading availability…</p>`;
    const slots = await getSlotsForDate(dateStr);
    if (stateRef.current.date !== dateStr) return; // user picked a different date while this was loading
    grid.innerHTML = "";
    slots.forEach((slot) => {
      const btn = document.createElement("button");
      btn.className = `time-slot${!slot.available ? " unavailable" : ""}`;
      btn.textContent = slot.time;
      if (!slot.available) btn.disabled = true;
      else btn.addEventListener("click", () => {
        document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        btn.classList.add("selected");
        stateRef.current.time = slot.time;
        (document.getElementById("step2Next") as HTMLButtonElement).disabled = false;
      });
      grid.appendChild(btn);
    });
  };

  useEffect(() => { if (step === 2) renderCalendar(); }, [step, calMonth, calYear]);

  const goTo = (n: number) => {
    document.getElementById(`step-${step}`)?.classList.remove("active");
    if (n > 4) { document.getElementById("step-success")?.classList.add("active"); updateStepBar(5); return; }
    setStep(n);
    document.getElementById(`step-${n}`)?.classList.add("active");
    updateStepBar(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStepBar = (active: number) => {
    document.querySelectorAll<HTMLElement>(".step").forEach((el) => {
      const n = parseInt(el.dataset.step ?? "0");
      el.classList.remove("active", "completed");
      if (n === active) el.classList.add("active");
      else if (n < active) el.classList.add("completed");
    });
    document.querySelectorAll(".step-line").forEach((line, i) => line.classList.toggle("completed", i + 1 < active));
  };

  const submitBooking = async () => {
    const btn = document.getElementById("confirmBtn") as HTMLButtonElement;
    btn.disabled = true;
    const userId = getCookie("userId");
    try {
      const res = await fetch(`${apiUrl}/appointments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: stateRef.current.doctor?.id, patient_id: userId, appointment_date: stateRef.current.date, appointment_time: stateRef.current.time }),
      });
      const response = await res.json();
      if (!res.ok || !response.success) { btn.disabled = false; return; }
      // Use the id the backend assigned to this appointment as the
      // booking reference instead of a client-generated random number,
      // which could collide and never matched the real record.
      const ref = response.appointment?.id ? `MB-${response.appointment.id}` : `MB-${Date.now()}`;
      const refEl = document.getElementById("bookingRef");
      if (refEl) refEl.textContent = ref;
      goTo(5);
    } catch (e) {
      console.error("Failed to submit booking:", e);
      btn.disabled = false;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-dot"><svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg></div><span className="brand-text">MediBook</span></div>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/user-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg><span>Dashboard</span></Link>
          <Link prefetch={false} className="nav-item" href="/my-appointments"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>Appointments</span></Link>
        </nav>
        <nav className="nav-section"><p className="nav-label">Account</p>
          <a className="nav-item" style={{ cursor: "pointer" }} onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg><span>Sign out</span></a>
        </nav>
        <div className="sidebar-user"><div className="user-avatar">U</div><div className="user-meta"><p className="name">User</p><p className="role">Patient</p></div></div>
      </aside>
      {/* Below 768px .sidebar becomes an overlay (see CSS); without this
          overlay + button there was no way to open it, so navigation
          (including Sign out) was unreachable on mobile. */}
      <div className="sidebar-overlay" onClick={() => { document.querySelector(".sidebar")?.classList.remove("open"); document.querySelector(".sidebar-overlay")?.classList.remove("open"); }}></div>

      <div className="main">
        <header className="topbar">
          <button className="hamburger-btn" aria-label="Toggle menu" onClick={() => { document.querySelector(".sidebar")?.classList.toggle("open"); document.querySelector(".sidebar-overlay")?.classList.toggle("open"); }}>
            <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="topbar-left">
            <Link className="back-btn" href="/user-dashboard"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg></Link>
            <h1 className="topbar-title">Book <span>Appointment</span></h1>
          </div>
          <div className="search-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input type="text" placeholder="Search doctors…" id="doctorSearch" onChange={(e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll<HTMLElement>(".doctor-card").forEach((c) => { const n = c.querySelector(".doc-card-name")?.textContent?.toLowerCase() ?? ""; c.style.display = n.includes(q) ? "" : "none"; });
          }} /></div>
        </header>

        <div className="content">
          <div className="steps-bar">
            {[{ n: 1, label: "Choose Doctor" }, { n: 2, label: "Pick Date & Time" }, { n: 3, label: "Details" }, { n: 4, label: "Confirm" }].map(({ n, label }, i) => (
              <React.Fragment key={n}><div key={n} className={`step${step === n ? " active" : step > n ? " completed" : ""}`} data-step={String(n)}><div className="step-bubble">{n}</div><span>{label}</span></div>{n < 4 && <div key={`l${n}`} className={`step-line${step > n ? " completed" : ""}`}></div>}</React.Fragment>
            ))}
          </div>

          {/* Step 1 */}
          <div className={`step-panel${step === 1 ? " active" : ""}`} id="step-1">
            <div className="panel-intro"><h2>Who would you like to see?</h2><p>Select a doctor from our network.</p></div>
            <div className="filter-chips" id="specialtyFilter">
              <button className="chip active" onClick={(e) => { document.querySelectorAll(".chip").forEach(c => c.classList.remove("active")); (e.target as HTMLElement).classList.add("active"); document.querySelectorAll<HTMLElement>(".doctor-card").forEach(c => c.style.display = ""); }}>All Specialties</button>
            </div>
            <div className="doctor-grid" id="doctorGrid"></div>
            <div className="step-footer"><span></span><button className="btn-primary" id="step1Next" disabled onClick={() => goTo(2)}>Continue →</button></div>
          </div>

          {/* Step 2 */}
          <div className={`step-panel${step === 2 ? " active" : ""}`} id="step-2">
            <div className="panel-intro"><h2>When works for you?</h2><p>Choose a date and time slot.</p></div>
            <div className="datetime-grid">
              <div className="card calendar-card">
                <div className="calendar-header">
                  <button className="cal-nav" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg></button>
                  <span id="calMonthLabel"></span>
                  <button className="cal-nav" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></button>
                </div>
                <div className="calendar-days-head"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
                <div className="calendar-grid" id="calendarGrid"></div>
              </div>
              <div className="card timeslot-card">
                <div className="timeslot-header"><h4 id="selectedDateLabel">Select a date first</h4></div>
                <div className="timeslot-grid" id="timeslotGrid"><p className="timeslot-placeholder">Please select a date.</p></div>
              </div>
            </div>
            <div className="step-footer"><button className="btn-secondary" onClick={() => goTo(1)}>← Back</button><button className="btn-primary" id="step2Next" disabled onClick={() => goTo(3)}>Continue →</button></div>
          </div>

          {/* Step 3 */}
          <div className={`step-panel${step === 3 ? " active" : ""}`} id="step-3">
            <div className="panel-intro"><h2>Appointment Details</h2><p>Tell us the reason for your visit.</p></div>
            <div className="details-grid">
              <div className="card details-form-card">
                <div className="form-group">
                  <label>Reason for Visit <span className="required">*</span></label>
                  <select id="visitReason" onChange={(e) => { stateRef.current.reason = e.target.value; }}>
                    <option value="">Select a reason…</option>
                    <option>Routine check-up / physical</option><option>Follow-up visit</option><option>New symptoms / concern</option><option>Medication review</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Describe your symptoms</label>
                  <textarea id="symptomsNote" rows={4} placeholder="Describe what you're experiencing…" onChange={(e) => { stateRef.current.notes = e.target.value; }}></textarea>
                </div>
              </div>
              <div className="booking-summary-card card">
                <h4>Booking Summary</h4>
                <div className="summary-item"><span className="summary-label">Doctor</span><span className="summary-val">{stateRef.current.doctor?.full_name || "—"}</span></div>
                <div className="summary-item"><span className="summary-label">Date</span><span className="summary-val">{stateRef.current.date || "—"}</span></div>
                <div className="summary-item"><span className="summary-label">Time</span><span className="summary-val">{stateRef.current.time || "—"}</span></div>
              </div>
            </div>
            <div className="step-footer"><button className="btn-secondary" onClick={() => goTo(2)}>← Back</button><button className="btn-primary" onClick={() => goTo(4)}>Review & Confirm →</button></div>
          </div>

          {/* Step 4 */}
          <div className={`step-panel${step === 4 ? " active" : ""}`} id="step-4">
            <div className="panel-intro"><h2>Review & Confirm</h2><p>Review your appointment before confirming.</p></div>
            <div className="confirm-layout">
              <div className="confirm-main">
                <div className="card confirm-doctor-card">
                  <div className="confirm-doc-avatar a">{stateRef.current.doctor?.full_name?.[0] || "D"}</div>
                  <div>
                    <div className="confirm-doc-name">{stateRef.current.doctor?.full_name || "—"}</div>
                    <div className="confirm-doc-spec">{stateRef.current.doctor?.specialization || "—"}</div>
                  </div>
                </div>
                <div className="card confirm-details-card">
                  <div className="confirm-row"><div className="confirm-icon-wrap teal"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /></svg></div><div><div className="confirm-row-label">Date & Time</div><div className="confirm-row-val">{stateRef.current.date} at {stateRef.current.time}</div></div></div>
                  <div className="confirm-row"><div className="confirm-icon-wrap amber"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg></div><div><div className="confirm-row-label">Reason</div><div className="confirm-row-val">{stateRef.current.reason}</div></div></div>
                </div>
                <div className="confirm-consent">
                  <label className="checkbox-label">
                    <input type="checkbox" id="consentCheck" onChange={(e) => { (document.getElementById("confirmBtn") as HTMLButtonElement).disabled = !e.target.checked; }} />
                    <span className="checkbox-custom"></span>
                    I confirm the information above is correct.
                  </label>
                </div>
              </div>
            </div>
            <div className="step-footer">
              <button className="btn-secondary" onClick={() => goTo(3)}>← Back</button>
              <button className="btn-primary confirm-btn" id="confirmBtn" disabled onClick={submitBooking}>
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Confirm Appointment
              </button>
            </div>
          </div>

          {/* Success */}
          <div className="step-panel" id="step-success">
            <div className="success-screen">
              <div className="success-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
              <h2>Appointment Confirmed!</h2>
              <p>Your appointment has been successfully booked.</p>
              <div className="success-ref">Booking Reference: <strong id="bookingRef">MB-2026-XXXX</strong></div>
              <div className="success-actions">
                <button className="btn-primary" onClick={() => window.location.reload()}>Book Another</button>
                <Link href="/my-appointments"><button className="btn-secondary">View Appointments</button></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ma-modal-overlay" id="mediModalOverlay" onClick={(e) => (window as any).MediAlert?._handleOverlayClick(e)}>
        <div className="ma-modal-box" id="mediModalBox"><div className="ma-modal-icon-area" id="mediModalIconArea"></div><div className="ma-modal-detail" id="mediModalDetail" style={{ display: "none" }}></div><div className="ma-modal-footer" id="mediModalFooter"></div></div>
      </div>
      <div className="ma-toast-stack" id="toastStack"></div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import "./third.style.css";
import { getCookie, apiUrl } from "../../lib/utils";

const SPECIALTIES = [
  { id: "Cardiologist", name: "Cardiologist", icon: "heart", color: "#D85A30", bg: "#FAECE7" },
  { id: "Neurologist", name: "Neurologist", icon: "brain", color: "#8B7EF8", bg: "#EEEDFE" },
  { id: "Dermatologist", name: "Dermatologist", icon: "skin", color: "#378ADD", bg: "#E6F1FB" },
  { id: "General", name: "General Practice", icon: "steth", color: "#EF9F27", bg: "#FAEEDA" },
  { id: "Orthopedician", name: "Orthopedician", icon: "bone", color: "#34C97A", bg: "#E3F8EC" },
  { id: "Pediatrician", name: "Pediatrician", icon: "child", color: "#22C5D9", bg: "#E0F9FC" },
  { id: "Oncologist", name: "Oncologist", icon: "cell", color: "#E0608A", bg: "#FAECF2" },
  { id: "Emergency", name: "Emergency", icon: "bolt", color: "#F07B3F", bg: "#FFF0E6" },
  { id: "Radiologist", name: "Radiologist", icon: "scan", color: "#888780", bg: "#F7F6F2" },
];

const DEPARTMENTS = [
  { id: "Cardiology", name: "Cardiology", sub: "Heart & Vascular", color: "#D85A30", bg: "#FAECE7" },
  { id: "Neurology", name: "Neurology", sub: "Brain & Nervous", color: "#8B7EF8", bg: "#EEEDFE" },
  { id: "Dermatology", name: "Dermatology", sub: "Skin & Aesthetics", color: "#378ADD", bg: "#E6F1FB" },
  { id: "General", name: "General Practice", sub: "Primary Care", color: "#EF9F27", bg: "#FAEEDA" },
  { id: "Orthopedics", name: "Orthopedics", sub: "Bones & Joints", color: "#34C97A", bg: "#E3F8EC" },
  { id: "Pediatrics", name: "Pediatrics", sub: "Child Health", color: "#22C5D9", bg: "#E0F9FC" },
  { id: "Oncology", name: "Oncology", sub: "Cancer Care", color: "#E0608A", bg: "#FAECF2" },
  { id: "Emergency", name: "Emergency", sub: "Acute & Trauma", color: "#F07B3F", bg: "#FFF0E6" },
];

const WORK_TYPES = [
  { id: "full-time", name: "Full-time", desc: "Regular contracted employee" },
  { id: "part-time", name: "Part-time", desc: "Reduced hours contract" },
  { id: "consultant", name: "Consultant", desc: "Independent contractor" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["06:00 AM","07:00 AM","08:00 AM","08:30 AM","09:00 AM","09:30 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM"];

function ThirdPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const stateRef = useRef({
    specialty: "", department: "", workType: "",
    experience: "0", bio: "", days: [] as string[], hours: ["09:00 AM", "05:00 PM"],
  });

  useEffect(() => {
    renderSpecialties();
    renderDepartments();
    renderWorkTypes();
    renderDays();
    renderHours();
    updateChecklist();
    updatePreview();
  }, []);

  const showToast = (msg: string, type = "success") => {
    const t = document.getElementById("toast") as HTMLElement;
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type}`;
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => t.classList.remove("show"), 3500);
  };

  const renderSpecialties = () => {
    const grid = document.getElementById("specialtyGrid");
    if (!grid) return;
    grid.innerHTML = SPECIALTIES.map((s) => `
      <div class="spec-card" id="spec-${s.id}" onclick="window.__selectSpecialty('${s.id}')">
        <div class="spec-card-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="spec-card-icon" style="background:${s.bg};"><svg viewBox="0 0 24 24" style="stroke:${s.color};width:22px;height:22px;fill:none;stroke-width:2"><circle cx="12" cy="12" r="5"/></svg></div>
        <div class="spec-card-name">${s.name}</div>
      </div>`).join("");
  };

  const renderDepartments = () => {
    const grid = document.getElementById("deptGrid");
    if (!grid) return;
    grid.innerHTML = DEPARTMENTS.map((d) => `
      <div class="dept-card" id="dept-${d.id}" onclick="window.__selectDepartment('${d.id}')">
        <div class="dept-icon" style="background:${d.bg};"><svg viewBox="0 0 24 24" style="stroke:${d.color};width:20px;height:20px;fill:none;stroke-width:2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div>
        <div class="dept-info"><div class="dept-name">${d.name}</div><div class="dept-sub">${d.sub}</div></div>
        <div class="dept-radio"></div>
      </div>`).join("");
  };

  const renderWorkTypes = () => {
    const grid = document.getElementById("workTypeGrid");
    if (!grid) return;
    grid.innerHTML = WORK_TYPES.map((wt) => `
      <div class="wt-card" id="wt-${wt.id}" onclick="window.__selectWorkType('${wt.id}')">
        <div class="wt-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="wt-name">${wt.name}</div>
        <div class="wt-desc">${wt.desc}</div>
      </div>`).join("");
  };

  const renderDays = () => {
    const row = document.getElementById("daysRow");
    if (!row) return;
    row.innerHTML = DAYS.map((d) => `
      <button class="day-btn" id="day-${d}" onclick="window.__toggleDay('${d}')">${d}</button>`).join("");
  };

  const renderHours = () => {
    const from = document.getElementById("hourFrom") as HTMLSelectElement;
    const to = document.getElementById("hourTo") as HTMLSelectElement;
    if (!from || !to) return;
    const opts = HOURS.map((h, i) => `<option value="${i}">${h}</option>`).join("");
    from.innerHTML = opts; to.innerHTML = opts;
    from.value = "4"; to.value = "14";
    stateRef.current.hours = [HOURS[4], HOURS[14]];
    from.addEventListener("change", () => { stateRef.current.hours[0] = HOURS[+from.value]; });
    to.addEventListener("change", () => { stateRef.current.hours[1] = HOURS[+to.value]; });
  };

  const selectSpecialty = (id: string) => {
    stateRef.current.specialty = id;
    document.querySelectorAll(".spec-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById(`spec-${id}`)?.classList.add("selected");
    const wrap = document.getElementById("subSpecWrap");
    wrap?.classList.add("open");
    const matchDept = DEPARTMENTS.find((d) => d.name === SPECIALTIES.find((s) => s.id === id)?.name);
    if (matchDept) selectDepartment(matchDept.id);
    updateChecklist(); updatePreview(); updateSidebarSteps();
  };

  const selectDepartment = (id: string) => {
    stateRef.current.department = id;
    document.querySelectorAll(".dept-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById(`dept-${id}`)?.classList.add("selected");
    updateChecklist(); updatePreview(); updateSidebarSteps();
  };

  const selectWorkType = (id: string) => {
    stateRef.current.workType = id;
    document.querySelectorAll(".wt-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById(`wt-${id}`)?.classList.add("selected");
    updateChecklist(); updatePreview(); updateSidebarSteps();
  };

  const toggleDay = (day: string) => {
    const btn = document.getElementById(`day-${day}`);
    const days = stateRef.current.days;
    if (days.includes(day)) {
      stateRef.current.days = days.filter((d) => d !== day);
      btn?.classList.remove("active");
    } else {
      stateRef.current.days.push(day);
      btn?.classList.add("active");
    }
    updateChecklist(); updateSidebarSteps();
  };

  const handleExpRange = (input: HTMLInputElement) => {
    const val = Number(input.value);
    stateRef.current.experience = String(val);
    const el = document.getElementById("expVal");
    if (el) el.textContent = val === 0 ? "0" : val === 40 ? "40+" : String(val);
    const pct = (val / 40) * 100;
    input.style.backgroundSize = `${pct}% 100%`;
    updateChecklist(); updatePreview(); updateSidebarSteps();
  };

  const handleBio = (el: HTMLTextAreaElement) => {
    const len = el.value.length;
    const countEl = document.getElementById("bioCount");
    if (countEl) countEl.textContent = `${len} / 600`;
    stateRef.current.bio = el.value;
    updateChecklist(); updatePreview(); updateSidebarSteps();
  };

  const getCheckItems = () => {
    const expVal = parseInt((document.getElementById("expVal") as HTMLElement)?.textContent || "0");
    const bio = (document.getElementById("bioTextarea") as HTMLTextAreaElement)?.value?.trim() || "";
    return [
      { id: "specialty", check: !!stateRef.current.specialty },
      { id: "department", check: !!stateRef.current.department },
      { id: "worktype", check: !!stateRef.current.workType },
      { id: "days", check: stateRef.current.days.length > 0 },
      { id: "experience", check: expVal > 0 },
      { id: "bio", check: bio.length >= 30 },
    ];
  };

  const updateChecklist = () => {
    const items = getCheckItems();
    let doneCount = 0;
    items.forEach((item) => {
      const row = document.getElementById(`chk-${item.id}`);
      row?.classList.toggle("done", item.check);
      if (item.check) doneCount++;
    });
    const pct = Math.round((doneCount / items.length) * 100);
    const pctStr = `${pct}%`;
    const compBar = document.getElementById("compBar") as HTMLElement;
    const compPct = document.getElementById("compPct");
    const footerPct = document.getElementById("footerPct");
    const topBar = document.getElementById("topBarFill") as HTMLElement;
    if (compBar) compBar.style.width = pctStr;
    if (compPct) compPct.textContent = pctStr;
    if (footerPct) footerPct.textContent = pctStr;
    if (topBar) topBar.style.width = `${25 + pct * 0.25}%`;
    const coresDone = items.filter((i) => ["specialty", "department", "worktype"].includes(i.id)).every((i) => i.check);
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    if (nextBtn) nextBtn.disabled = !coresDone;
  };

  const updatePreview = () => {
    const spec = SPECIALTIES.find((s) => s.id === stateRef.current.specialty);
    const specEl = document.getElementById("previewSpec");
    const cardTop = document.getElementById("previewCardTop") as HTMLElement;
    const bioEl = document.getElementById("previewBio");
    if (specEl) specEl.textContent = spec ? spec.name : "Select a specialty to continue";
    if (cardTop) cardTop.style.background = spec ? `linear-gradient(135deg, ${spec.color}, ${spec.color}99)` : "linear-gradient(135deg, var(--teal-400), var(--teal-800))";
    const bio = (document.getElementById("bioTextarea") as HTMLTextAreaElement)?.value || "";
    if (bioEl) bioEl.innerHTML = bio.length ? `<span>${bio.slice(0, 120)}${bio.length > 120 ? "…" : ""}</span>` : `<span class="preview-placeholder">Your bio will appear here…</span>`;
    const sbSpec = document.getElementById("previewSpecSidebar");
    if (sbSpec) sbSpec.textContent = spec ? spec.name : "Select specialty";
  };

  const updateSidebarSteps = () => {
    const steps = [
      { id: "ss-dept", done: !!stateRef.current.department },
      { id: "ss-worktype", done: !!stateRef.current.workType },
      { id: "ss-availability", done: stateRef.current.days.length > 0 },
      { id: "ss-experience", done: parseInt((document.getElementById("expVal") as HTMLElement)?.textContent || "0") > 0 },
      { id: "ss-bio", done: (document.getElementById("bioTextarea") as HTMLTextAreaElement)?.value?.trim().length >= 30 },
    ];
    steps.forEach((s) => {
      const el = document.getElementById(s.id);
      el?.classList.toggle("completed", s.done);
      el?.classList.toggle("active", !s.done);
    });
  };

  const scrollToBlock = (id: string) => {
    document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNext = async () => {
    const items = getCheckItems();
    const missing = items.filter((i) => !i.check).map((i) => i.id);
    const room_number = (document.getElementById("roomInput") as HTMLInputElement)?.value.trim();

    if (!room_number) { showToast("Please enter your room number.", "error"); return; }
    if (missing.includes("specialty")) { showToast("Please select your specialty.", "error"); scrollToBlock("specialty"); return; }
    if (missing.includes("department")) { showToast("Please choose a department.", "error"); scrollToBlock("department"); return; }
    if (missing.includes("worktype")) { showToast("Please select your work type.", "error"); scrollToBlock("worktype"); return; }

    const userId = getCookie("userId");
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement | null;
    if (nextBtn) nextBtn.disabled = true;

    try {
      const res = await fetch(`${apiUrl}/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialization: stateRef.current.specialty,
          department: stateRef.current.department,
          experience: stateRef.current.experience,
          type: stateRef.current.workType,
          bio: stateRef.current.bio,
          room_number,
          user_id: userId,
        }),
      });
      const response = await res.json();
      if (!res.ok || !response.success) { showToast(response.message ?? "Could not save your profile.", "error"); return; }

      const res1 = await fetch(`${apiUrl}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_day: stateRef.current.days.join(", "),
          start_time: stateRef.current.hours[0],
          end_time: stateRef.current.hours[1],
          doctor_id: response.userId,
        }),
      });
      const response1 = await res1.json();
      if (!res1.ok || !response1.success) { showToast(response1.message ?? "Could not save your schedule.", "error"); return; }

      showToast("Professional profile saved!");
      // email came from a decoded search param — re-encode it before
      // putting it back into a URL, or a "+" or "&" in the address
      // would corrupt the query string on the next page.
      setTimeout(() => { router.push(`/verify-email?email=${encodeURIComponent(email)}`); }, 1500);
    } catch (e) {
      console.error("Failed to save professional profile:", e);
      showToast("Something went wrong. Please check your connection and try again.", "error");
    } finally {
      if (nextBtn) nextBtn.disabled = false;
    }
  };

  // expose to window for inline onclick handlers
  useEffect(() => {
    (window as any).__selectSpecialty = selectSpecialty;
    (window as any).__selectDepartment = selectDepartment;
    (window as any).__selectWorkType = selectWorkType;
    (window as any).__toggleDay = toggleDay;
  });

  return (
    <>
      <div className="top-bar"><div className="top-bar-fill" id="topBarFill"></div></div>
      <header className="nav-header">
        <Link href="/register" className="nav-brand">
          <div className="brand-mark"><svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg></div>
          <span className="brand-name">MediBook</span>
        </Link>
        <div className="step-track">
          <div className="s-node"><div className="s-circle done"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div></div>
          <div className="s-line done"></div>
          <div className="s-node"><div className="s-circle done"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div></div>
          <div className="s-line done"></div>
          <div className="s-node"><div className="s-circle active">3</div></div>
        </div>
        <div className="nav-actions"></div>
      </header>

      <div className="page-layout">
        {/* SIDEBAR */}
        <aside className="left-sidebar">
          <div className="sidebar-heading">Profile Setup</div>
          <div className="sidebar-steps">
            {[
              { id: "specialty", title: "Specialty", desc: "Medical field" },
              { id: "department", title: "Department", desc: "Clinical unit" },
              { id: "worktype", title: "Work Type", desc: "Employment basis" },
              { id: "availability", title: "Availability", desc: "Working days & hours" },
              { id: "experience", title: "Experience", desc: "Years & credentials" },
              { id: "bio", title: "Bio & Profile", desc: "About you" },
            ].map((s, i) => (
              <div key={s.id} className={`sidebar-step${i < 2 ? " completed" : ""}`} id={`ss-${s.id}`} onClick={() => scrollToBlock(s.id)}>
                <div className="ss-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /></svg></div>
                <div className="ss-info"><div className="ss-title">{s.title}</div><div className="ss-desc">{s.desc}</div></div>
                <div className="ss-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
              </div>
            ))}
          </div>
          <div className="profile-preview">
            <div className="pp-label">Profile Preview</div>
            <div className="pp-card">
              <div className="pp-row">
                <div className="pp-avatar" id="previewAvatarSidebar">DR</div>
                <div>
                  <div className="pp-name" id="previewNameSidebar">Your Name</div>
                  <div className="pp-sub" id="previewSpecSidebar">Select specialty</div>
                </div>
              </div>
              <div className="pp-completeness">
                <div className="pp-comp-label"><span>Profile completeness</span><span id="compPct">0%</span></div>
                <div className="pp-bar"><div className="pp-bar-fill" id="compBar" style={{ width: "0%" }}></div></div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN FORM */}
        <div className="form-col" id="formCol">
          <div className="form-section-head">
            <div className="section-badge">Step 3 of 3 — Professional Profile</div>
            <h1>Set up your <em>clinical profile.</em></h1>
            <p>Tell patients about your expertise, availability, and background.</p>
          </div>

          {/* SPECIALTY */}
          <div className="form-block" id="block-specialty">
            <div className="block-title">Specialty</div>
            <div className="specialty-grid" id="specialtyGrid"></div>
            <div className="sub-spec-wrap" id="subSpecWrap">
              <div className="field" style={{ marginTop: 10 }}>
                <label>Sub-specialty / Focus area <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>(optional)</span></label>
                <input className="field-input" id="subSpecInput" type="text" placeholder="e.g. Interventional Cardiology…" />
              </div>
            </div>
          </div>

          {/* DEPARTMENT */}
          <div className="form-block" id="block-department">
            <div className="block-title">Department</div>
            <div className="dept-grid" id="deptGrid"></div>
          </div>

          {/* WORK TYPE */}
          <div className="form-block" id="block-worktype">
            <div className="block-title">Work Type</div>
            <div className="work-type-grid" id="workTypeGrid"></div>
          </div>

          {/* AVAILABILITY */}
          <div className="form-block" id="block-availability">
            <div className="block-title">Availability</div>
            <div className="field">
              <label>Working Days</label>
              <div className="days-row" id="daysRow"></div>
            </div>
            <div className="field" style={{ marginTop: "1.25rem" }}>
              <label>Consultation Hours</label>
              <div className="hour-row">
                <select className="field-input" id="hourFrom"></select>
                <span className="hour-sep">→</span>
                <select className="field-input" id="hourTo"></select>
              </div>
            </div>
          </div>

          {/* EXPERIENCE */}
          <div className="form-block" id="block-experience">
            <div className="block-title">Experience</div>
            <div className="exp-row">
              <div className="field">
                <label>Years of Experience</label>
                <div className="range-wrap">
                  <div className="range-label"><span>Years practicing</span><strong id="expVal">0</strong></div>
                  <input className="range-input" id="expRange" type="range" min="0" max="40" defaultValue="0"
                    onChange={(e) => handleExpRange(e.target as HTMLInputElement)} />
                </div>
              </div>
            </div>
          </div>

          {/* BIO */}
          <div className="form-block" id="block-bio">
            <div className="block-title">Bio & Profile</div>
            <div className="field">
              <label>Professional Bio</label>
              <div className="bio-wrap">
                <textarea className="bio-textarea" id="bioTextarea" maxLength={600}
                  placeholder="Describe your clinical background…"
                  onChange={(e) => handleBio(e.target as HTMLTextAreaElement)}></textarea>
                <div className="bio-count" id="bioCount">0 / 600</div>
              </div>
            </div>
            <div className="field-row" style={{ marginTop: "0.5rem" }}>
              <div className="field">
                <label>Room / Office</label>
                <input className="field-input" id="roomInput" type="text" placeholder="e.g. 204B" />
              </div>
              <div className="field">
                <label>Hospital / Clinic Affiliation</label>
                <input className="field-input" id="hospitalInput" type="text" placeholder="e.g. MediBook Main Hospital" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="right-panel">
          <div className="rp-section">
            <h4>Live Preview</h4>
            <div className="preview-card">
              <div className="preview-card-top" id="previewCardTop">
                <div className="preview-avatar" id="previewAvatar">DR</div>
              </div>
              <div className="preview-card-body">
                <div className="preview-name" id="previewName">Your Name</div>
                <div className="preview-spec" id="previewSpec">Select a specialty to continue</div>
                <div className="preview-tags" id="previewTags"></div>
                <div className="preview-bio-text" id="previewBio"><span className="preview-placeholder">Your bio will appear here…</span></div>
              </div>
            </div>
          </div>
          <div className="rp-section">
            <h4>Completion Checklist</h4>
            <div className="checklist" id="checklist">
              {[
                { id: "specialty", label: "Specialty selected" },
                { id: "department", label: "Department chosen" },
                { id: "worktype", label: "Work type set" },
                { id: "days", label: "Working days selected" },
                { id: "experience", label: "Experience added" },
                { id: "bio", label: "Bio written" },
              ].map((item) => (
                <div className="check-row" id={`chk-${item.id}`} key={item.id}>
                  <div className="cr-dot"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <div className="form-footer">
        <div className="footer-info">Completion: <span id="footerPct">0%</span></div>
        <div className="footer-actions">
          <button className="btn-back" onClick={() => router.push("/register")}>
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button className="btn-next" id="nextBtn" disabled onClick={handleNext}>
            Continue
            <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </div>

      <div className="toast" id="toast"></div>
    </>
  );
}

export default function ThirdPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThirdPageContent />
    </Suspense>
  );
}

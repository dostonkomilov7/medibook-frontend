"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, notFound } from "next/navigation";
import "./doctor-management.style.css";
import { getCookie, getUserData, apiUrl, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";
const COLORS = ["#1D9E75","#378ADD","#D85A30","#EF9F27","#8B7EF8","#34C97A","#E0608A","#22C5D9","#F07B3F"];
const SPEC_CLASS: Record<string,string> = {
  Cardiology:"cardio",Dermatology:"derm",Neurology:"neuro",
  "General Practice":"general",Orthopedics:"ortho",Pediatrics:"pediatric",Oncology:"oncology"
};
const PER_PAGE = 8;
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SPECIALTIES = ["Cardiologist","Dermatologist","Neurologist","General Practice","Orthopedic","Pediatrician","Oncologist"];
const DEPARTMENTS = ["Cardiology","Dermatology","Neurology","Surgery","General Practice","Orthopedics","Pediatrics","Oncology"];

function strJoined(date: string) {
  const parts = date.split("-");
  const months: Record<string,string> = {"01":"January","02":"February","03":"March","04":"April","05":"May","06":"June","07":"July","08":"August","09":"September","10":"October","11":"November","12":"December"};
  return `${months[parts[1]] ?? ""}, ${parts[0]}`;
}

type DrawerMode = "view"|"edit"|"add"|null;

export default function DoctorManagementPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({total:0,active:0,inactive:0,appointments:0});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerDoc, setDrawerDoc] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<string|null>(null);
  const [addForm, setAddForm] = useState({fname:"",lname:"",email:"",phone:"",pass:"",spec:"",dept:"",type:"Full-time",room:"",experience:"No experience",bio:"",days:[] as string[]});
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({msg,type});
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(null), 3200);
  };

  useEffect(()=>{
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    if (getCookie("role") !== "Admin") {
      notFound();
    }
    init();
  },[router]);

  const init = async () => {
    try {
      const ud = await getUserData();
      setUserData(ud);
      const res = await fetch(`${apiUrl}/doctors`);
      if (!res.ok) { showToast("Failed to load doctors.", "error"); return; }
      const data = await res.json();
      setDoctors(data.doctors ?? []);
      setFiltered(data.doctors ?? []);
      setStats({
        total: (data.doctors??[]).length,
        active: data.countActive ?? 0,
        inactive: data.countInactive ?? 0,
        appointments: 0,
      });
    } catch (e) {
      console.error("Failed to load doctors:", e);
      showToast("Failed to load doctors.", "error");
    }
  };

  useEffect(()=>{
    let list = [...doctors];
    if (search) { const q=search.toLowerCase(); list=list.filter(d=>d.user?.full_name?.toLowerCase().includes(q)||d.user?.email?.toLowerCase().includes(q)); }
    if (specFilter) list = list.filter(d=>d.department===specFilter);
    if (statusFilter) list = list.filter(d=>d.user?.status===statusFilter);
    if (typeFilter) list = list.filter(d=>d.type===typeFilter);
    setFiltered(list);
    setPage(1);
  },[search,specFilter,statusFilter,typeFilter,doctors]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const pageSlice = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const deleteDoctor = async () => {
    if (!delTarget) return;
    const d = doctors.find(x=>x.id===delTarget);
    try {
      const res = await fetch(`${apiUrl}/doctors/${delTarget}`,{method:"DELETE"});
      const r = await res.json();
      if (!res.ok || !r.success) { showToast(`${d?.user?.full_name??"Doctor"} could not be removed.`,"error"); return; }
      setDoctors(prev=>prev.filter(x=>x.id!==delTarget));
      setDelTarget(null);
      showToast(`${d?.user?.full_name??"Doctor"} has been removed.`,"error");
    } catch (e) {
      console.error("Failed to delete doctor:", e);
      showToast("Something went wrong.","error");
    }
  };

  const saveAdd = async () => {
    const {fname,lname,email,phone,pass,spec,dept,type,room,experience,bio} = addForm;
    if (!pass||pass.length<8) { showToast("Password must be at least 8 characters.","error"); return; }
    if (!fname||!lname||!email||!phone||!spec||!dept||!type||!room||!bio) { showToast("Please fill in all required fields.","error"); return; }
    try {
      const res1 = await fetch(`${apiUrl}/auth/register`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:`${fname} ${lname}`,age:null,email,password:pass,phone,role:"Doctor"})});
      const r1 = await res1.json();
      if (!res1.ok || !r1.success) { showToast(r1.message ?? "Could not create the doctor's account.","error"); return; }
      const res2 = await fetch(`${apiUrl}/doctors`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({specialization:spec,department:dept,experience,bio,type,room_number:room,user_id:r1.userId})});
      const r2 = await res2.json();
      if (!res2.ok || !r2.success) { showToast(r2.message ?? "Could not create the doctor profile.","error"); return; }
      showToast(`Dr. ${fname} ${lname} added successfully.`,"success");
      setDrawerMode(null);
      init();
    } catch (e) {
      console.error("Failed to add doctor:", e);
      showToast("Something went wrong.","error");
    }
  };

  const accessTelegram = async () => {
    const userId = getCookie("userId");
    if (userId) window.location.href = `https://t.me/medibook_clinic_bot?start=${userId}`;
  };

  const adminName = userData?.users?.[0]?.full_name ?? "";
  const fullDate = new Date().toDateString();

  return (
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
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span className="label">Appointments</span><span className="badge">5</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="label">Doctors</span><span className="badge">Soon</span></a>
          <Link prefetch={false} className="nav-item" href="/department-management"><svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg><span className="label">Departments</span><span className="badge">Soon</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">System</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span className="label">Analytics</span><span className="badge">Soon</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span className="label">Support Tickets</span><span className="badge">Soon</span></a>
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
            <div className="topbar-title">Doctors <span>Management</span></div>
            <div className="topbar-sub">MediBook Admin Panel · {fullDate}</div>
          </div>
          <div className="topbar-right">
            <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className="notif-dot"></span></button>
            <div className="admin-avatar top-avatar" style={{width:"36px",height:"36px",fontSize:"12px",cursor:"pointer"}}>{adminName?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left"><h1>Manage <em>Doctors</em></h1><p>Add, edit, deactivate or review all registered medical staff.</p></div>
            <div className="header-actions">
              <button className="btn-primary" onClick={()=>{setDrawerMode("add");setAddForm({fname:"",lname:"",email:"",phone:"",pass:"",spec:"",dept:"",type:"Full-time",room:"",experience:"No experience",bio:"",days:[]});}}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Doctor
              </button>
              <button className="btn-primary" onClick={accessTelegram}>Go To Telegram</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-strip">
            <div className="stat-card"><div className="stat-icon teal"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div className="stat-text"><div className="val total-dc">{stats.total}</div><div className="lbl">Total Doctors</div></div></div>
            <div className="stat-card"><div className="stat-icon teal"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div className="stat-text"><div className="val">{stats.active}</div><div className="lbl">Active</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div className="stat-text"><div className="val">{stats.inactive}</div><div className="lbl">Inactive</div></div></div>
            <div className="stat-card"><div className="stat-icon coral"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div className="stat-text"><div className="val">0</div><div className="lbl">Suspended</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div className="stat-text"><div className="val">{stats.appointments}</div><div className="lbl">Total Appointments</div></div></div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search name, ID, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="filter-select" value={specFilter} onChange={e=>setSpecFilter(e.target.value)}>
              <option value="">All Specialties</option>
              {DEPARTMENTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
            <select className="filter-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Consultant">Consultant</option>
            </select>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table id="doctors-table">
              <thead>
                <tr>
                  <th style={{width:"44px"}}>
                    <input type="checkbox" style={{width:"16px",height:"16px",accentColor:"var(--teal-400)",cursor:"pointer"}}
                      checked={pageSlice.length>0&&pageSlice.every(d=>selected.has(d.id))}
                      onChange={e=>{const n=new Set(selected);pageSlice.forEach(d=>e.target.checked?n.add(d.id):n.delete(d.id));setSelected(n);}}/>
                  </th>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Type</th>
                  <th>Rating</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th style={{textAlign:"right"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:"center",padding:"3rem",color:"var(--gray-400)"}}>No doctors found.</td></tr>
                ) : pageSlice.map((d: any) => {
                  const specClass = SPEC_CLASS[d.specialization] || "general";
                  const sClass = d.user?.status?.toLowerCase();
                  const stars = "★".repeat(Math.round(4.9)) + "☆".repeat(5-Math.round(4.9));
                  const isSelected = selected.has(d.id);
                  return (
                    <tr key={d.id} className={isSelected?"selected":""} onClick={()=>{setDrawerDoc(d);setDrawerMode("view");}}>
                      <td><input type="checkbox" checked={isSelected} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();const n=new Set(selected);e.target.checked?n.add(d.id):n.delete(d.id);setSelected(n);}} style={{width:"16px",height:"16px",accentColor:"var(--teal-400)",cursor:"pointer"}}/></td>
                      <td>
                        <div className="doc-cell">
                          {/* Was Math.random() — picked a new color on every
                              re-render (e.g. each keystroke in search),
                              making each doctor's avatar flicker between
                              colors instead of having a stable identity. */}
                          <div className="doc-av" style={{background:COLORS[Number(d.id)%COLORS.length]}}>{d.user?.full_name?.[0]?.toUpperCase()}</div>
                          <div><div className="doc-name">{d.user?.full_name}</div><div className="doc-id">ID: {d.id} · {d.user?.email}</div></div>
                        </div>
                      </td>
                      <td><span className={`spec-badge ${specClass}`}>{d.specialization}</span></td>
                      <td style={{color:"var(--gray-600)",fontSize:"13px"}}>{d.type}</td>
                      <td><div className="rating-cell"><span className="stars">{stars}</span><span className="rating-val">4.9</span></div></td>
                      <td style={{color:"var(--gray-600)",fontSize:"13px"}}>{strJoined(d.createdAt??d.created_at??"")}</td>
                      <td><span className={`status-pill ${sClass}`}>{d.user?.status}</span></td>
                      <td>
                        <div className="row-actions" style={{justifyContent:"flex-end"}}>
                          <button className="row-btn del" title="Delete" onClick={e=>{e.stopPropagation();setDelTarget(d.id);}}>
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer">
              <div className="table-footer-info">Showing <span>{filtered.length>0?`${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,filtered.length)}`:"0"}</span> of <span>{filtered.length}</span> doctors</div>
              <div className="pagination">
                <button className="page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
                <div>{Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(n=><button key={n} className={`page-btn${n===page?" active":""}`} onClick={()=>setPage(n)}>{n}</button>)}</div>
                <button className="page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWER */}
      <div className={`drawer-overlay${drawerMode?" open":""}`} onClick={e=>{if((e.target as HTMLElement).classList.contains("drawer-overlay"))setDrawerMode(null);}}>
        <div className="drawer">
          <div className="drawer-header">
            <div>
              <h2>{drawerMode==="add"?"Add New Doctor":drawerMode==="edit"?"Edit Doctor":"Doctor Profile"}</h2>
              <p>{drawerMode==="add"?"Fill in the doctor's information":drawerMode==="edit"?`Editing ${drawerDoc?.user?.full_name}`:"View and manage doctor information"}</p>
            </div>
            <button className="drawer-close" onClick={()=>setDrawerMode(null)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>

          <div className="drawer-body">
            {/* ADD FORM */}
            {drawerMode === "add" && (
              <div>
                <div className="form-fields-row">
                  <div className="form-field"><label>First Name</label><input className="form-input" placeholder="John" value={addForm.fname} onChange={e=>setAddForm(f=>({...f,fname:e.target.value}))}/></div>
                  <div className="form-field"><label>Last Name</label><input className="form-input" placeholder="Doe" value={addForm.lname} onChange={e=>setAddForm(f=>({...f,lname:e.target.value}))}/></div>
                </div>
                <div className="form-field"><label>Email</label><input className="form-input" type="email" placeholder="john.doe@medibook.com" value={addForm.email} onChange={e=>setAddForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-field"><label>Phone</label><input className="form-input" type="tel" placeholder="+1 555 000 0000" value={addForm.phone} onChange={e=>setAddForm(f=>({...f,phone:e.target.value}))}/></div>
                <div className="form-field"><label>Password</label><input className="form-input" type="password" placeholder="••••••••" value={addForm.pass} onChange={e=>setAddForm(f=>({...f,pass:e.target.value}))}/></div>
                <div className="form-field"><label>Department</label>
                  <select className="form-input" value={addForm.dept} onChange={e=>setAddForm(f=>({...f,dept:e.target.value}))}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-fields-row">
                  <div className="form-field"><label>Specialty</label>
                    <select className="form-input" value={addForm.spec} onChange={e=>setAddForm(f=>({...f,spec:e.target.value}))}>
                      <option value="">Select specialty</option>
                      {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field"><label>Employment Type</label>
                    <select className="form-input" value={addForm.type} onChange={e=>setAddForm(f=>({...f,type:e.target.value}))}>
                      <option>Full-time</option><option>Part-time</option><option>Consultant</option>
                    </select>
                  </div>
                </div>
                <div className="form-fields-row">
                  <div className="form-field"><label>Room / Office</label><input className="form-input" placeholder="e.g. 204" value={addForm.room} onChange={e=>setAddForm(f=>({...f,room:e.target.value}))}/></div>
                  <div className="form-field"><label>Experience</label>
                    <select className="form-input" value={addForm.experience} onChange={e=>setAddForm(f=>({...f,experience:e.target.value}))}>
                      <option>No experience</option><option>2-6 months</option><option>6-12 months</option><option>1-4 year</option><option>5-10 year</option><option>10+ year</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>Working Days</label>
                  <div className="days-row">
                    {DAYS.map(day=>(
                      <div key={day} className={`day-chip${addForm.days.includes(day)?" selected":""}`}
                        onClick={()=>setAddForm(f=>({...f,days:f.days.includes(day)?f.days.filter(d=>d!==day):[...f.days,day]}))}>
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-field"><label>Biography</label><textarea className="form-textarea" placeholder="Brief professional summary…" value={addForm.bio} onChange={e=>setAddForm(f=>({...f,bio:e.target.value}))}/></div>
              </div>
            )}

            {/* VIEW */}
            {drawerMode === "view" && drawerDoc && (
              <div>
                <div className="drawer-doc-profile">
                  <div className="drawer-av" style={{width:"56px",height:"56px",fontSize:"18px",background:COLORS[0],borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600}}>{drawerDoc.user?.full_name?.[0]?.toUpperCase()}</div>
                  <div className="drawer-doc-info">
                    <div className="d-name">{drawerDoc.user?.full_name}</div>
                    <div className="d-spec">{drawerDoc.specialization} · {drawerDoc.type}</div>
                    <div className="d-tags">
                      <span className={`spec-badge ${SPEC_CLASS[drawerDoc.specialization]||"general"}`}>{drawerDoc.specialization}</span>
                      <span className={`status-pill ${drawerDoc.user?.status?.toLowerCase()}`}>{drawerDoc.user?.status}</span>
                    </div>
                  </div>
                </div>
                <div className="info-section">
                  <h4>Contact &amp; Identity</h4>
                  <div className="info-grid">
                    <div className="info-item"><div className="i-label">Doctor ID</div><div className="i-val">{drawerDoc.id}</div></div>
                    <div className="info-item"><div className="i-label">Email</div><div className="i-val">{drawerDoc.user?.email}</div></div>
                    <div className="info-item"><div className="i-label">Room</div><div className="i-val">{drawerDoc.room_number}</div></div>
                    <div className="info-item"><div className="i-label">Department</div><div className="i-val">{drawerDoc.department}</div></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="drawer-footer">
            <button className="btn-ghost" onClick={()=>setDrawerMode(null)}>Cancel</button>
            {/*
              Clicking "Edit Doctor" used to switch drawerMode to "edit",
              but no edit form exists for that mode — the drawer body
              rendered nothing, and "Save Changes" just popped a
              "Doctor updated." toast without changing any real data.
              Until a real edit form is built, be honest about it
              instead of pretending the edit succeeded.
            */}
            <button className="btn-save" onClick={()=>{if(drawerMode==="add")saveAdd();else showToast("Editing doctor profiles isn't available yet.","warning");}}>
              {drawerMode==="add"?"Add Doctor":"Edit Doctor"}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {delTarget && (
        <div className="modal-overlay open" onClick={e=>{if((e.target as HTMLElement).classList.contains("modal-overlay"))setDelTarget(null);}}>
          <div className="modal">
            <div className="modal-body-inner">
              <div className="modal-del-icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></div>
              <h3>Delete Doctor</h3>
              <p>Are you sure you want to remove <strong>{doctors.find(d=>d.id===delTarget)?.user?.full_name??"this doctor"}</strong>? This action is permanent.</p>
            </div>
            <div className="modal-footer-inner">
              <button className="btn-del-cancel" onClick={()=>setDelTarget(null)}>Keep Doctor</button>
              <button className="btn-del-confirm" onClick={deleteDoctor}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

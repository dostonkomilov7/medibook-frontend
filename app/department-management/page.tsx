"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, notFound } from "next/navigation";
import "./department-management.style.css";
import { getCookie, getUserData, signOut } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const COLORS = ["#D85A30","#8B7EF8","#378ADD","#EF9F27","#34C97A","#22C5D9","#E0608A","#F07B3F","#1D9E75"];

const DEPTS = [
  { id:"DEPT-001",name:"Cardiology",code:"CARD",color:"#D85A30",colorKey:"coral",icon:"heart",status:"Active",building:"Main",floor:"4th Floor",head:"Dr. Sarah Rahman",headInitials:"SR",headColor:"#1D9E75",staff:28,doctors:8,nurses:20,beds:42,occupancy:88,appts:312,founded:"2014",phone:"+1 555 201 4100",budget:"$2.4M",desc:"Specialises in diagnosis and treatment of heart and cardiovascular diseases including interventional cardiology, electrophysiology, and cardiac rehabilitation.",staffList:[{name:"Dr. Sarah Rahman",role:"Head of Department",initials:"SR",color:"#1D9E75",tag:"head"},{name:"Dr. Robert Chen",role:"Senior Cardiologist",initials:"RC",color:"#378ADD",tag:"sr"},{name:"Nurse Patricia L.",role:"Chief Nurse",initials:"PL",color:"#8B7EF8",tag:""}] },
  { id:"DEPT-002",name:"Neurology",code:"NEUR",color:"#8B7EF8",colorKey:"purple",icon:"brain",status:"Active",building:"Main",floor:"5th Floor",head:"Dr. Ayesha Patel",headInitials:"AP",headColor:"#D85A30",staff:18,doctors:5,nurses:13,beds:28,occupancy:72,appts:198,founded:"2015",phone:"+1 555 201 5200",budget:"$1.8M",desc:"Covers disorders of the nervous system including epilepsy, stroke, multiple sclerosis, movement disorders, and neurodegenerative conditions.",staffList:[{name:"Dr. Ayesha Patel",role:"Head of Department",initials:"AP",color:"#D85A30",tag:"head"},{name:"Dr. Carlos Mendez",role:"Senior Neurologist",initials:"CM",color:"#8B7EF8",tag:"sr"},{name:"Nurse Amanda K.",role:"Chief Nurse",initials:"AK",color:"#34C97A",tag:""}] },
  { id:"DEPT-003",name:"Dermatology",code:"DERM",color:"#378ADD",colorKey:"blue",icon:"skin",status:"Active",building:"East",floor:"2nd Floor",head:"Dr. Michael Kim",headInitials:"MK",headColor:"#378ADD",staff:14,doctors:4,nurses:10,beds:12,occupancy:58,appts:244,founded:"2016",phone:"+1 555 301 4200",budget:"$1.1M",desc:"Diagnoses and treats conditions of the skin, hair, and nails.",staffList:[{name:"Dr. Michael Kim",role:"Head of Department",initials:"MK",color:"#378ADD",tag:"head"},{name:"Dr. Priya Sharma",role:"Consultant",initials:"PS",color:"#EF9F27",tag:"sr"},{name:"Nurse Sofia B.",role:"Senior Nurse",initials:"SB",color:"#E0608A",tag:""}] },
  { id:"DEPT-004",name:"General Practice",code:"GENPX",color:"#EF9F27",colorKey:"amber",icon:"stethoscope",status:"Active",building:"Main",floor:"1st Floor",head:"Dr. Thomas Nguyen",headInitials:"TN",headColor:"#EF9F27",staff:42,doctors:12,nurses:30,beds:60,occupancy:91,appts:487,founded:"2012",phone:"+1 555 201 1000",budget:"$3.2M",desc:"Primary care for patients of all ages. Focuses on preventive medicine and chronic disease management.",staffList:[{name:"Dr. Thomas Nguyen",role:"Head of Department",initials:"TN",color:"#EF9F27",tag:"head"},{name:"Dr. Fatima Al-Amin",role:"Senior GP",initials:"FA",color:"#34C97A",tag:"sr"},{name:"Nurse James O.",role:"Chief Nurse",initials:"JO",color:"#378ADD",tag:""}] },
  { id:"DEPT-005",name:"Orthopedics",code:"ORTH",color:"#34C97A",colorKey:"green",icon:"bone",status:"Expanding",building:"North",floor:"3rd Floor",head:"Dr. James Okafor",headInitials:"JO",headColor:"#34C97A",staff:22,doctors:6,nurses:16,beds:36,occupancy:80,appts:176,founded:"2017",phone:"+1 555 401 3300",budget:"$2.0M",desc:"Specialises in musculoskeletal conditions, joint replacement surgery, and sports injuries.",staffList:[{name:"Dr. James Okafor",role:"Head of Department",initials:"JO",color:"#34C97A",tag:"head"},{name:"Dr. Sean Murphy",role:"Consultant Surgeon",initials:"SM",color:"#8B7EF8",tag:"sr"},{name:"Nurse Rachel T.",role:"Senior Nurse",initials:"RT",color:"#D85A30",tag:""}] },
  { id:"DEPT-006",name:"Pediatrics",code:"PEDS",color:"#22C5D9",colorKey:"cyan",icon:"child",status:"Active",building:"East",floor:"1st Floor",head:"Dr. Linda Park",headInitials:"LP",headColor:"#22C5D9",staff:32,doctors:9,nurses:23,beds:44,occupancy:65,appts:289,founded:"2013",phone:"+1 555 301 2100",budget:"$2.6M",desc:"Dedicated to the medical care of infants, children, and adolescents.",staffList:[{name:"Dr. Linda Park",role:"Head of Department",initials:"LP",color:"#22C5D9",tag:"head"},{name:"Dr. Maria Santos",role:"Senior Pediatrician",initials:"MS",color:"#E0608A",tag:"sr"},{name:"Nurse Tom W.",role:"Chief Nurse",initials:"TW",color:"#EF9F27",tag:""}] },
  { id:"DEPT-007",name:"Oncology",code:"ONCO",color:"#E0608A",colorKey:"pink",icon:"cell",status:"Active",building:"North",floor:"4th Floor",head:"Dr. Elena Vasquez",headInitials:"EV",headColor:"#E0608A",staff:24,doctors:7,nurses:17,beds:38,occupancy:76,appts:142,founded:"2015",phone:"+1 555 401 4400",budget:"$3.8M",desc:"Provides comprehensive cancer care including medical, surgical, and radiation oncology.",staffList:[{name:"Dr. Elena Vasquez",role:"Head of Department",initials:"EV",color:"#E0608A",tag:"head"},{name:"Dr. Chris A.",role:"Medical Oncologist",initials:"CA",color:"#8B7EF8",tag:"sr"},{name:"Nurse Nina P.",role:"Chief Oncology Nurse",initials:"NP",color:"#1D9E75",tag:""}] },
  { id:"DEPT-008",name:"Emergency Medicine",code:"EMRG",color:"#F07B3F",colorKey:"orange",icon:"emergency",status:"Active",building:"Main",floor:"Ground Floor",head:"Dr. Kevin Walsh",headInitials:"KW",headColor:"#F07B3F",staff:56,doctors:14,nurses:42,beds:30,occupancy:95,appts:521,founded:"2011",phone:"+1 555 201 9111",budget:"$5.1M",desc:"24/7 acute emergency care for life-threatening conditions.",staffList:[{name:"Dr. Kevin Walsh",role:"Head of Department",initials:"KW",color:"#F07B3F",tag:"head"},{name:"Dr. Tanya R.",role:"Senior EM Physician",initials:"TR",color:"#22C5D9",tag:"sr"},{name:"Nurse Samuel F.",role:"Charge Nurse",initials:"SF",color:"#34C97A",tag:""}] },
  { id:"DEPT-009",name:"Radiology",code:"RADI",color:"#9A9890",colorKey:"gray",icon:"scan",status:"Inactive",building:"East",floor:"Basement",head:"Dr. Maria Santos",headInitials:"MS",headColor:"#9A9890",staff:16,doctors:4,nurses:12,beds:0,occupancy:0,appts:88,founded:"2018",phone:"+1 555 301 6600",budget:"$1.4M",desc:"Diagnostic and interventional radiology services.",staffList:[{name:"Dr. Maria Santos",role:"Head of Department",initials:"MS",color:"#9A9890",tag:"head"},{name:"Dr. Paul K.",role:"Senior Radiologist",initials:"PK",color:"#8B7EF8",tag:"sr"},{name:"Nurse Lisa N.",role:"Chief Nurse",initials:"LN",color:"#EF9F27",tag:""}] },
];

function getOccColor(pct: number) {
  if (pct===0) return "#5C5B56";
  if (pct>=90) return "#D85A30";
  if (pct>=80) return "#EF9F27";
  return "#34C97A";
}

type ViewMode = "grid"|"list";
type DrawerMode = "view"|"edit"|"add"|null;

export default function DepartmentManagementPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  // Note: there is no departments module on the backend (no API for
  // this data), so DEPTS is a fixed demo dataset. It's now kept in
  // React state so Add/Edit/Delete in this page actually mutate the
  // in-memory list instead of only popping a "success" toast while
  // leaving the underlying data untouched.
  const [depts, setDepts] = useState(DEPTS);
  const [filtered, setFiltered] = useState(DEPTS);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [buildingF, setBuildingF] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerDept, setDrawerDept] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const buildingRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const bedsRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

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
    getUserData().then(setUserData);
  },[router]);

  useEffect(()=>{
    let list = [...depts];
    if (search) { const q=search.toLowerCase(); list=list.filter(d=>d.name.toLowerCase().includes(q)||d.code.toLowerCase().includes(q)||d.head.toLowerCase().includes(q)); }
    if (statusF) list = list.filter(d=>d.status===statusF);
    if (buildingF) list = list.filter(d=>d.building.includes(buildingF));
    setFiltered(list);
  },[search,statusF,buildingF,depts]);

  const handleSaveDept = () => {
    const name = nameRef.current?.value.trim() || "";
    const code = codeRef.current?.value.trim() || "";
    if (!name || !code) { showToast("Name and code are required.", "error"); return; }
    const buildingLabel = buildingRef.current?.value || "Main Building";
    const building = buildingLabel.split(" ")[0];
    const status = statusRef.current?.value || "Active";
    const beds = Number(bedsRef.current?.value || 0);
    const budget = budgetRef.current?.value || "";
    const desc = descRef.current?.value || "";

    if (drawerMode === "add") {
      const newDept = {
        id: `DEPT-${String(depts.length + 1).padStart(3, "0")}`,
        name, code, color: COLORS[depts.length % COLORS.length], colorKey: "", icon: "circle",
        status, building, floor: "—", head: "Unassigned", headInitials: "—", headColor: "#9A9890",
        staff: 0, doctors: 0, nurses: 0, beds, occupancy: 0, appts: 0, founded: String(new Date().getFullYear()),
        phone: "—", email: "—", budget, desc, staffList: [] as any[],
      };
      setDepts(prev => [...prev, newDept]);
      showToast("Department created.", "success");
    } else if (drawerMode === "edit" && drawerDept) {
      setDepts(prev => prev.map(d => d.id === drawerDept.id ? { ...d, name, code, status, building, beds, budget, desc } : d));
      showToast("Department updated.", "success");
    }
    setDrawerMode(null);
  };

  const adminName = userData?.users?.[0]?.full_name ?? "";
  const fullDate = new Date().toDateString();
  const totalStaff = depts.reduce((s, d) => s + d.staff, 0);
  const totalDoctors = depts.reduce((s, d) => s + d.doctors, 0);
  const totalNurses = depts.reduce((s, d) => s + d.nurses, 0);
  const totalBeds = depts.reduce((s, d) => s + d.beds, 0);
  const totalAppts = depts.reduce((s, d) => s + d.appts, 0);
  const buildingCount = new Set(depts.map(d => d.building)).size;
  const avgOccupancy = totalBeds > 0 ? Math.round(depts.reduce((s, d) => s + d.occupancy * d.beds, 0) / totalBeds) : 0;

  return (
    <div className="page-department-management">
    <div className="app">
      {/* SIDEBAR */}
      <Sidebar badge={<span className="admin-chip">Admin</span>}>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/admin-dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span className="lbl">Dashboard</span></Link>
          <Link prefetch={false} className="nav-item" href="/all-users"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg><span className="lbl">All Users</span></Link>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Management</p>
          <Link prefetch={false} className="nav-item" href="/doctor-management"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="lbl">Doctors</span></Link>
          <a className="nav-item active" href="#"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span className="lbl">Departments</span></a>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span className="lbl">Appointments</span><span className="bdg r">Soon</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">System</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 104.93 19.07M19.07 4.93l-7.07 7.07"/></svg><span className="lbl">Settings</span><span className="bdg r">Soon</span></a>
          {/* Previously missing on this page — every other admin/doctor
              page has a sign-out link, but this one had no way to log
              out without navigating elsewhere first. */}
          <a className="nav-item" onClick={signOut} style={{cursor:"pointer"}}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span className="lbl">Sign out</span></a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-av">{adminName?.[0]?.toUpperCase()}</div>
          <div className="admin-meta"><p className="nm">{adminName}</p><p className="rl">Super Administrator</p></div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </Sidebar>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <HamburgerToggle />
            <div className="topbar-title">Department <span>Management</span></div>
            <div className="topbar-sub">MediBook Admin Panel · {fullDate}</div>
          </div>
          <div className="topbar-right">
            <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className="notif-dot"></span></button>
            <div className="admin-av" style={{width:"36px",height:"36px",fontSize:"12px",cursor:"pointer"}}>{adminName?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left"><h1>Manage <em>Departments</em></h1><p>Organise clinical units, assign heads, monitor capacity and staff allocation.</p></div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={()=>showToast("Report exported.","success")}><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export</button>
              <button className="btn-primary" onClick={()=>setDrawerMode("add")}><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Department</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-strip">
            {/* These were hardcoded (9 / 284 / 312 / 1,847) regardless of
                the actual department list, so they went stale the moment
                a department was added, edited, or removed. Now derived
                from live state. */}
            <div className="stat-card"><div className="stat-icon si-teal"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div className="stat-text"><div className="val">{depts.length}</div><div className="lbl">Total Departments</div><div className="sub">Across {buildingCount} buildings</div></div></div>
            <div className="stat-card"><div className="stat-icon si-blue"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div className="stat-text"><div className="val">{totalStaff}</div><div className="lbl">Total Medical Staff</div><div className="sub">{totalDoctors} doctors · {totalNurses} nurses</div></div></div>
            <div className="stat-card"><div className="stat-icon si-amber"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div><div className="stat-text"><div className="val">{totalBeds}</div><div className="lbl">Total Beds</div><div className="sub">{avgOccupancy}% currently occupied</div></div></div>
            <div className="stat-card"><div className="stat-icon si-coral"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div className="stat-text"><div className="val">{totalAppts.toLocaleString()}</div><div className="lbl">Appointments This Month</div></div></div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search departments…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="filter-select" value={statusF} onChange={e=>setStatusF(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expanding">Expanding</option>
            </select>
            <select className="filter-select" value={buildingF} onChange={e=>setBuildingF(e.target.value)}>
              <option value="">All Buildings</option>
              <option value="Main">Main Building</option>
              <option value="East">East Wing</option>
              <option value="North">North Block</option>
            </select>
            <div className="view-toggle">
              <button className={`view-btn${viewMode==="grid"?" active":""}`} onClick={()=>setViewMode("grid")} title="Grid view"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
              <button className={`view-btn${viewMode==="list"?" active":""}`} onClick={()=>setViewMode("list")} title="List view"><svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            </div>
          </div>

          {/* Grid view */}
          {viewMode === "grid" && (
            <div className="dept-grid">
              {filtered.map((d,i)=>{
                const occColor = getOccColor(d.occupancy);
                const statusClass = d.status.toLowerCase();
                return (
                  <div key={d.id} className="dept-card" style={{animationDelay:`${i*0.05}s`}} onClick={()=>{setDrawerDept(d);setDrawerMode("view");}}>
                    <div className="card-top-band" style={{background:d.color}}></div>
                    <div className="card-header">
                      <div style={{display:"flex",alignItems:"flex-start",gap:"12px",flex:1,minWidth:0}}>
                        <div className="dept-icon-wrap" style={{background:`${d.color}22`}}>
                          <svg viewBox="0 0 24 24" style={{stroke:d.color}}><circle cx="12" cy="12" r="4"/></svg>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="dept-name">{d.name}</div>
                          <div className="dept-code">{d.code} · {d.building}</div>
                        </div>
                      </div>
                      <span className={`dept-status-pill ${statusClass}`}>{d.status}</span>
                    </div>
                    <div className="card-stats">
                      <div className="card-stat"><div className="cs-val">{d.doctors}</div><div className="cs-lbl">Doctors</div></div>
                      <div className="card-stat"><div className="cs-val">{d.staff}</div><div className="cs-lbl">Staff</div></div>
                      <div className="card-stat"><div className="cs-val">{d.beds>0?d.beds:"—"}</div><div className="cs-lbl">Beds</div></div>
                    </div>
                    <div className="card-occupancy" style={{paddingTop:"0.75rem"}}>
                      <div className="occ-row"><span className="occ-label">Bed Occupancy</span><span className="occ-pct" style={{color:occColor}}>{d.occupancy}%</span></div>
                      <div className="occ-bar"><div className="occ-fill" style={{width:`${d.occupancy}%`,background:occColor}}></div></div>
                    </div>
                    <div className="card-divider" style={{marginTop:"0.85rem"}}></div>
                    <div className="card-footer">
                      <div className="card-head-doc">
                        <div className="head-av" style={{background:d.headColor}}>{d.headInitials}</div>
                        <div className="head-info"><div className="head-name">{d.head}</div><div className="head-role">Department Head</div></div>
                      </div>
                      <div className="card-actions">
                        <button className="ca-btn edit" title="Edit" onClick={e=>{e.stopPropagation();setDrawerDept(d);setDrawerMode("edit");}}>
                          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ca-btn del" title="Delete" onClick={e=>{e.stopPropagation();setDelTarget(d.id);}}>
                          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && (
            <div className="dept-list-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Head of Dept</th>
                    <th>Staff</th>
                    <th>Beds</th>
                    <th>Occupancy</th>
                    <th>Status</th>
                    <th>Building</th>
                    <th style={{textAlign:"right"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d=>{
                    const occColor = getOccColor(d.occupancy);
                    return (
                      <tr key={d.id} onClick={()=>{setDrawerDept(d);setDrawerMode("view");}}>
                        <td><div className="dept-cell"><div className="tbl-dept-icon" style={{background:`${d.color}22`}}><svg viewBox="0 0 24 24" style={{stroke:d.color,width:"16px",height:"16px"}}><circle cx="12" cy="12" r="4"/></svg></div><div><div className="tbl-dept-name">{d.name}</div><div className="tbl-dept-code">{d.code} · {d.floor}</div></div></div></td>
                        <td><div className="head-cell"><div className="sm-av" style={{background:d.headColor}}>{d.headInitials}</div><span style={{fontSize:"13px",color:"var(--gray-600)"}}>{d.head}</span></div></td>
                        <td style={{fontSize:"13px",color:"var(--gray-600)"}}>{d.staff} <span style={{color:"var(--gray-400)",fontSize:"11px"}}>({d.doctors} Dr)</span></td>
                        <td style={{fontSize:"13.5px"}}>{d.beds>0?d.beds:"—"}</td>
                        <td><div className="mini-bar"><div className="mb-track"><div className="mb-fill" style={{width:`${d.occupancy}%`,background:occColor}}></div></div><span style={{fontSize:"12.5px",color:occColor,fontWeight:500}}>{d.occupancy}%</span></div></td>
                        <td><span className={`s-pill ${d.status.toLowerCase()}`}>{d.status}</span></td>
                        <td style={{fontSize:"13px",color:"var(--gray-600)"}}>{d.building}</td>
                        <td>
                          <div className="tbl-actions" style={{justifyContent:"flex-end"}}>
                            <button className="tbl-btn edit" title="Edit" onClick={e=>{e.stopPropagation();setDrawerDept(d);setDrawerMode("edit");}}><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button className="tbl-btn del" title="Delete" onClick={e=>{e.stopPropagation();setDelTarget(d.id);}}><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="empty-state" style={{display:"block"}}>
              <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div>
              <h3>No departments found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* DRAWER */}
      <div className={`drawer-overlay${drawerMode?" open":""}`} onClick={e=>{if((e.target as HTMLElement).classList.contains("drawer-overlay"))setDrawerMode(null);}}>
        <div className="drawer">
          <div className="drawer-header">
            <div>
              <h2>{drawerMode==="add"?"Add Department":drawerMode==="edit"?`Edit ${drawerDept?.name}`:(drawerDept?.name??"Department Detail")}</h2>
              <p>{drawerMode==="add"?"Create a new clinical department":drawerDept?`${drawerDept.code} · ${drawerDept.building} · ${drawerDept.floor}`:""}</p>
            </div>
            <button className="drawer-close" onClick={()=>setDrawerMode(null)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div className="drawer-body">
            {drawerMode === "view" && drawerDept && (
              <div>
                <div className="kpi-row">
                  <div className="kpi-box"><div className="kv">{drawerDept.doctors}</div><div className="kl">Doctors</div></div>
                  <div className="kpi-box"><div className="kv">{drawerDept.nurses}</div><div className="kl">Nurses</div></div>
                  <div className="kpi-box"><div className="kv" style={{color:getOccColor(drawerDept.occupancy)}}>{drawerDept.occupancy}%</div><div className="kl">Occupancy</div></div>
                </div>
                <div className="info-section">
                  <h4>Department Info</h4>
                  <div className="info-grid">
                    <div className="info-box"><div className="ib-label">Dept ID</div><div className="ib-val">{drawerDept.id}</div></div>
                    <div className="info-box"><div className="ib-label">Founded</div><div className="ib-val">{drawerDept.founded}</div></div>
                    <div className="info-box"><div className="ib-label">Total Beds</div><div className="ib-val">{drawerDept.beds>0?`${drawerDept.beds} beds`:"N/A"}</div></div>
                    <div className="info-box"><div className="ib-label">Appts This Month</div><div className="ib-val">{drawerDept.appts}</div></div>
                    <div className="info-box"><div className="ib-label">Budget</div><div className="ib-val">{drawerDept.budget}</div></div>
                    <div className="info-box"><div className="ib-label">Phone</div><div className="ib-val">{drawerDept.phone}</div></div>
                    <div className="info-box full"><div className="ib-label">Description</div><div className="ib-val" style={{fontWeight:400,fontSize:"13px",color:"var(--gray-600)",lineHeight:1.6}}>{drawerDept.desc}</div></div>
                  </div>
                </div>
                <div className="info-section">
                  <h4>Key Staff</h4>
                  <div className="staff-list">
                    {drawerDept.staffList.map((s: any) => (
                      <div key={s.name} className="staff-item">
                        <div className="staff-av" style={{background:s.color}}>{s.initials}</div>
                        <div><div className="staff-name">{s.name}</div><div className="staff-role">{s.role}</div></div>
                        {s.tag && <span className={`staff-tag ${s.tag}`}>{s.tag==="head"?"Head":"Senior"}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {(drawerMode==="edit"||drawerMode==="add") && (
              <div>
                <div className="form-row">
                  <div className="form-field"><label>Department Name</label><input ref={nameRef} className="form-input" defaultValue={drawerDept?.name??""} placeholder="e.g. Cardiology"/></div>
                  <div className="form-field"><label>Code</label><input ref={codeRef} className="form-input" defaultValue={drawerDept?.code??""} placeholder="e.g. CARD"/></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Building</label>
                    <select ref={buildingRef} className="form-input" defaultValue={drawerDept?.building==="East"?"East Wing":drawerDept?.building==="North"?"North Block":"Main Building"}>
                      <option>Main Building</option><option>East Wing</option><option>North Block</option>
                    </select>
                  </div>
                  <div className="form-field"><label>Status</label>
                    <select ref={statusRef} className="form-input" defaultValue={drawerDept?.status??"Active"}>
                      <option>Active</option><option>Inactive</option><option>Expanding</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Total Beds</label><input ref={bedsRef} className="form-input" type="number" defaultValue={drawerDept?.beds??0}/></div>
                  <div className="form-field"><label>Annual Budget</label><input ref={budgetRef} className="form-input" defaultValue={drawerDept?.budget??""} placeholder="e.g. $1.5M"/></div>
                </div>
                <div className="form-field"><label>Description</label><textarea ref={descRef} className="form-textarea" defaultValue={drawerDept?.desc??""} placeholder="Brief description…"/></div>
              </div>
            )}
          </div>
          <div className="drawer-footer">
            <button className="btn-ghost" onClick={()=>setDrawerMode(null)}>Cancel</button>
            <button className="btn-save" onClick={()=>{if(drawerMode==="view"){setDrawerMode("edit");}else{handleSaveDept();}}}>
              {drawerMode==="add"?"Create Department":drawerMode==="edit"?"Save Changes":"Edit Department"}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {delTarget && (
        <div className="modal-overlay open" onClick={e=>{if((e.target as HTMLElement).classList.contains("modal-overlay"))setDelTarget(null);}}>
          <div className="modal">
            <div className="modal-inner">
              <div className="modal-icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>
              <h3>Delete Department</h3>
              <p>This will permanently remove <strong>{depts.find(d=>d.id===delTarget)?.name??"this department"}</strong>.</p>
            </div>
            <div className="modal-footer-btns">
              <button className="btn-mcancel" onClick={()=>setDelTarget(null)}>Keep It</button>
              <button className="btn-mdelete" onClick={()=>{const d=depts.find(x=>x.id===delTarget);setDepts(prev=>prev.filter(x=>x.id!==delTarget));showToast(`${d?.name??"Department"} has been removed.`,"error");setDelTarget(null);}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
    </div>
  );
}

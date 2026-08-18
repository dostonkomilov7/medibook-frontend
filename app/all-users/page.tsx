"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, notFound } from "next/navigation";
import "./all-users.style.css";
import { getCookie, deleteCookie, getUserData, apiUrl } from "../../lib/utils";
import Sidebar from "../../components/sidebar/Sidebar";
import HamburgerToggle from "../../components/sidebar/HamburgerToggle";

const COLORS = ["#1D9E75","#378ADD","#D85A30","#EF9F27","#8B7EF8"];
const PER_PAGE = 15;

type UserRole = "patient"|"doctor"|"admin";
type UserStatus = "active"|"pending"|"inactive";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function rolePill(role: string) {
  const r = role === "User" ? "patient" : role.toLowerCase();
  return <span className={`role-pill ${r}`}>{r.charAt(0).toUpperCase()+r.slice(1)}</span>;
}
function statusPill(status: string) {
  const s = status.toLowerCase() as UserStatus;
  const labels: Record<UserStatus,string> = {active:"Active",pending:"Pending",inactive:"Inactive"};
  return <span className={`s-pill ${s}`}>{labels[s]??s}</span>;
}

export default function AllUsersPage() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({total:0,patients:0,doctors:0,inactive:0,active:0});
  const [view, setView] = useState<"table"|"card">("table");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<string|null>(null);
  const [statusTarget, setStatusTarget] = useState<string|null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string, type = "info") => {
    setToast({msg,type});
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(null), 3000);
  };

  const signOut = () => {
    deleteCookie("accessToken"); deleteCookie("refreshToken");
    deleteCookie("userId"); deleteCookie("role");
    localStorage.clear(); router.push("/");
  };

  useEffect(() => {
    if (!getCookie("userId")) { router.push("/login"); return; }
    if (getCookie("role") !== "Admin") {
      notFound();
    }
    init();
  }, [router]);

  const init = async () => {
    try {
      const ud = await getUserData();
      setUserData(ud);
      const res = await fetch(`${apiUrl}/users`, { credentials: "include" });
      if (!res.ok) { showToast("Failed to load users.", "error"); return; }
      const data = await res.json();
      const rows = (data.users?.rows ?? []).map((u: any) => ({...u, id: String(u.id)}));
      setAllUsers(rows);
      setStats({
        total: data.users?.count ?? rows.length,
        patients: data.countPatients ?? 0,
        doctors: data.countDoctors ?? 0,
        inactive: data.countInactive ?? 0,
        active: data.countActive ?? 0,
      });
    } catch (e) {
      console.error("Failed to load users:", e);
      showToast("Failed to load users.", "error");
    }
  };

  // filtered list
  const filtered = (() => {
    let list = [...allUsers];
    if (search) { const q=search.toLowerCase(); list=list.filter(u=>u.full_name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)||String(u.id).includes(q)); }
    if (roleFilter !== "all") list = list.filter(u=>(u.role??"").toLowerCase()===(roleFilter==="patient"?"user":roleFilter));
    if (statusFilter) list = list.filter(u=>(u.status??"").toLowerCase()===statusFilter);
    const getDate = (u: any) => new Date(u.created_at??u.createdAt??0).getTime();
    list.sort((a,b)=>{
      if (sort==="newest") return getDate(b)-getDate(a);
      if (sort==="oldest") return getDate(a)-getDate(b);
      if (sort==="name-az") return a.full_name.localeCompare(b.full_name);
      if (sort==="name-za") return b.full_name.localeCompare(a.full_name);
      return 0;
    });
    return list;
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length/PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageList = filtered.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE);
  const start = (safePage-1)*PER_PAGE+1;
  const end = Math.min(safePage*PER_PAGE, filtered.length);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected(prev => { const n=new Set(prev); checked?n.add(id):n.delete(id); return n; });
  };

  const deleteSingle = async (id: string) => {
    const u = allUsers.find(x=>x.id===id);
    const res = await fetch(`${apiUrl}/users/${id}`,{method:"DELETE",credentials:"include"});
    const r = await res.json();
    if (!r.success) { showToast(`Could not remove user.`,"error"); return; }
    setAllUsers(prev=>prev.filter(x=>x.id!==id));
    setSelected(prev=>{const n=new Set(prev);n.delete(id);return n;});
    setDelTarget(null);
    showToast(`${u?.full_name??"User"} deleted.`,"error");
  };

  // Previously this only removed selected users from local React state —
  // no request ever reached the server, so a page refresh brought every
  // "deleted" user right back. Call the real DELETE endpoint per user,
  // same as deleteSingle does for a single row.
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`${apiUrl}/users/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json().then((body) => ({ id, ok: r.ok && body.success }))))
    );
    const succeededIds = new Set(
      results.filter((r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> => r.status === "fulfilled" && r.value.ok).map((r) => r.value.id)
    );
    setAllUsers(prev => prev.filter(u => !succeededIds.has(u.id)));
    setSelected(new Set());
    setBulkDeleteConfirm(false);
    if (succeededIds.size === ids.length) {
      showToast(`${succeededIds.size} users deleted.`, "error");
    } else {
      showToast(`${succeededIds.size} of ${ids.length} users deleted; some failed.`, "warning");
    }
  };

  const toggleStatus = async () => {
    if (!statusTarget) return;
    const u = allUsers.find(x=>x.id===statusTarget);
    if (!u) { setStatusTarget(null); return; }
    const newStatus = u.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`${apiUrl}/users/${statusTarget}`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        credentials:"include",
        body: JSON.stringify({status:newStatus}),
      });
      const r = await res.json();
      if (!res.ok || !r.success) { showToast("Could not update status.","error"); return; }
      setAllUsers(prev=>prev.map(x=>x.id===statusTarget?{...x,status:newStatus}:x));
      showToast(`${u.full_name} is now ${newStatus}.`,"success");
    } catch (e) {
      console.error("Failed to update status:", e);
      showToast("Something went wrong.","error");
    } finally {
      setStatusTarget(null);
    }
  };

  const adminName = userData?.users?.[0]?.full_name ?? "";
  const fullDate = new Date().toDateString();

  return (
    <div className="page-all-users">
    <div className="app">
      {/* SIDEBAR */}
      <Sidebar badge={<span className="admin-chip">Admin</span>}>
        <nav className="nav-section">
          <p className="nav-label">Overview</p>
          <Link prefetch={false} className="nav-item" href="/admin-dashboard">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span className="lbl">Dashboard</span>
          </Link>
          <a className="nav-item active" href="#">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span className="lbl">All Users</span>
          </a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">Management</p>
          <Link prefetch={false} className="nav-item" href="/doctor-management"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="lbl">Doctors</span></Link>
          <Link prefetch={false} className="nav-item" href="/department-management"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span className="lbl">Departments</span></Link>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span className="lbl">Appointments</span><span className="bdg r">Soon</span></a>
        </nav>
        <nav className="nav-section">
          <p className="nav-label">System</p>
          <a className="nav-item" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 104.93 19.07M19.07 4.93l-7.07 7.07"/></svg><span className="lbl">Settings</span><span className="bdg r">Soon</span></a>
          <a className="nav-item" onClick={signOut} style={{cursor:"pointer"}}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span className="lbl">Sign out</span></a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-av">{adminName?.[0]?.toUpperCase()}</div>
          <div className="admin-meta"><p className="name">{adminName}</p><p className="role">Super Administrator</p></div>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </Sidebar>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <HamburgerToggle />
            <div className="topbar-title">All <span>Users</span></div>
            <div className="topbar-sub">MediBook Admin Panel · {fullDate}</div>
          </div>
          <div className="topbar-right">
            {/* <button className="icon-btn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className="notif-dot"></span></button> */}
            <div className="admin-av topbar-av">{adminName?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <div className="page-header-left">
              <h1>Manage <em>Users</em></h1>
              <p>View, filter, and manage all patient and doctor accounts across MediBook.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-strip">
            <div className="stat-card"><div className="stat-icon si-teal"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div className="stat-text"><div className="val">{stats.total}</div><div className="lbl">Total Users</div></div></div>
            <div className="stat-card"><div className="stat-icon si-blue"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div className="stat-text"><div className="val">{stats.patients}</div><div className="lbl">Patients</div></div></div>
            <div className="stat-card"><div className="stat-icon si-purple"><svg viewBox="0 0 24 24"><path d="M12 14v7M9 21h6M12 3C9.79 3 8 4.79 8 7v1H6v5a6 6 0 0012 0V8h-2V7c0-2.21-1.79-4-4-4z"/></svg></div><div className="stat-text"><div className="val">{stats.doctors}</div><div className="lbl">Doctors</div></div></div>
            <div className="stat-card"><div className="stat-icon si-amber"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div className="stat-text"><div className="val">{stats.inactive}</div><div className="lbl">Inactive</div></div></div>
            <div className="stat-card"><div className="stat-icon si-green"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div className="stat-text"><div className="val">{stats.active}</div><div className="lbl">Active</div></div></div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by name, email, ID…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
            </div>
            <div className="role-tabs">
              {["all","patient","doctor"].map(r=>(
                <button key={r} className={`role-tab${roleFilter===r?" active":""}`} onClick={()=>{setRoleFilter(r);setPage(1);}}>
                  {r==="all"?"All":r==="patient"?"Patients":"Doctors"}
                </button>
              ))}
            </div>
            <select className="filter-select" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="filter-select" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-az">Name A–Z</option>
              <option value="name-za">Name Z–A</option>
            </select>
            <div className="toolbar-right">
              <span className="results-count">Showing {filtered.length>0?`${start}–${end}`:"0"} of {filtered.length}</span>
              <div className="view-toggle">
                <button className={`view-btn${view==="table"?" active":""}`} onClick={()=>setView("table")} title="Table view"><svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
                <button className={`view-btn${view==="card"?" active":""}`} onClick={()=>setView("card")} title="Card view"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
              </div>
            </div>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="bulk-bar visible">
              <span>{selected.size} selected</span>
              <div className="bulk-actions">
                {/* Verify is disabled: the backend has no `verified` field
                    on users, so there is no real endpoint to call. It used
                    to edit only local React state, which silently reverted
                    on refresh and looked like a working feature.
                    "Suspend" was removed outright — a user's status is only
                    ever Active or Inactive on the backend, there is no
                    Suspended state to set it to. */}
                {/* <button className="bulk-btn teal" disabled title="Not supported by the backend yet" onClick={()=>showToast("Verifying users isn't supported by the server yet.","warning")}>
                  <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Verify
                </button> */}
                <button className="bulk-btn coral" onClick={()=>setBulkDeleteConfirm(true)}>
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Delete
                </button>
                <button className="bulk-btn ghost" onClick={()=>setSelected(new Set())}>Cancel</button>
              </div>
            </div>
          )}

          {/* Table view */}
          {view === "table" && filtered.length > 0 && (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="th-check">
                      <label className="cb-wrap">
                        <input type="checkbox" checked={pageList.length>0&&pageList.every(u=>selected.has(u.id))} onChange={e=>{const n=new Set(selected);pageList.forEach(u=>e.target.checked?n.add(u.id):n.delete(u.id));setSelected(n);}}/>
                        <span className="cb-custom"></span>
                      </label>
                    </th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Appointments</th>
                    <th style={{textAlign:"center"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageList.map((u: any) => (
                    <tr key={u.id} className={selected.has(u.id)?"selected":""} onClick={()=>setDrawer(u)}>
                      <td onClick={e=>e.stopPropagation()}>
                        <label className="cb-wrap"><input type="checkbox" checked={selected.has(u.id)} onChange={e=>{e.stopPropagation();toggleSelect(u.id,e.target.checked);}}/><span className="cb-custom"></span></label>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-av" style={{background:COLORS[Number(u.id)%5]}}>{u.full_name?.[0]?.toUpperCase()}</div>
                          <div><div className="user-name">{u.full_name}</div><div className="user-email">{u.email}</div><div className="user-id">{u.id}</div></div>
                        </div>
                      </td>
                      <td>{rolePill(u.role)}</td>
                      <td>{statusPill(u.status)}</td>
                      <td style={{color:"var(--gray-600)",fontSize:"12.5px"}}>{fmtDate(new Date(u.created_at??u.createdAt))}</td>
                      <td style={{fontSize:"13px"}}>0 appointments</td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div className="tbl-actions" style={{justifyContent:"center"}}>
                          <button className="tbl-btn edit" title="Edit status" onClick={()=>setStatusTarget(u.id)}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="tbl-btn del" title="Delete" onClick={()=>setDelTarget(u.id)}>
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card view */}
          {view === "card" && filtered.length > 0 && (
            <div className="users-card-grid visible">
              {pageList.map((u: any, i: number) => {
                const topColor = u.role==="Doctor"?"var(--purple-400)":u.role==="Admin"?"var(--teal-400)":"var(--blue-400)";
                return (
                  <div key={u.id} className={`user-card${selected.has(u.id)?" selected":""}`} style={{animationDelay:`${i*0.03}s`}} onClick={()=>setDrawer(u)}>
                    <div className="uc-top" style={{background:topColor}}></div>
                    <div className="uc-body">
                      <div className="uc-head">
                        <div className="uc-av" style={{background:COLORS[Number(u.id)%5]}}>{u.full_name?.[0]?.toUpperCase()}</div>
                        <div className="uc-info">
                          <div className="uc-name">{u.full_name}</div>
                          <div className="uc-email">{u.email}</div>
                          <div className="uc-meta">{rolePill(u.role)}{statusPill(u.status)}</div>
                        </div>
                        <label className="cb-wrap" onClick={e=>e.stopPropagation()} style={{marginLeft:"4px",flexShrink:0}}>
                          <input type="checkbox" checked={selected.has(u.id)} onChange={e=>toggleSelect(u.id,e.target.checked)}/>
                          <span className="cb-custom"></span>
                        </label>
                      </div>
                      <div className="uc-divider"></div>
                      <div className="uc-stats">
                        <div className="uc-stat"><div className="csv">{fmtDate(new Date(u.created_at??u.createdAt))}</div><div className="csl">Joined</div></div>
                        <div className="uc-stat"><div className="csv">{u.phone??"—"}</div><div className="csl">Phone</div></div>
                      </div>
                      <div className="uc-footer">
                        <div className="uc-actions" onClick={e=>e.stopPropagation()}>
                          <button className="tbl-btn edit" title="Edit status" onClick={()=>setStatusTarget(u.id)}><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                          <button className="tbl-btn del" onClick={()=>setDelTarget(u.id)}><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="empty-state" style={{display:"block"}}>
              <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
              <h3>No users found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="pagination" style={{display:"flex"}}>
              <button className="pg-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage<=1}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
              <div className="pg-pages">
                {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(n=>(
                  <button key={n} className={`pg-num${n===safePage?" active":""}`} onClick={()=>setPage(n)}>{n}</button>
                ))}
              </div>
              <button className="pg-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages}><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
              <span className="pg-info">Page {safePage} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* DRAWER */}
      <div className={`drawer-overlay${drawer?" open":""}`} onClick={e=>{if((e.target as HTMLElement).id==="drawerOverlay"||( e.target as HTMLElement).classList.contains("drawer-overlay"))setDrawer(null);}}>
        <div className="drawer">
          <div className="drawer-header">
            <div><h2>{drawer?.full_name??"User Details"}</h2><p>{drawer?`${drawer.role} · ${drawer.id}`:""}</p></div>
            <button className="drawer-close" onClick={()=>setDrawer(null)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          {drawer && (
            <div className="drawer-body">
              <div className="drawer-user-hero">
                <div className="drawer-user-av" style={{background:COLORS[Number(drawer.id)%5]}}>{drawer.full_name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="drawer-user-name">{drawer.full_name}</div>
                  <div className="drawer-user-email">{drawer.email}</div>
                  <div className="drawer-user-meta">{rolePill(drawer.role)}{statusPill(drawer.status)}</div>
                </div>
              </div>
              <div className="drawer-section">
                <h4>Contact Information</h4>
                <div className="info-grid">
                  <div className="info-box"><div className="ib-label">Phone</div><div className="ib-val">{drawer.phone??"—"}</div></div>
                  <div className="info-box"><div className="ib-label">Member Since</div><div className="ib-val">{fmtDate(new Date(drawer.created_at??drawer.createdAt))}</div></div>
                </div>
              </div>
              <div className="drawer-section">
                <h4>Account Details</h4>
                <div className="info-grid">
                  <div className="info-box"><div className="ib-label">User ID</div><div className="ib-val" style={{fontFamily:"monospace"}}>{drawer.id}</div></div>
                  <div className="info-box"><div className="ib-label">Status</div><div className="ib-val">{drawer.status}</div></div>
                </div>
              </div>
            </div>
          )}
          <div className="drawer-footer">
            <button className="btn-ghost" onClick={()=>setDrawer(null)}>Cancel</button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {delTarget && (
        <div className="modal-overlay open" onClick={e=>{if((e.target as HTMLElement).classList.contains("modal-overlay"))setDelTarget(null);}}>
          <div className="modal">
            <div className="modal-inner">
              <div className="modal-icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>
              <h3>Delete User</h3>
              <p>This will permanently remove <strong>{allUsers.find(u=>u.id===delTarget)?.full_name??"this user"}</strong> and all associated data.</p>
            </div>
            <div className="modal-footer-btns">
              <button className="btn-mcancel" onClick={()=>setDelTarget(null)}>Keep Account</button>
              <button className="btn-mdelete" onClick={()=>deleteSingle(delTarget)}>Delete User</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay open" onClick={e=>{if((e.target as HTMLElement).classList.contains("modal-overlay"))setBulkDeleteConfirm(false);}}>
          <div className="modal">
            <div className="modal-inner">
              <div className="modal-icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>
              <h3>Delete {selected.size} Users</h3>
              <p>This will permanently remove <strong>{selected.size} selected user{selected.size===1?"":"s"}</strong> and all associated data.</p>
            </div>
            <div className="modal-footer-btns">
              <button className="btn-mcancel" onClick={()=>setBulkDeleteConfirm(false)}>Cancel</button>
              <button className="btn-mdelete" onClick={bulkDelete}>Delete {selected.size} Users</button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {statusTarget && (() => {
        const u = allUsers.find(x=>x.id===statusTarget);
        const newStatus = u?.status === "Active" ? "Inactive" : "Active";
        return (
          <div className="modal-overlay open" onClick={e=>{if((e.target as HTMLElement).classList.contains("modal-overlay"))setStatusTarget(null);}}>
            <div className="modal">
              <div className="modal-inner">
                <div className="modal-icon status"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                <h3>Change Status</h3>
                <p>Set <strong>{u?.full_name??"this user"}</strong>&rsquo;s status to <strong>{newStatus}</strong>?</p>
              </div>
              <div className="modal-footer-btns">
                <button className="btn-mcancel" onClick={()=>setStatusTarget(null)}>Cancel</button>
                <button className="btn-mconfirm" onClick={toggleStatus}>Set to {newStatus}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
    </div>
  );
}

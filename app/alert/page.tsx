"use client";
import { useEffect, useState, useRef } from "react";

// ── Inline MediAlert for Next.js (no external script) ──
type AlertType = "error"|"success"|"warning"|"info"|"confirm";
type AlertTheme = "light"|"dark";

interface ToastOptions { type: AlertType; title: string; message?: string; duration?: number; theme?: AlertTheme; }
interface ModalOptions { type: AlertType; title: string; message: string; detail?: string; confirmText?: string; cancelText?: string; theme?: AlertTheme; onConfirm?: ()=>void; onCancel?: ()=>void; }
interface BannerItem { id: number; type: AlertType; title: string; message: string; dismissible?: boolean; }

let toastIdCounter = 0;
let bannerIdCounter = 0;

export default function AlertPage() {
  const [toasts, setToasts] = useState<Array<{id:number}&ToastOptions>>([]);
  const [modal, setModal] = useState<(ModalOptions&{open:boolean})|null>(null);
  const [banners, setBanners] = useState<BannerItem[]>([]);

  const pushToast = (opts: ToastOptions) => {
    const id = ++toastIdCounter;
    setToasts(prev=>[...prev,{id,...opts}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)), opts.duration??4000);
  };

  const showBanner = (type: AlertType, title: string, message: string, dismissible = false) => {
    const id = ++bannerIdCounter;
    setBanners(prev=>[...prev,{id,type,title,message,dismissible}]);
  };

  const dismissBanner = (id: number) => setBanners(prev=>prev.filter(b=>b.id!==id));

  const openModal = (opts: ModalOptions) => setModal({...opts,open:true});

  const ICON_MAP: Record<AlertType,string> = {
    error: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    confirm: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>`,
  };

  return (
    <div style={{fontFamily:"var(--font-body)",minHeight:"100vh",background:"var(--gray-50)",padding:"2rem"}}>
      <h1 className="demo-title">MediBook <em>Alert System</em></h1>
      <p className="demo-subtitle">Universal alert components — toasts, banners &amp; modals for every page</p>

      {/* TOASTS section */}
      <p className="demo-section-label">🔔 Toast Notifications</p>
      <div className="demo-grid">
        <button className="demo-btn error" onClick={()=>pushToast({type:"error",title:"Access Denied",message:"You do not have permission to view this page.",duration:4000})}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Error Toast
        </button>
        <button className="demo-btn success" onClick={()=>pushToast({type:"success",title:"Appointment Confirmed",message:"Your booking with Dr. Rahman is set for May 23.",duration:4000})}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Success Toast
        </button>
        <button className="demo-btn warning" onClick={()=>pushToast({type:"warning",title:"Session Expiring",message:"Your session will expire in 5 minutes.",duration:5000})}>
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Warning Toast
        </button>
        <button className="demo-btn info" onClick={()=>pushToast({type:"info",title:"New Message",message:"Dr. Kim sent you a follow-up message.",duration:4000})}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Info Toast
        </button>
        <button className="demo-btn" style={{borderColor:"var(--gray-200)"}} onClick={()=>pushToast({type:"error",title:"Access Denied",message:"You do not have permission.",duration:4000,theme:"dark"})}>
          <svg viewBox="0 0 24 24" style={{stroke:"var(--gray-400)"}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Error (Dark)
        </button>
        <button className="demo-btn" style={{borderColor:"var(--gray-200)"}} onClick={()=>pushToast({type:"success",title:"Doctor Added",message:"Dr. Nguyen has been successfully registered.",theme:"dark"})}>
          <svg viewBox="0 0 24 24" style={{stroke:"var(--gray-400)"}}><polyline points="20 6 9 17 4 12"/></svg>Success (Dark)
        </button>
      </div>

      {/* BANNERS section */}
      <p className="demo-section-label">📋 Inline Alert Banners</p>
      <div className="demo-grid">
        <button className="demo-btn error" onClick={()=>showBanner("error","Access Denied","You do not have permission to perform this action.")}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Error Banner
        </button>
        <button className="demo-btn success" onClick={()=>showBanner("success","Changes Saved","Your profile has been updated successfully.")}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Success Banner
        </button>
        <button className="demo-btn warning" onClick={()=>showBanner("warning","Incomplete Profile","Please complete your medical history before booking.",true)}>
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>Warning Banner
        </button>
        <button className="demo-btn info" onClick={()=>showBanner("info","Scheduled Maintenance","The system will be down on June 5 from 2–4 AM.",true)}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>Info Banner
        </button>
      </div>

      {/* Live banner area */}
      <div className="demo-alerts-area">
        {banners.map(b=>(
          <div key={b.id} className={`alert-banner ${b.type}`}>
            <div className="banner-icon" dangerouslySetInnerHTML={{__html:ICON_MAP[b.type]}}/>
            <div className="banner-content"><strong>{b.title}</strong><span>{b.message}</span></div>
            {b.dismissible && <button className="banner-close" onClick={()=>dismissBanner(b.id)}>×</button>}
          </div>
        ))}
      </div>

      {/* MODALS section */}
      <p className="demo-section-label">🪟 Confirm Modals</p>
      <div className="demo-grid">
        <button className="demo-btn error" onClick={()=>openModal({type:"error",title:"Access Denied",message:"You do not have permission to access this page.",detail:"Error code: 403 — Forbidden",confirmText:"Go Back",cancelText:"Contact Support",onConfirm:()=>pushToast({type:"info",title:"Navigating back…"})})}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Access Denied
        </button>
        <button className="demo-btn error" onClick={()=>openModal({type:"error",title:"Delete Doctor",message:"Are you sure you want to permanently remove Dr. Sarah Rahman?",detail:"This action cannot be undone.",confirmText:"Yes, Delete",cancelText:"Keep Doctor",onConfirm:()=>pushToast({type:"success",title:"Doctor removed."})})}>
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Delete Confirm
        </button>
        <button className="demo-btn success" onClick={()=>openModal({type:"success",title:"Appointment Booked!",message:"Your appointment with Dr. Sarah Rahman has been confirmed for May 23 at 10:30 AM.",detail:"You will receive a confirmation email shortly.",confirmText:"View Appointment",cancelText:"Close",onConfirm:()=>pushToast({type:"info",title:"Redirecting…"})})}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Booking Success
        </button>
        <button className="demo-btn warning" onClick={()=>openModal({type:"warning",title:"Unsaved Changes",message:"You have unsaved changes on this form.",detail:"Tip: Use Save Draft to keep your progress.",confirmText:"Leave Anyway",cancelText:"Stay & Save",onConfirm:()=>pushToast({type:"warning",title:"Changes discarded."})})}>
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>Unsaved Changes
        </button>
        <button className="demo-btn info" onClick={()=>openModal({type:"info",title:"Session Expired",message:"Your session has expired due to inactivity. Please sign in again.",confirmText:"Sign In",cancelText:"Cancel",onConfirm:()=>pushToast({type:"info",title:"Redirecting to login…"})})}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>Session Expired
        </button>
        <button className="demo-btn confirm" onClick={()=>openModal({type:"confirm",title:"Cancel Appointment",message:"Are you sure you want to cancel your appointment with Dr. Patel?",detail:"Free cancellation is available up to 24 hours before.",confirmText:"Yes, Cancel It",cancelText:"Keep Appointment",onConfirm:()=>pushToast({type:"warning",title:"Appointment cancelled."})})}>
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>Cancel Appointment
        </button>
        <button className="demo-btn" style={{borderColor:"var(--gray-200)"}} onClick={()=>openModal({type:"error",title:"Access Denied",message:"Super Administrator role required.",detail:"Error code: 403 — Forbidden",confirmText:"Go Back",cancelText:"Request Access",theme:"dark",onConfirm:()=>pushToast({type:"info",title:"Navigating back…"})})}>
          <svg viewBox="0 0 24 24" style={{stroke:"var(--gray-400)"}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Error (Dark)
        </button>
        <button className="demo-btn" style={{borderColor:"var(--gray-200)"}} onClick={()=>openModal({type:"warning",title:"Suspend Doctor",message:"Suspending Dr. Carlos Mendez will block all upcoming appointments.",detail:"Patients will be notified automatically.",confirmText:"Suspend Account",cancelText:"Cancel",theme:"dark",onConfirm:()=>pushToast({type:"error",title:"Account suspended.",theme:"dark"})})}>
          <svg viewBox="0 0 24 24" style={{stroke:"var(--gray-400)"}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>Warning (Dark)
        </button>
      </div>

      {/* MODAL OVERLAY */}
      {modal?.open && (
        <div className={`ma-modal-overlay open${modal.theme==="dark"?" dark":""}`} onClick={e=>{if((e.target as HTMLElement).classList.contains("ma-modal-overlay"))setModal(null);}}>
          <div className="ma-modal-box">
            <div className={`ma-modal-icon-area ${modal.type}`} dangerouslySetInnerHTML={{__html:ICON_MAP[modal.type]}}/>
            <div className="ma-modal-detail" style={{display:"block"}}>
              <h3>{modal.title}</h3>
              <p>{modal.message}</p>
              {modal.detail && <small>{modal.detail}</small>}
            </div>
            <div className="ma-modal-footer">
              {modal.cancelText && (
                <button className="ma-modal-btn cancel" onClick={()=>{modal.onCancel?.();setModal(null);}}>{modal.cancelText}</button>
              )}
              <button className={`ma-modal-btn confirm ${modal.type}`} onClick={()=>{modal.onConfirm?.();setModal(null);}}>
                {modal.confirmText??"OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST STACK */}
      <div className="ma-toast-stack">
        {toasts.map(t=>(
          <div key={t.id} className={`toast-item ${t.type}${t.theme==="dark"?" dark":""} show`}>
            <div className="ti-icon" dangerouslySetInnerHTML={{__html:ICON_MAP[t.type]}}/>
            <div className="ti-content"><div className="ti-title">{t.title}</div>{t.message&&<div className="ti-msg">{t.message}</div>}</div>
            <button className="ti-close" onClick={()=>setToasts(prev=>prev.filter(x=>x.id!==t.id))}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

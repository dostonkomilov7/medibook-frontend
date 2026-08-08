"use client";

// The toast-stack / modal-overlay markup that lib/MediAlert.ts's
// document.getElementById() calls target. Previously this block was
// copy-pasted into 6 individual pages (and only those 6 — any other
// page calling MediAlert would have silently done nothing, since the
// target elements didn't exist). Mounting it once from the root
// layout makes MediAlert.toast()/.modal() work from every route.
export default function MediAlertWidget() {
  return (
    <>
      <div
        className="ma-modal-overlay"
        id="mediModalOverlay"
        onClick={(e) => (window as any).MediAlert?._handleOverlayClick(e)}
      >
        <div className="ma-modal-box" id="mediModalBox">
          <div className="ma-modal-icon-area" id="mediModalIconArea"></div>
          <div className="ma-modal-detail" id="mediModalDetail" style={{ display: "none" }}></div>
          <div className="ma-modal-footer" id="mediModalFooter"></div>
        </div>
      </div>
      <div className="ma-toast-stack" id="toastStack"></div>
    </>
  );
}
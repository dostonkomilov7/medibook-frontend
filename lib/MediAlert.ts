// MediAlert — Universal Alert System
// Ported from frontend/src/ts/alert.ts

const ICONS: Record<string, string> = {
  error: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  confirm: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

interface ToastOptions {
  type: string;
  title: string;
  message?: string;
  duration?: number;
  theme?: string;
}

interface ModalOptions {
  type: string;
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  theme?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const MAX_TOASTS = 4;
let toastIdCounter = 0;

function dismissToast(el: HTMLElement): void {
  el.style.opacity = '0';
  el.style.transform = 'translateX(110%)';
  setTimeout(() => el.remove(), 350);
}

function toast(opts: ToastOptions): void {
  const { type = 'info', title, message = '', duration = 4000, theme = 'light' } = opts;
  const toastStack = document.getElementById('toastStack');
  if (!toastStack) return;

  const existing = toastStack.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) {
    dismissToast(existing[0] as HTMLElement);
  }

  const id = `toast-${++toastIdCounter}`;
  const darkClass = theme === 'dark' ? ' dark-theme' : '';
  const el = document.createElement('div');
  el.id = id;
  el.className = `toast toast-${type}${darkClass}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="toast-icon">${ICONS[type] || ICONS.info}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-desc">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss" onclick="MediAlert._dismissById('${id}')">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast-progress" style="animation-duration:${duration}ms;"></div>
  `;

  toastStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => dismissToast(el), duration + 200);
}

function modal(opts: ModalOptions): void {
  const {
    type = 'info', title, message, detail,
    confirmText = 'OK', cancelText, theme = 'light',
    onConfirm, onCancel
  } = opts;

  const overlay = document.getElementById('mediModalOverlay');
  const box = document.getElementById('mediModalBox');
  const iconArea = document.getElementById('mediModalIconArea');
  const detailEl = document.getElementById('mediModalDetail');
  const footerEl = document.getElementById('mediModalFooter');
  if (!overlay || !box || !iconArea || !footerEl) return;

  if (theme === 'dark') box.classList.add('dark-theme');

  iconArea.innerHTML = `
    <div class="modal-icon modal-icon-${type}">${ICONS[type]}</div>
    <div class="modal-title">${title}</div>
    <div class="modal-message">${message}</div>
  `;

  if (detail && detailEl) {
    detailEl.style.display = '';
    detailEl.innerHTML = `<div class="modal-detail-inner">${detail}</div>`;
  }

  footerEl.innerHTML = '';
  if (cancelText) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = () => { closeModal(); onCancel?.(); };
    footerEl.appendChild(cancelBtn);
  }
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `modal-btn modal-btn-${type}`;
  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => { closeModal(); onConfirm?.(); };
  footerEl.appendChild(confirmBtn);

  overlay.classList.add('open');
}

function closeModal(): void {
  const overlay = document.getElementById('mediModalOverlay');
  const box = document.getElementById('mediModalBox');
  overlay?.classList.remove('open');
  box?.classList.remove('dark-theme');
}

function _handleOverlayClick(e: MouseEvent): void {
  if ((e.target as HTMLElement).id === 'mediModalOverlay') closeModal();
}

function _dismissById(id: string): void {
  const el = document.getElementById(id);
  if (el) dismissToast(el);
}

export const MediAlert = { toast, modal, closeModal, _handleOverlayClick, _dismissById };

if (typeof window !== 'undefined') {
  (window as any).MediAlert = MediAlert;
}

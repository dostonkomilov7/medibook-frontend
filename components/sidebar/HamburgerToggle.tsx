"use client";

/**
 * Mobile menu button for the topbar — toggles the .open class on the
 * nearest .sidebar / .sidebar-overlay (rendered by <Sidebar>). Plain
 * DOM class toggling rather than React state to match how the rest of
 * this codebase already wires up interactivity (querySelector +
 * classList), so it drops in without touching each page's render logic.
 */
export default function HamburgerToggle() {
  return (
    <button
      className="hamburger-btn"
      aria-label="Toggle menu"
      onClick={() => {
        document.querySelector(".sidebar")?.classList.toggle("open");
        document.querySelector(".sidebar-overlay")?.classList.toggle("open");
      }}
    >
      <svg viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
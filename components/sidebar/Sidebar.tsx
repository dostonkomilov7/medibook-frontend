"use client";
import { ReactNode } from "react";
import Link from "next/link";

interface SidebarProps {
  /** Small chip next to the brand name — e.g. <span className="brand-badge">MD</span>
   *  or <span className="admin-chip">Admin</span>. Omit for pages that show none. */
  badge?: ReactNode;
  /** The page's own <nav className="nav-section">...</nav> blocks and footer
   *  (sidebar-doctor / sidebar-user / sidebar-footer), unchanged from before —
   *  these differ too much page-to-page (hrefs, active item, badge classes,
   *  footer data) to force into one generic shape without risking a visual
   *  regression I can't see, so they stay as real JSX at the call site. */
  children: ReactNode;
}

/**
 * Shared shell for the 9 dashboard-style pages. Previously each page
 * hand-copied the same <aside className="sidebar"> wrapper, brand
 * block, and mobile overlay+hamburger wiring — ~20 near-identical
 * lines repeated 9 times. This is the one part of every sidebar that
 * really was byte-for-byte the same, so it's safe to share outright.
 */
export default function Sidebar({ badge, children }: SidebarProps) {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link href="/" className="brand-link">
            <div className="brand-dot">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="brand-text">MediBook</span>
          </Link>
          {badge}
        </div>
        {children}
      </aside>
      {/* Below 768px .sidebar slides off-screen (see each page's CSS);
          without this overlay there was no way to close it by tapping
          outside, and before HamburgerToggle existed there was no way
          to open it at all — see components/sidebar/HamburgerToggle.tsx. */}
      <div
        className="sidebar-overlay"
        onClick={() => {
          document.querySelector(".sidebar")?.classList.remove("open");
          document.querySelector(".sidebar-overlay")?.classList.remove("open");
        }}
      ></div>
    </>
  );
}
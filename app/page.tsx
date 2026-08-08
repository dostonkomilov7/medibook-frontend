"use client";
import Link from "next/link";
import { ReactNode, useEffect } from "react";
import "./home.style.css";

export default function HomePage() {

  useEffect(() => {
    // ── Custom Cursor ──
    const cursorDot = document.getElementById("cursorDot") as HTMLElement;
    const cursorRing = document.getElementById("cursorRing") as HTMLElement;

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
    let rafId: number;

    const moveCursor = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // dot immediately follows mouse
      if (cursorDot) {
        cursorDot.style.left = mouseX + "px";
        cursorDot.style.top = mouseY + "px";
      }
    };
    document.addEventListener("mousemove", moveCursor);

    // ring follows with lerp (0.14) via rAF — same as original HTML
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;
      if (cursorRing) {
        cursorRing.style.left = ringX + "px";
        cursorRing.style.top = ringY + "px";
      }
      rafId = requestAnimationFrame(animateRing);
    };
    rafId = requestAnimationFrame(animateRing);

    // ── Navbar scroll ──
    const navbar = document.getElementById("navbar");
    const handleScroll = () => {
      if (navbar) {
        navbar.classList.toggle("scrolled", window.scrollY > 30);
      }
    };
    window.addEventListener("scroll", handleScroll);

    // ── Hamburger ──
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.querySelector(".nav-links") as HTMLElement;
    const navCtas = document.querySelector(".nav-ctas") as HTMLElement;
    const handleHamburger = () => {
      hamburger?.classList.toggle("open");
      navLinks?.classList.toggle("mobile-open");
      navCtas?.classList.toggle("mobile-open");
    };
    hamburger?.addEventListener("click", handleHamburger);

    // ── Counter animation ──
    function animateCounter(el: HTMLElement, target: number, suffix = "") {
      let start = 0;
      const duration = 2000;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const val = Math.floor(progress * target);
        el.textContent = val.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    const patientCounter = document.getElementById("counterPatients");
    const doctorCounter = document.getElementById("counterDoctors");
    const ratingCounter = document.getElementById("counterRating");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (patientCounter) animateCounter(patientCounter, 12000, "+");
          if (doctorCounter) animateCounter(doctorCounter, 340, "");
          if (ratingCounter) animateCounter(ratingCounter, 98, "%");
          observer.disconnect();
        }
      });
    });

    const heroSection = document.querySelector(".hero");
    if (heroSection) observer.observe(heroSection);

    // ── Scroll reveal ──
    const reveals = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach((el) => revealObserver.observe(el));

    function getRating(rating: number) {
      return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))
    }

    // ── Doctors Grid ──
    const doctorsGrid = document.getElementById("doctorsGrid");
    const sampleDoctors = [
      { name: 'Dr. Sarah Rahman', initials: 'SR', specialty: 'Cardiologist', rating: 4.9, patients: 142, years: 12, bgColor: 'linear-gradient(135deg,#1D9E75,#085041)' },
      { name: 'Dr. Michael Kim', initials: 'MK', specialty: 'Dermatologist', rating: 4.7, patients: 98, years: 8, bgColor: 'linear-gradient(135deg,#378ADD,#185FA5)' },
      { name: 'Dr. Ayesha Patel', initials: 'AP', specialty: 'Neurologist', rating: 4.8, patients: 74, years: 10, bgColor: 'linear-gradient(135deg,#D85A30,#8B3515)' },
      { name: 'Dr. Thomas Nguyen', initials: 'TN', specialty: 'General Practitioner', rating: 4.6, patients: 210, years: 15, bgColor: 'linear-gradient(135deg,#EF9F27,#A56B0A)' },
    ];
    if (doctorsGrid) {
      doctorsGrid.innerHTML = sampleDoctors.map((doc) => `
      <div class="doctor-card">
        <div class="doc-card-top" style="background:${doc.bgColor};">
          <div class="doc-av-large" style="background:${doc.bgColor};">${doc.initials}</div>
        </div>
        <div class="doc-card-body">
          <div class="doc-card-name">${doc.name}</div>
          <div class="doc-card-spec">${doc.specialty}</div>
          <div class="doc-card-rating"><span class="stars">${getRating(doc.rating)}</span><span class="rating-num">${doc.rating}</span></div>
          <div class="doc-card-meta">
            <div class="dcm-item"><div class="dcm-val">${doc.patients}</div><div class="dcm-lbl">Patients</div></div>
            <div class="dcm-div"></div>
            <div class="dcm-item"><div class="dcm-val">${doc.years}yr</div><div class="dcm-lbl">Experience</div></div>
            <div class="dcm-div"></div>
            <div class="dcm-item"><div class="dcm-val">${doc.rating}</div><div class="dcm-lbl">Rating</div></div>
          </div>
          <button class="doc-book-btn" onChange="openBookingModal()">Book appointment</button>
        </div>
      </div>
      `).join("");
    }

    // ── Testimonials ──
    const testiGrid = document.getElementById("testiGrid");
    const testimonials = [
      { name: "Sarah M.", role: "Patient since 2024", text: "MediBook completely changed how I manage my healthcare. Booking is so easy!" },
      { name: "James T.", role: "Patient since 2023", text: "I got an appointment within minutes. The doctors are absolutely top-notch." },
      { name: "Priya K.", role: "Patient since 2024", text: "Amazing platform. My medical records are always accessible and up-to-date." },
    ];
    if (testiGrid) {
      testiGrid.innerHTML = testimonials.map((t) => `
        < div class="testi-card" >
          <p class="testi-text">"${t.text}"</p>
          <div class="testi-author">
            <div class="testi-av">${t.name[0]}</div>
            <div>
              <div class="testi-name">${t.name}</div>
              <div class="testi-role">${t.role}</div>
            </div>
          </div>
        </div >
        `).join("");
    }

    return () => {
      document.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("scroll", handleScroll);
      hamburger?.removeEventListener("click", handleHamburger);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Swiping/navigating "back" to this page can restore it from the
    // browser's bfcache instead of remounting it — none of the effect
    // above (cursor listeners, scroll handler, reveal observer) re-runs
    // in that case, and this page's CSS is a large unscoped
    // stylesheet, so the restored snapshot can come back visibly
    // broken until a manual refresh. Forcing a real reload on a
    // bfcache restore is the automated version of that same fix.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  function selectSlot(el: HTMLElement) {
    document.querySelectorAll(".slot").forEach((s) => s.classList.remove("selected"));
    el.classList.add("selected");
  };

  function openBookingModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.style.display = "flex";
  };

  function closeBookingModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.style.display = "none";
  };

  const handleModalOverlay = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === "bookingModal") closeBookingModal();
  };

  function submitBooking() {
    closeBookingModal();
    alert("Booking submitted!");
  };


  return (
    <>
      {/* Custom Cursor */}
      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      {/* ── NAV ── */}
      <nav id="navbar">
        <Link href="/" className="nav-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <span className="logo-text">MediBook</span>
        </Link>

        <ul className="nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#specialties">Specialties</a></li>
          <li><a href="#doctors">Doctors</a></li>
          <li><a href="#testimonials">Reviews</a></li>
        </ul>

        <div className="nav-ctas">
          <Link href="/login" className="btn-ghost-nav">Sign in</Link>
          <Link href="/register" className="btn-solid-nav">Get started</Link>
        </div>

        <button className="hamburger" id="hamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" id="home">
        <div className="hero-left">
          <div className="hero-label">
            <span></span>
            Smart Healthcare Platform
          </div>

          <h1 className="hero-title">
            <div className="line-wrap"><span className="line-inner">Your health,</span></div>
            <div className="line-wrap"><span className="line-inner"><em>beautifully</em></span></div>
            <div className="line-wrap"><span className="line-inner">managed.</span></div>
          </h1>

          <p className="hero-desc">
            Book appointments with top specialists in seconds. Access your records, connect with your care team, and take control of your wellbeing — all in one place.
          </p>

          <div className="hero-actions">
            <Link href="/register" className="btn-hero-primary">
              Book appointment
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-item">
              <span className="ti-num" id="counterPatients">0+</span>
              <span className="ti-lbl">Active<br />Patients</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <span className="ti-num" id="counterDoctors">0</span>
              <span className="ti-lbl">Expert<br />Doctors</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <span className="ti-num" id="counterRating">0%</span>
              <span className="ti-lbl">Patient<br />Satisfaction</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card-main">
            <div className="card-doc-row">
              <div className="card-doc-av">SR</div>
              <div>
                <div className="card-doc-name">Dr. Sarah Rahman</div>
                <div className="card-doc-spec">Cardiologist · ⭐ 4.9</div>
              </div>
              <span className="card-tag">
                <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
                Available
              </span>
            </div>

            <div className="card-appt-label">Select time slot — Today</div>
            <div className="time-slots" id="timeSlots">
              <div className="slot" onClick={(e) => selectSlot(e.currentTarget)}>9:00 AM</div>
              <div className="slot selected" onClick={(e) => selectSlot(e.currentTarget)}>10:30 AM</div>
              <div className="slot" onClick={(e) => selectSlot(e.currentTarget)}>1:00 PM</div>
              <div className="slot" onClick={(e) => selectSlot(e.currentTarget)}>3:30 PM</div>
              <div className="slot" onClick={(e) => selectSlot(e.currentTarget)}>4:00 PM</div>
            </div>

            <button className="card-book-btn" onClick={openBookingModal}>Confirm Booking</button>
          </div>

          <div className="float-badge fb-1">
            <div className="fb-icon g"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
            <div>
              <div className="fb-val">284</div>
              <div className="fb-lbl">Appointments today</div>
            </div>
          </div>

          <div className="float-badge fb-2">
            <div className="fb-icon b"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 011 1.18 2 2 0 012.96 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg></div>
            <div>
              <div className="fb-val">2 min</div>
              <div className="fb-lbl">Avg. booking time</div>
            </div>
          </div>

          <div className="float-badge fb-3">
            <div className="fb-icon o"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg></div>
            <div>
              <div className="fb-val">98%</div>
              <div className="fb-lbl">Satisfaction rate</div>
            </div>
          </div>
        </div>

        <div className="scroll-hint">
          <span>Scroll</span>
          <div className="scroll-track"><div className="scroll-line"></div></div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section" id="how">
        <div className="how-header reveal">
          <div>
            <div className="section-tag">Process</div>
            <h2 className="section-title">Healthcare made <em>simple.</em></h2>
          </div>
          <p>Four effortless steps from searching for a doctor to walking out of your appointment.</p>
        </div>

        <div className="how-steps reveal">
          <div className="how-step">
            <div className="step-num">01</div>
            <div className="step-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
            <div className="step-title">Find a Doctor</div>
            <div className="step-desc">Browse 340+ verified specialists across all major medical disciplines.</div>
          </div>
          <div className="how-step">
            <div className="step-num">02</div>
            <div className="step-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
            <div className="step-title">Pick a Time</div>
            <div className="step-desc">See real-time availability. Book in under 2 minutes, any time of day.</div>
          </div>
          <div className="how-step">
            <div className="step-num">03</div>
            <div className="step-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></div>
            <div className="step-title">Get Confirmed</div>
            <div className="step-desc">Receive instant confirmation. Get reminders and access prep materials.</div>
          </div>
          <div className="how-step">
            <div className="step-num">04</div>
            <div className="step-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
            <div className="step-title">See Your Doctor</div>
            <div className="step-desc">Attend your visit and access your complete health record.</div>
          </div>
        </div>
      </section>

      {/* ── SPECIALTIES ── */}
      <section className="specialties-section" id="specialties">
        <div className="spec-header reveal">
          <div className="section-tag">Specialties</div>
          <h2 className="section-title">World-class care, <em>every specialty.</em></h2>
          <p>From routine check-ups to complex procedures — our network covers every aspect of your health.</p>
        </div>

        <div className="spec-grid reveal">
          {[
            { name: "Cardiology", count: "12 specialists", color: "#D85A30", bg: "#FAECE7", path: `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>` },
            { name: "Neurology", count: "8 specialists", color: "#6366F1", bg: "#EEF2FF", path: `<path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>` },
            { name: "General Practice", count: "24 specialists", color: "#378ADD", bg: "#E6F1FB", path: `<path d="M19 8a3 3 0 110 6 3 3 0 010-6z"/><path d="M13 8V5a3 3 0 00-6 0v8a5 5 0 0010 0v-3"/>` },
            { name: "Orthopedics", count: "9 specialists", color: "#22A852", bg: "#E3F8EC", path: `<path d="M18.5 2.5a2.121 2.121 0 010 3l-6.5 6.5-3.5-3.5 6.5-6.5a2.121 2.121 0 013 0z"/><path d="M5.5 21.5a2.121 2.121 0 010-3l6.5-6.5 3.5 3.5-6.5 6.5a2.121 2.121 0 01-3 0z"/>` },
            { name: "Pediatrics", count: "14 specialists", color: "#A855F7", bg: "#F5E6FA", path: `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>` },
            { name: "Oncology", count: "7 specialists", color: "#C98227", bg: "#FAEEDA", path: `<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>` },
            { name: "Radiology", count: "6 specialists", color: "#378ADD", bg: "#E6F1FB", path: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>` },
            { name: "Emergency", count: "18 specialists", color: "#E07B3F", bg: "#FFF0E6", path: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>` },
          ].map((spec) => (
            <div className="spec-card" key={spec.name}>
              <div className="spec-icon-wrap" style={{ background: spec.bg }}>
                <svg viewBox="0 0 24 24" style={{ stroke: spec.color }} dangerouslySetInnerHTML={{ __html: spec.path }}></svg>
              </div>
              <div className="spec-name">{spec.name}</div>
              <div className="spec-count">{spec.count}</div>
              <div className="spec-arrow"><Link href="/register">Book now</Link><span>→</span></div>
            </div>
          ))
          }
        </div >
      </section >

      {/* ── DOCTORS ── */}
      < section className="doctors-section" id="doctors" >
        <div className="doctors-header reveal">
          <div>
            <div className="section-tag">Our Team</div>
            <h2 className="section-title">Meet our <em>top doctors.</em></h2>
            <p>Handpicked specialists with exceptional track records.</p>
          </div>
          <Link href="/register" className="view-all-link">
            View all 340+ doctors
            <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>
        <div className="doctors-grid reveal" id="doctorsGrid"></div>
      </section >

      {/* ── STATS BAND ── */}
      < div className="stats-band reveal" >
        <div className="stat-item"><div className="stat-big">12k+</div><div className="stat-sub">Patients served</div></div>
        <div className="stat-item"><div className="stat-big">340</div><div className="stat-sub">Expert doctors</div></div>
        <div className="stat-item"><div className="stat-big">9</div><div className="stat-sub">Departments</div></div>
        <div className="stat-item"><div className="stat-big">98%</div><div className="stat-sub">Patient satisfaction</div></div>
      </div >

      {/* ── TESTIMONIALS ── */}
      < section className="testimonials-section" id="testimonials" >
        <div className="testi-header reveal">
          <div className="section-tag">Reviews</div>
          <h2 className="section-title">Loved by <em>thousands.</em></h2>
          <p>Real stories from patients who&apos;ve transformed their healthcare experience with MediBook.</p>
        </div>
        <div className="testi-grid reveal" id="testiGrid"></div>
      </section >

      {/* ── CTA ── */}
      < section className="cta-section reveal" >
        <div className="section-tag">Get started</div>
        <h2 className="cta-title">Ready to take control of<br />your <em>health journey?</em></h2>
        <p className="cta-desc">Join 12,000+ patients already using MediBook. It&apos;s free to sign up.</p>
        <div className="cta-btns">
          <Link href="/register" className="btn-cta-primary">Create free account</Link>
          <Link href="/login" className="btn-cta-ghost">Already have an account</Link>
        </div>
      </section >

      {/* ── FOOTER ── */}
      < footer >
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="nav-logo" style={{ marginBottom: "1rem", display: "inline-flex" }}>
              <div className="logo-mark"><svg viewBox="0 0 24 24"><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="3" /></svg></div>
              <span className="logo-text">MediBook</span>
            </Link>
            <p>Smart clinic appointment platform connecting patients with world-class medical professionals.</p>
          </div>
          <div className="footer-col"><h4>Platform</h4><ul><li><a href="#">Book Appointment</a></li><li><a href="#">Find a Doctor</a></li><li><a href="#">Medical Records</a></li></ul></div>
          <div className="footer-col"><h4>Company</h4><ul><li><a href="#">About MediBook</a></li><li><a href="#">Careers</a></li><li><a href="#">Contact</a></li></ul></div>
          <div className="footer-col"><h4>Legal</h4><ul><li><a href="#">Privacy Policy</a></li><li><a href="#">Terms of Service</a></li><li><a href="#">HIPAA Compliance</a></li></ul></div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 MediBook Technologies. All rights reserved.</p>
          <div className="footer-bottom-links"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Sitemap</a></div>
        </div>
      </footer >

      {/* ── BOOKING MODAL ── */}
      < div className="modal-overlay" id="bookingModal" onClick={handleModalOverlay} >
        <div className="modal">
          <div className="modal-header">
            <div>
              <h2>Book Appointment</h2>
              <p>Fill in your details to confirm</p>
            </div>
            <button className="modal-close-btn" onClick={closeBookingModal}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="modal-body">
            <div className="m-row">
              <div className="m-field"><label>First Name</label><input className="m-input" placeholder="John" /></div>
              <div className="m-field"><label>Last Name</label><input className="m-input" placeholder="Doe" /></div>
            </div>
            <div className="m-field"><label>Email</label><input className="m-input" type="email" placeholder="you@example.com" /></div>
            <div className="m-field"><label>Phone</label><input className="m-input" type="tel" placeholder="+1 555 000 0000" /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-m-cancel" onClick={closeBookingModal}>Cancel</button>
            <button className="btn-m-submit" onClick={submitBooking}>Confirm Booking</button>
          </div>
        </div>
      </div >
    </>
  );
}

import React, { useState, useEffect } from "react";
import { auth, rtdb } from "./firebase";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { ref, get, set, child, serverTimestamp } from "firebase/database";
import logoMan11 from "./bahan/logo-man11.png";

import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminDashboard from "./components/AdminDashboard";
import LoadingSpinner from "./components/LoadingSpinner";

// ─── Icons ────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  menu:     ["M3 12h18", "M3 6h18", "M3 18h18"],
  close:    ["M18 6L6 18", "M6 6l12 12"],
  attend:   ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  announce: ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"],
  book:     ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  qr:       ["M3 3h5v5H3z", "M16 3h5v5h-5z", "M3 16h5v5H3z", "M16 16h2", "M21 16v2", "M16 21h2", "M21 19v2"],
  users:    ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75", "M9 7m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0"],
  logout:   ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
};

const requiresEmailVerification = (firebaseUser) =>
  !firebaseUser.emailVerified &&
  firebaseUser.providerData.some((p) => p.providerId === "password");

// ─── Profile Setup Modal ──────────────────────────────────────
function ProfileSetupModal({ pendingUser, onComplete }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    await onComplete(`${firstName.trim()} ${lastName.trim()}`);
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "var(--bg-card)", border: "1px solid rgba(138,99,255,0.25)",
        borderRadius: "24px", padding: "32px 28px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        position: "relative",
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img src={logoMan11} alt="MAN 11 Logo" style={{ width: "60px", height: "auto", margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
            Lengkapi Nama Anda
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Masukkan nama panjang & lengkap untuk mendaftar ke sistem.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Nama Depan
              </label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ahmad" required className="input-field" />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Nama Belakang
              </label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="Fauzi" required className="input-field" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary"
            style={{ padding: "13px", fontSize: "14px", marginTop: "6px" }}>
            {saving ? "Menyimpan..." : "Simpan & Masuk →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Email Verification Screen ────────────────────────────────
function EmailVerificationScreen({ user, onLogout }) {
  const [resendStatus, setResendStatus] = useState("");

  const handleResend = async () => {
    try {
      setResendStatus("Mengirim ulang...");
      await sendEmailVerification(auth.currentUser);
      setResendStatus("Email verifikasi telah dikirim ulang. Silakan cek inbox/spam Anda.");
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setResendStatus("Terlalu banyak permintaan. Silakan tunggu beberapa saat.");
      } else {
        setResendStatus("Gagal mengirim ulang email verifikasi.");
      }
    }
  };

  const handleReload = async () => {
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        window.location.reload();
      } else {
        setResendStatus("Email Anda belum terverifikasi. Silakan cek inbox/spam kembali.");
      }
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 60% 40%, #160f2e 0%, #0d0d1a 60%, #030310 100%)",
      padding: "16px",
    }}>
      <div style={{
        maxWidth: "400px", background: "rgba(19,19,31,0.92)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px",
        padding: "32px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{ width: "64px", height: "64px", background: "rgba(138,99,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icon d={icons.attend} size={32} color="#8a63ff" />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "12px" }}>Verifikasi Email Anda</h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: "1.6" }}>
          Link verifikasi telah dikirim ke <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>. 
          Silakan cek kotak masuk atau folder spam Anda, lalu klik link tersebut untuk mengaktifkan akun.
        </p>
        
        {resendStatus && (
          <div style={{ padding: "10px", marginBottom: "20px", background: "rgba(138,99,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "var(--purple-light)" }}>
            {resendStatus}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={handleReload} className="btn-primary" style={{ padding: "12px", fontSize: "14px", width: "100%" }}>
            Saya sudah verifikasi
          </button>
          <button onClick={handleResend} className="btn-ghost" style={{ padding: "12px", fontSize: "14px", width: "100%", background: "rgba(255,255,255,0.05)" }}>
            Kirim Ulang Email
          </button>
          <button onClick={onLogout} className="btn-ghost" style={{ padding: "12px", fontSize: "14px", width: "100%", color: "var(--red)", marginTop: "12px" }}>
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Content Component ────────────────────────────────
function SidebarContent({ user, userRole, activeSection, onNavigate, onLogout }) {
  const navItems = userRole === "admin"
    ? [
        { id: "qr", label: "QR Absensi", icon: icons.qr },
        { id: "users", label: "Data Pengguna", icon: icons.users },
        { id: "teacher_attendance", label: "Kehadiran Guru", icon: icons.attend },
        { id: "materials", label: "Materi & Konten", icon: icons.book },
      ]
    : userRole === "guru"
    ? [
        { id: "absensi_guru", label: "Absensi Guru", icon: icons.qr },
        { id: "attendance", label: "Daftar Hadir Siswa", icon: icons.attend },
        { id: "materials", label: "Kelola Materi", icon: icons.book },
        { id: "announce", label: "Pengumuman", icon: icons.announce },
      ]
    : [
        { id: "absensi", label: "Absensi QR", icon: icons.attend },
        { id: "pengumuman", label: "Pengumuman", icon: icons.announce },
        { id: "panduan", label: "Panduan Arduino", icon: icons.book },
      ];

  const roleColors = { admin: "#8a63ff", guru: "#22d3ee", murid: "#34d399" };
  const roleLabel = { admin: "Admin", guru: "Guru", murid: "Siswa" };
  const color = roleColors[userRole] || "#8a63ff";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 16px" }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <img src={logoMan11} alt="Logo MAN 11" style={{ width: "38px", height: "auto" }} />
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>Smartclass</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>MAN 11 Robotic</div>
        </div>
      </div>

      {/* User Badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 12px", marginBottom: "20px",
        background: "rgba(255,255,255,0.03)", borderRadius: "12px",
        border: "1px solid var(--border)",
      }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0, overflow: "hidden",
          background: `${color}20`, border: `1px solid ${color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "14px", fontWeight: 800, color }}>{(user.displayName || "U")[0].toUpperCase()}</span>
          }
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.displayName || "Pengguna"}
          </div>
          <span style={{
            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
            color, background: `${color}18`, padding: "1px 6px", borderRadius: "4px",
          }}>
            {roleLabel[userRole] || "Siswa"}
          </span>
        </div>
      </div>

      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
        Navigasi Menu
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "11px",
                border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                background: isActive ? `linear-gradient(135deg, ${color}20, ${color}10)` : "transparent",
                borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "13px", fontWeight: isActive ? 700 : 500,
              }}>
              <Icon d={item.icon} size={16} color={isActive ? color : "var(--text-muted)"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button onClick={onLogout} className="btn-ghost"
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", width: "100%", fontSize: "13px" }}>
        <Icon d={icons.logout} size={15} color="currentColor" />
        Keluar
      </button>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (requiresEmailVerification(firebaseUser)) {
          setUser({ ...firebaseUser, email: firebaseUser.email, needsEmailVerification: true });
          setLoading(false);
          return;
        }
        await resolveUserInRTDB(firebaseUser);
      } else {
        setUser(null); setUserRole(null); setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch or setup user in Realtime Database (rtdb)
  const resolveUserInRTDB = async (firebaseUser) => {
    setLoading(true);
    try {
      const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
      const snap = await get(userRef);

      if (!snap.exists()) {
        setPendingUser(firebaseUser);
        setUser(firebaseUser); // Allow bypass of Login screen
        setNeedsProfile(true);
        setLoading(false);
        return;
      }

      const data = snap.val();
      const role = data.role || "murid";

      setUser({
        ...firebaseUser,
        displayName: data.displayName || firebaseUser.displayName,
        role: role,
        hadir: data.hadir || false,
      });
      setUserRole(role);
      setDefaultSection(role);
    } catch (err) {
      console.error("RTDB Error:", err);
      setUser(firebaseUser); setUserRole("murid"); setDefaultSection("murid");
    } finally { setLoading(false); }
  };

  const setDefaultSection = (role) => {
    setActiveSection(role === "admin" ? "qr" : role === "guru" ? "absensi_guru" : "absensi");
  };

  const handleProfileComplete = async (fullName) => {
    if (!pendingUser) return;
    setLoading(true);
    const userRef = ref(rtdb, `users/${pendingUser.uid}`);
    const userData = {
      displayName: fullName,
      email: pendingUser.email,
      photoURL: pendingUser.photoURL || null,
      role: "murid",
      hadir: false,
      uid: pendingUser.uid,
      createdAt: Date.now(),
    };

    await set(userRef, userData);

    setUser({ ...pendingUser, displayName: fullName, role: "murid", hadir: false });
    setUserRole("murid");
    setNeedsProfile(false); setPendingUser(null);
    setDefaultSection("murid");
    setLoading(false);
  };

  const handleAuthSuccess = async (firebaseUser) => {
    if (requiresEmailVerification(firebaseUser)) {
      setUser({ ...firebaseUser, email: firebaseUser.email, needsEmailVerification: true });
      setUserRole(null);
      setLoading(false);
      return;
    }
    await resolveUserInRTDB(firebaseUser);
  };

  const handleRoleMock = async (mockUser) => {
    const userRef = ref(rtdb, `users/${mockUser.uid}`);
    await set(userRef, mockUser);
    setUser(mockUser); setUserRole(mockUser.role || "admin");
    setDefaultSection(mockUser.role || "admin");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null); setUserRole(null); setActiveSection(null);
  };

  if (loading) return <LoadingSpinner />;

  if (!user) return <Login onAuthSuccess={handleAuthSuccess} onRoleMock={handleRoleMock} />;

  if (user.needsEmailVerification) return <EmailVerificationScreen user={user} onLogout={handleLogout} />;

  // Safe Section Fallback
  const currentSection = activeSection || (userRole === "admin" ? "qr" : userRole === "guru" ? "absensi_guru" : "absensi");

  // If user needs profile setup, render a blank background with the modal on top
  if (needsProfile) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", background: "var(--bg-primary)" }}>
        <ProfileSetupModal pendingUser={pendingUser} onComplete={handleProfileComplete} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", background: "var(--bg-primary)", overflowX: "hidden" }}>
      {/* Desktop Sidebar */}
      <aside className="mobile-hide" style={{
        width: "220px", minHeight: "100vh", flexShrink: 0,
        background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)",
      }}>
        <SidebarContent
          user={user} userRole={userRole}
          activeSection={currentSection}
          onNavigate={(s) => setActiveSection(s)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)" }} onClick={() => setMobileMenuOpen(false)} />
          <div style={{ width: "260px", height: "100%", background: "var(--sidebar-bg)", zIndex: 1000, position: "relative" }}>
            <button onClick={() => setMobileMenuOpen(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#fff" }}>
              <Icon d={icons.close} size={20} />
            </button>
            <SidebarContent
              user={user} userRole={userRole}
              activeSection={currentSection}
              onNavigate={(s) => { setActiveSection(s); setMobileMenuOpen(false); }}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>
        {/* Header */}
        <header className="header-bar" style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "rgba(13,13,26,0.95)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)", padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger Button for Mobile */}
            <button onClick={() => setMobileMenuOpen(true)}
              style={{
                display: "none", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                padding: "8px", borderRadius: "8px", color: "#fff", cursor: "pointer",
              }}
              className="mobile-show-flex">
              <Icon d={icons.menu} size={20} />
            </button>

            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                {currentSection === "absensi_guru" && "Absensi Guru"}
                {currentSection === "absensi" && "Absensi QR"}
                {currentSection === "pengumuman" && "Pengumuman Kelas"}
                {currentSection === "panduan" && "Panduan Arduino"}
                {currentSection === "qr" && "Panel QR Absensi"}
                {currentSection === "users" && "Manajemen Pengguna"}
                {currentSection === "teacher_attendance" && "Kehadiran Guru"}
                {currentSection === "attendance" && "Daftar Hadir Siswa"}
                {currentSection === "materials" && "Materi & Konten"}
                {currentSection === "announce" && "Kelola Pengumuman"}
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Robotic Smartclass · MAN 11
              </p>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="main-content-padding" style={{ flex: 1, padding: "20px" }}>
          {userRole === "admin" && (
            <AdminDashboard user={user} activeSection={currentSection} />
          )}
          {userRole === "guru" && (
            <TeacherDashboard user={user} activeSection={currentSection} onNavigate={setActiveSection} />
          )}
          {userRole === "murid" && (
            <StudentDashboard user={user} activeSection={currentSection} />
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-show-flex { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

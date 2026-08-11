import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import ReCAPTCHA from "react-google-recaptcha";
import logoMan11 from "../bahan/logo-man11.png";

export default function Login({ onAuthSuccess, onRoleMock }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateRecaptcha = () => {
    if (!isRecaptchaVerified) {
      setError("Silakan centang reCAPTCHA 'Saya bukan bot' terlebih dahulu.");
      return false;
    }
    return true;
  };

  const handleGoogleLogin = async () => {
    if (!validateRecaptcha()) return;
    setLoading(true); setError("");
    try {
      // Try popup first, fallback to redirect if popup blocked
      const result = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(result.user);
    } catch (err) {
      console.warn("Popup blocked or failed, redirecting...", err);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        setError("Gagal masuk dengan Google. Silakan gunakan Login Email.");
      }
    } finally { setLoading(false); }
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!validateRecaptcha()) return;

    if (isRegisterMode) {
      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Konfirmasi password tidak cocok!");
        return;
      }
    }

    setLoading(true); setError("");

    // Admin bypass seed check
    if (!isRegisterMode && email === "admin@roboticman11.org" && password === "RoboticAdmin2026!") {
      onRoleMock({ uid: "admin-seed-001", email, displayName: "Administrator MAN 11", photoURL: null, role: "admin" });
      setLoading(false); return;
    }

    try {
      if (isRegisterMode) {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await sendEmailVerification(result.user);
        } catch (verifyErr) {
          console.warn("Email verification send failed:", verifyErr);
        }
        onAuthSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        onAuthSuccess(result.user);
      }
    } catch (err) {
      console.error("Auth error:", err.code, err.message);
      if (err.code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar. Silakan login.");
      } else if (err.code === "auth/weak-password") {
        setError("Password terlalu lemah. Gunakan minimal 6 karakter.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Pendaftaran email belum diaktifkan. Hubungi admin.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan. Coba lagi nanti.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Email atau password salah.");
      } else if (err.code === "auth/user-disabled") {
        setError("Akun dinonaktifkan. Hubungi admin.");
      } else {
        setError(`Gagal memproses: ${err.message || "Periksa koneksi atau data Anda."}`);
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 60% 40%, #160f2e 0%, #0d0d1a 60%, #030310 100%)",
      padding: "16px", position: "relative", overflow: "hidden",
    }}>
      {/* Background Orbs */}
      <div style={{
        position: "absolute", width: "280px", height: "280px", borderRadius: "50%",
        background: "rgba(138,99,255,0.08)", filter: "blur(60px)", top: "-10%", left: "-8%",
        pointerEvents: "none",
      }} />

      {/* Auth Card */}
      <div style={{
        width: "100%", maxWidth: "420px", position: "relative",
        background: "rgba(19,19,31,0.92)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "28px 24px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img src={logoMan11} alt="MAN 11 Logo" style={{ width: "58px", height: "auto", margin: "0 auto 10px" }} />
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
            Robotic Smartclass
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {isRegisterMode ? "Pendaftaran Akun Baru" : "Portal Kelas Robotik MAN 11"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: "10px 12px", marginBottom: "14px",
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "10px", color: "var(--red)", fontSize: "12px", textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Google Quick Sign-In */}
        <button onClick={handleGoogleLogin} disabled={loading} className="btn-ghost"
          style={{
            width: "100%", padding: "12px", fontSize: "13px", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            marginBottom: "16px", background: "rgba(255,255,255,0.04)",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Lanjutkan dengan Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>atau Email</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com" className="input-field" required />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Password
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="input-field" required minLength={6} />
          </div>

          {isRegisterMode && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Konfirmasi Password
              </label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" className="input-field" required />
            </div>
          )}

          {/* Real Google reCAPTCHA v2 */}
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <ReCAPTCHA
              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test sitekey, replace with real one in production
              onChange={(value) => setIsRecaptchaVerified(!!value)}
              theme="dark"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary"
            style={{ padding: "12px", fontSize: "14px", marginTop: "4px" }}>
            {loading ? "Memproses..." : (isRegisterMode ? "Daftar Akun Baru →" : "Masuk Sekarang →")}
          </button>
        </form>

        {/* Footer Link Switcher */}
        <div style={{ textAlign: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <button type="button" onClick={() => { setIsRegisterMode(!isRegisterMode); setError(""); }}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>
            {isRegisterMode ? (
              <span>Sudah memiliki akun? <strong style={{ color: "var(--purple-light)" }}>Login di sini</strong></span>
            ) : (
              <span>Belum memiliki akun? <strong style={{ color: "var(--purple-light)" }}>Daftar di sini</strong></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

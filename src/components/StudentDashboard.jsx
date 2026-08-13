import React, { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, get } from "firebase/database";
import { Html5Qrcode } from "html5-qrcode";
import { recordStudentAttendance } from "../utils/attendance";

// ─── Real QR Scanner Panel ────────────────────────────────────
function QRScanPanel({ user, onSuccess }) {
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Cleanup scanner when component unmounts
    return () => {
      if (window.html5QrCodeInstance) {
        window.html5QrCodeInstance.stop().catch(console.error);
        window.html5QrCodeInstance = null;
      }
    };
  }, []);

  const handleVerifyQRToken = async (tokenToVerify) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setErr("Silakan masukkan token atau scan QR code terlebih dahulu.");
      return;
    }

    setVerifying(true);
    setErr("");
    try {
      // Fetch active QR token from RTDB config/activeQR
      const activeQrRef = ref(rtdb, "config/activeQR");
      const snap = await get(activeQrRef);

      if (!snap.exists() || !snap.val().active) {
        setErr("Sesi absensi belum dibuka oleh instruktur / admin.");
        setVerifying(false);
        return;
      }

      const activeToken = snap.val().token;
      if (tokenToVerify.trim() !== activeToken) {
        setErr("Kode QR/Token tidak valid atau sudah kedaluwarsa!");
        setVerifying(false);
        return;
      }

      await recordStudentAttendance(user);

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      setErr("Gagal mencatat absensi. Periksa koneksi internet.");
    } finally {
      setVerifying(false);
    }
  };

  const startScanner = async () => {
    setErr("");
    setIsScanning(true);
    // Wait brief moment for the reader element to render in DOM
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        window.html5QrCodeInstance = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 180, height: 180 },
          },
          (decodedText) => {
            // Successfully scanned a token
            handleVerifyQRToken(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // verbose errors, ignore
          }
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setErr("Gagal mengakses kamera. Mohon izinkan akses kamera pada browser Anda.");
        setIsScanning(false);
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (window.html5QrCodeInstance) {
      try {
        await window.html5QrCodeInstance.stop();
      } catch (e) {
        console.error("Stop scanner error:", e);
      }
      window.html5QrCodeInstance = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="animated-card" style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "20px", padding: "24px",
    }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
          Absensi Kamera / Kode QR
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Pindai QR Code menggunakan kamera atau masukkan token absensi secara manual.
        </p>
      </div>

      {/* Scanner Viewport */}
      <div style={{
        width: "100%", maxWidth: "240px", margin: "0 auto",
        aspectRatio: "1", borderRadius: "16px",
        background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)",
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 12px",
              background: "rgba(52,211,153,0.15)", border: "2px solid var(--emerald)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--emerald)" }}>Absensi Berhasil!</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Status Anda kini HADIR.</div>
          </div>
        ) : isScanning ? (
          <div id="reader" style={{ width: "100%", height: "100%" }}></div>
        ) : (
          <>
            {/* Brackets */}
            {[
              { top: 12, left: 12, borderTop: "2px solid #8a63ff", borderLeft: "2px solid #8a63ff", borderRadius: "4px 0 0 0" },
              { top: 12, right: 12, borderTop: "2px solid #8a63ff", borderRight: "2px solid #8a63ff", borderRadius: "0 4px 0 0" },
              { bottom: 12, left: 12, borderBottom: "2px solid #8a63ff", borderLeft: "2px solid #8a63ff", borderRadius: "0 0 0 4px" },
              { bottom: 12, right: 12, borderBottom: "2px solid #8a63ff", borderRight: "2px solid #8a63ff", borderRadius: "0 0 4px 0" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: "20px", height: "20px", ...s }} />
            ))}

            <div style={{
              position: "absolute", left: "12px", right: "12px", height: "2px",
              background: "linear-gradient(90deg, transparent, #8a63ff, #22d3ee, transparent)",
              borderRadius: "999px",
              animation: "scanLine 2.5s ease-in-out infinite",
            }} />

            <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="rgba(138,99,255,0.4)" strokeWidth="3">
              <rect x="10" y="10" width="30" height="30" rx="4"/>
              <rect x="60" y="10" width="30" height="30" rx="4"/>
              <rect x="10" y="60" width="30" height="30" rx="4"/>
              <rect x="19" y="19" width="12" height="12" rx="1" fill="rgba(138,99,255,0.3)" stroke="none"/>
              <rect x="69" y="19" width="12" height="12" rx="1" fill="rgba(138,99,255,0.3)" stroke="none"/>
              <rect x="19" y="69" width="12" height="12" rx="1" fill="rgba(138,99,255,0.3)" stroke="none"/>
            </svg>
          </>
        )}
      </div>

      {!success && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {err && (
            <div style={{ fontSize: "12px", color: "var(--red)", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" value={inputToken} onChange={(e) => setInputToken(e.target.value)}
              placeholder="Masukkan Token Absen..." className="input-field" style={{ fontSize: "12px" }} />
            <button onClick={() => handleVerifyQRToken(inputToken)} disabled={verifying} className="btn-primary" style={{ padding: "0 14px", fontSize: "12px", whiteSpace: "nowrap" }}>
              {verifying ? "..." : "Absen"}
            </button>
          </div>

          {isScanning ? (
            <button onClick={stopScanner} className="btn-ghost"
              style={{ padding: "10px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(239, 68, 68, 0.1)", color: "var(--red)" }}>
              ❌ Matikan Kamera
            </button>
          ) : (
            <button onClick={startScanner} className="btn-ghost"
              style={{ padding: "10px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(138,99,255,0.1)" }}>
              📷 Pindai dengan Kamera
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attendance Calculation Component ─────────────────────────
function AttendanceChart({ isUserPresent, history }) {
  const percentage = isUserPresent ? 100 : 0;

  return (
    <div className="animated-card" style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "20px", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Ringkasan Kehadiran</h3>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Status absensi real-time</p>
        </div>
        <span className="badge badge-purple">{percentage}% Kehadiran</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--emerald)" }}>{isUserPresent ? 1 : 0}</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Hadir</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--purple)" }}>{percentage}%</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Rasio</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--red)" }}>{isUserPresent ? 0 : 1}</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Belum Absen</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
          <span>Progres Kehadiran Sesi</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{percentage}%</span>
        </div>
        <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "999px",
            background: "linear-gradient(90deg, #22d3ee, #8a63ff)",
            width: `${percentage}%`, transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      <div style={{
        marginTop: "16px", padding: "10px 12px",
        background: "rgba(138,99,255,0.07)", border: "1px solid rgba(138,99,255,0.15)",
        borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Status Sesi Hari Ini</span>
        <span className={`badge ${isUserPresent ? "badge-emerald" : "badge-red"}`}>
          {isUserPresent ? "✓ Fully Attended (100%)" : "Belum Absensi"}
        </span>
      </div>

      {/* Attendance History List */}
      <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>Riwayat Absensi</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
          {!history || Object.keys(history).length === 0 ? (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "10px", textAlign: "center" }}>
              Belum ada riwayat absensi.
            </div>
          ) : (
            Object.values(history).sort((a,b) => b.timestamp - a.timestamp).map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{h.date}</span>
                <span style={{ color: "var(--emerald)", fontWeight: 700 }}>{h.time} (Hadir)</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Student Dashboard Component ─────────────────────────
export default function StudentDashboard({ user, activeSection }) {
  const [announcements, setAnnouncements] = useState([]);
  const [guides, setGuides] = useState([]);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // 1. RTDB User listener
    const userRef = ref(rtdb, `users/${user.uid}`);
    const unsubUser = onValue(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.val());
    });

    // 2. RTDB Announcements listener
    const annRef = ref(rtdb, "announcements");
    const unsubAnn = onValue(annRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    });

    // 3. RTDB Guides listener
    const guideRef = ref(rtdb, "guides");
    const unsubGuide = onValue(guideRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        setGuides(list);
      } else {
        setGuides([]);
      }
    });

    return () => { unsubUser(); unsubAnn(); unsubGuide(); };
  }, [user.uid]);

  const isUserPresent = userData?.hadir || false;

  if (activeSection === "absensi") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Profile Info */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "46px", height: "46px", borderRadius: "12px", overflow: "hidden",
              background: "linear-gradient(135deg, rgba(138,99,255,0.3), rgba(34,211,238,0.2))",
              border: "1px solid rgba(138,99,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "18px", fontWeight: 800, color: "#8a63ff" }}>{(user.displayName || "S")[0]}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                {user.displayName || "Siswa Smartclass"}
                <span className="badge badge-purple">Siswa</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>ID User</div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--cyan)", fontWeight: 700 }}>{user.uid?.substring(0, 10)}…</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: isUserPresent ? "var(--emerald)" : "var(--red)" }}>
                {isUserPresent ? "✓ HADIR (100%)" : "Belum Absen"}
              </div>
            </div>
          </div>
        </div>

        <div className="responsive-grid-2">
          <QRScanPanel user={user} />
          <AttendanceChart isUserPresent={isUserPresent} history={userData?.history} />
        </div>
      </div>
    );
  }

  if (activeSection === "pengumuman") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Pengumuman Kelas</h3>
        {announcements.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border)" }}>
            Belum ada pengumuman terbaru dari instruktur.
          </div>
        ) : (
          announcements.map((item) => (
            <div key={item.id} className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 18px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{item.title}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>{item.content}</div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (activeSection === "panduan") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Panduan & Materi Arduino</h3>
        {guides.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border)" }}>
            Belum ada materi atau panduan yang ditambahkan.
          </div>
        ) : (
          <div className="responsive-grid-2">
            {guides.map((g) => (
              <div key={g.id} className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "18px" }}>
                <div style={{ fontSize: "22px", marginBottom: "6px" }}>{g.emoji || "📚"}</div>
                <span className="badge badge-purple" style={{ marginBottom: "6px" }}>{g.type || "Materi"}</span>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>{g.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>{g.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

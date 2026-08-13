import React, { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, set, update, get } from "firebase/database";
import { Html5Qrcode } from "html5-qrcode";
import {
  ATTENDANCE_SESSION_PATH, isPresentInSession, recordTeacherAttendance, toDateKey,
} from "../utils/attendance";

// ─── Real QR Scanner Panel (Teacher) ──────────────────────────
function QRScanPanel({ user, onSuccess }) {
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (window.html5QrCodeInstanceTeacher) {
        window.html5QrCodeInstanceTeacher.stop().catch(console.error);
        window.html5QrCodeInstanceTeacher = null;
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
      const activeQrRef = ref(rtdb, "config/activeQR");
      const snap = await get(activeQrRef);

      if (!snap.exists() || !snap.val().active) {
        setErr("Sesi absensi belum dibuka oleh admin.");
        setVerifying(false);
        return;
      }

      const activeToken = snap.val().token;
      if (tokenToVerify.trim() !== activeToken) {
        setErr("Kode QR/Token tidak valid atau sudah kedaluwarsa!");
        setVerifying(false);
        return;
      }

      await recordTeacherAttendance(user);

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
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader-teacher");
        window.html5QrCodeInstanceTeacher = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 180, height: 180 },
          },
          (decodedText) => {
            handleVerifyQRToken(decodedText);
            stopScanner();
          },
          (errorMessage) => {}
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setErr("Gagal mengakses kamera. Mohon izinkan akses kamera.");
        setIsScanning(false);
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (window.html5QrCodeInstanceTeacher) {
      try {
        await window.html5QrCodeInstanceTeacher.stop();
      } catch (e) {
        console.error(e);
      }
      window.html5QrCodeInstanceTeacher = null;
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
          Absensi Guru
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Pindai QR Code Admin atau masukkan token absensi guru untuk mencatat jam masuk.
        </p>
      </div>

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
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Jam masuk Anda telah direkam.</div>
          </div>
        ) : isScanning ? (
          <div id="reader-teacher" style={{ width: "100%", height: "100%" }}></div>
        ) : (
          <>
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

// ─── Attendance Calculation Component (Teacher) ────────────────
function AttendanceChart({ isUserPresent, history }) {
  const percentage = isUserPresent ? 100 : 0;
  return (
    <div className="animated-card" style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "20px", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Ringkasan Kehadiran Guru</h3>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Status absensi mengajar</p>
        </div>
        <span className="badge badge-cyan">{isUserPresent ? "Hadir" : "Belum Absen"}</span>
      </div>

      <div style={{
        padding: "10px 12px",
        background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.15)",
        borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Status Sesi Hari Ini</span>
        <span className={`badge ${isUserPresent ? "badge-emerald" : "badge-red"}`}>
          {isUserPresent ? "✓ Terverifikasi Masuk" : "Belum Absensi"}
        </span>
      </div>

      <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>Riwayat Mengajar</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
          {!history || Object.keys(history).length === 0 ? (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "10px", textAlign: "center" }}>
              Belum ada riwayat mengajar kelas.
            </div>
          ) : (
            Object.values(history).sort((a,b) => b.timestamp - a.timestamp).map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{h.date}</span>
                <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{h.time} (Masuk Kelas)</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard({ user, activeSection, onNavigate }) {
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Announce
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSaving, setAnnSaving] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);

  // Materials
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matType, setMatType] = useState("Tugas");
  const [matEmoji, setMatEmoji] = useState("📋");
  const [matSaving, setMatSaving] = useState(false);
  const [matSuccess, setMatSuccess] = useState(false);

  const [userData, setUserData] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Current teacher data listener
    const userRef = ref(rtdb, `users/${user.uid}`);
    const unsubUser = onValue(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.val());
    });

    // 2. All users listener
    const usersRef = ref(rtdb, "users");
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        setAllUsers(list);
      } else {
        setAllUsers([]);
      }
      setUsersLoading(false);
    });

    // 3. Current attendance session — presence expires when admin opens a new one
    const unsubSession = onValue(ref(rtdb, ATTENDANCE_SESSION_PATH), (snap) => {
      setSession(snap.exists() ? snap.val() : null);
    });

    return () => {
      unsubUser();
      unsub();
      unsubSession();
    };
  }, [user.uid]);

  const handleToggleAttend = async (uid, currentHadir) => {
    try {
      await update(ref(rtdb, `users/${uid}`), { hadir: !currentHadir });
    } catch (e) { console.error(e); }
  };

  const handleSaveAnnounce = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    setAnnSaving(true);
    try {
      const annId = `ann_${Date.now()}`;
      await set(ref(rtdb, `announcements/${annId}`), {
        title: annTitle, content: annContent,
        author: user.displayName || "Guru", createdAt: Date.now(),
      });
      setAnnTitle(""); setAnnContent("");
      setAnnSuccess(true);
      setTimeout(() => setAnnSuccess(false), 2500);
    } catch (e) { console.error(e); }
    setAnnSaving(false);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!matTitle.trim() || !matContent.trim()) return;
    setMatSaving(true);
    try {
      const guideId = `guide_${Date.now()}`;
      await set(ref(rtdb, `guides/${guideId}`), {
        title: matTitle, content: matContent, type: matType,
        emoji: matEmoji, createdAt: Date.now(),
      });
      setMatTitle(""); setMatContent(""); setMatType("Tugas"); setMatEmoji("📋");
      setMatSuccess(true);
      setTimeout(() => setMatSuccess(false), 2500);
    } catch (e) { console.error(e); }
    setMatSaving(false);
  };

  const isPresent = (u) => isPresentInSession(u, session);
  const isUserPresent = isPresentInSession(userData, session);

  if (activeSection === "absensi_guru") {
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
                : <span style={{ fontSize: "18px", fontWeight: 800, color: "#8a63ff" }}>{(user.displayName || "G")[0]}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                {user.displayName || "Instruktur / Guru"}
                <span className="badge badge-cyan">Guru</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>ID Guru</div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--cyan)", fontWeight: 700 }}>{user.uid?.substring(0, 10)}…</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: isUserPresent ? "var(--emerald)" : "var(--red)" }}>
                {isUserPresent ? "✓ HADIR" : "Belum Absen"}
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

  if (activeSection === "attendance") {
    // Filter only students (murid)
    const students = allUsers.filter(u => u.role === "murid");
    const hadirStudents = students.filter(isPresent).length;

    // Teacher must check in first
    if (!isUserPresent) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "300px" }}>
          <div style={{ fontSize: "48px" }}>🔒</div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
            Absensi Guru Diperlukan
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", maxWidth: "280px", lineHeight: "1.6" }}>
            Anda harus melakukan <strong>absensi guru</strong> terlebih dahulu sebelum bisa melihat dan mengelola daftar hadir siswa.
          </p>
          <button onClick={() => onNavigate?.("absensi_guru")} className="btn-primary" style={{ padding: "10px 20px", fontSize: "13px" }}>
            ← Kembali ke Absensi Guru
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="responsive-grid-3">
          <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--purple)" }}>{students.length}</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Total Siswa</div>
          </div>
          <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--emerald)" }}>{hadirStudents}</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Siswa Hadir</div>
          </div>
          <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--red)" }}>{students.length - hadirStudents}</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Belum Absen</div>
          </div>
        </div>

        <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflowX: "auto" }}>
          {usersLoading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Memuat data...</div>
          ) : students.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Belum ada data siswa.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "450px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Nama Siswa", "Status", "Waktu Absen", "Aksi"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((u, i) => {
                  const todayStr = toDateKey(new Date());
                  const todayAtt = u.history ? u.history[todayStr] : null;
                  const hadir = isPresent(u);
                  return (
                    <tr key={u.id} className="tr-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontSize: "11px", color: "var(--text-muted)" }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{u.displayName || "Siswa"}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email || "-"}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`badge ${hadir ? "badge-emerald" : "badge-red"}`}>
                          {hadir ? "✓ Hadir" : "Belum Absen"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {todayAtt ? todayAtt.time : "-"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {/* Guru hanya boleh MENOLAK kehadiran, tidak bisa memberi hadir */}
                        {hadir ? (
                          <button onClick={() => handleToggleAttend(u.id, hadir)}
                            style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", border: "none", cursor: "pointer", background: "rgba(248,113,113,0.12)", color: "var(--red)" }}>
                            Tolak Kehadiran
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Belum hadir</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === "announce") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Buat Pengumuman</h3>
        <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          {annSuccess && (
            <div style={{ padding: "10px", marginBottom: "12px", background: "rgba(52,211,153,0.1)", borderRadius: "8px", color: "var(--emerald)", fontSize: "12px" }}>
              ✓ Pengumuman berhasil dipublikasikan!
            </div>
          )}
          <form onSubmit={handleSaveAnnounce} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Judul Pengumuman</label>
              <input type="text" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required placeholder="Judul pengumuman..." className="input-field" />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Isi Pengumuman</label>
              <textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} required rows={4} className="input-field" placeholder="Isi pengumuman..." />
            </div>
            <button type="submit" disabled={annSaving} className="btn-primary" style={{ padding: "11px", fontSize: "13px" }}>
              {annSaving ? "Mengirim..." : "Kirim Pengumuman →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (activeSection === "materials") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Tambah Materi / Tugas</h3>
        <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          {matSuccess && (
            <div style={{ padding: "10px", marginBottom: "12px", background: "rgba(52,211,153,0.1)", borderRadius: "8px", color: "var(--emerald)", fontSize: "12px" }}>
              ✓ Materi berhasil disimpan!
            </div>
          )}
          <form onSubmit={handleSaveMaterial} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Judul</label>
              <input type="text" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required placeholder="Judul..." className="input-field" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Tipe</label>
                <select value={matType} onChange={(e) => setMatType(e.target.value)} style={{ width: "100%", padding: "10px" }}>
                  <option>Materi</option>
                  <option>Tugas</option>
                  <option>Proyek</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Icon</label>
                <input type="text" value={matEmoji} onChange={(e) => setMatEmoji(e.target.value)} className="input-field" style={{ textAlign: "center" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Deskripsi</label>
              <textarea value={matContent} onChange={(e) => setMatContent(e.target.value)} required rows={4} className="input-field" placeholder="Isi deskripsi..." />
            </div>
            <button type="submit" disabled={matSaving} className="btn-primary" style={{ padding: "11px", fontSize: "13px" }}>
              {matSaving ? "Menyimpan..." : "Simpan & Publikasikan →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

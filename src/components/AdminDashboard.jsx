import React, { useState, useEffect, useRef } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import QRCode from "qrcode";

// ─── QR Canvas ────────────────────────────────────────────────
function QRCanvas({ value }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 180, margin: 2,
        color: { dark: "#f1f0ff", light: "#13131f" },
        errorCorrectionLevel: "M",
      }).catch(() => {});
    }
  }, [value]);

  if (!value) return null;
  return <canvas ref={canvasRef} style={{ borderRadius: "12px", display: "block", margin: "0 auto" }} />;
}

// ─── Generate Token ───────────────────────────────────────────
function genToken() {
  return "QR-" + Math.random().toString(36).substr(2, 8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
}

export default function AdminDashboard({ user, activeSection }) {
  const [token, setToken] = useState(() => genToken());
  const [countdown, setCountdown] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Users from RTDB
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Material upload
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matType, setMatType] = useState("Materi");
  const [matEmoji, setMatEmoji] = useState("📚");
  const [matSaving, setMatSaving] = useState(false);
  const [matSuccess, setMatSuccess] = useState(false);

  // ── QR Timer ───────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            rotateToken();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const rotateToken = async () => {
    const newTok = genToken();
    setToken(newTok);
    setUpdating(true);
    try {
      await set(ref(rtdb, "config/activeQR"), { token: newTok, updatedAt: Date.now(), active: true });
    } catch (e) { console.error(e); }
    setTimeout(() => setUpdating(false), 400);
  };

  const handleStartQR = async () => {
    setIsActive(true);
    setCountdown(60);
    await rotateToken();
  };

  const handleStopQR = async () => {
    setIsActive(false);
    try {
      await update(ref(rtdb, "config/activeQR"), { active: false, updatedAt: Date.now() });
    } catch (e) { console.error(e); }
  };

  // ── Users Listener from Realtime Database ─────────────────
  useEffect(() => {
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
    return () => unsub();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    try {
      await update(ref(rtdb, `users/${uid}`), { role: newRole });
    } catch (e) { console.error(e); }
  };

  const handleToggleAttend = async (uid, currentHadir) => {
    try {
      await update(ref(rtdb, `users/${uid}`), { hadir: !currentHadir });
    } catch (e) { console.error(e); }
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
      setMatTitle(""); setMatContent(""); setMatType("Materi"); setMatEmoji("📚");
      setMatSuccess(true);
      setTimeout(() => setMatSuccess(false), 2500);
    } catch (e) { console.error(e); }
    setMatSaving(false);
  };

  // ── QR Section ─────────────────────────────────────────────
  if (activeSection === "qr") {
    const hadirCount = allUsers.filter(u => u.hadir).length;
    const notHadirCount = allUsers.filter(u => !u.hadir).length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Stats Grid */}
        <div className="responsive-grid-3">
          {[
            { label: "Total Terdaftar", value: allUsers.length, color: "var(--purple)" },
            { label: "Siswa Hadir", value: hadirCount, color: "var(--emerald)" },
            { label: "Belum Absen", value: notHadirCount, color: "var(--red)" },
          ].map((s, i) => (
            <div key={i} className="animated-card" style={{
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 18px",
            }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="responsive-grid-2">
          {/* QR Generator Card */}
          <div className="animated-card" style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>QR Code Generator</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Rotasi acak 60 detik</p>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={isActive ? handleStopQR : handleStartQR}
                  className={isActive ? "btn-ghost" : "btn-primary"}
                  style={{ padding: "6px 12px", fontSize: "12px" }}>
                  {isActive ? "Stop" : "Mulai"}
                </button>
                <button onClick={rotateToken} className="btn-ghost" style={{ padding: "6px 10px", fontSize: "12px" }}>
                  Refresh
                </button>
              </div>
            </div>

            <div style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "20px", textAlign: "center",
              opacity: updating ? 0.5 : 1, transition: "opacity 0.3s ease",
            }}>
              {isActive ? (
                <>
                  <div style={{
                    display: "inline-block", padding: "10px", borderRadius: "14px",
                    background: "#13131f", marginBottom: "8px",
                    boxShadow: "0 0 30px rgba(138,99,255,0.2)",
                  }}>
                    <QRCanvas value={token} />
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Token: <span style={{ fontFamily: "monospace", color: "var(--purple)", fontWeight: 700 }}>{token}</span>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "12px", color: countdown <= 10 ? "var(--red)" : "var(--cyan)", fontWeight: 700 }}>
                    Rotasi otomatis dalam {countdown} detik
                  </div>
                </>
              ) : (
                <div style={{ padding: "32px 16px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>📲</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Klik <strong>Mulai</strong> untuk membuka sesi absensi.</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Attendance List */}
          <div className="animated-card" style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Data Realtime Siswa</h3>
              <span className="badge badge-cyan">{hadirCount}/{allUsers.length} Hadir</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "320px", overflowY: "auto" }}>
              {usersLoading ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>Memuat data database...</div>
              ) : allUsers.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                  Belum ada siswa yang terdaftar di database.
                </div>
              ) : (
                allUsers.map((u) => (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 10px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
                  }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                      background: u.hadir ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${u.hadir ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: 700, color: u.hadir ? "var(--emerald)" : "var(--text-muted)",
                    }}>
                      {(u.displayName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.displayName || "Pengguna"}
                      </div>
                      <div style={{ fontSize: "10px", color: u.hadir ? "var(--emerald)" : "var(--text-muted)" }}>
                        {u.hadir ? "✓ Hadir" : "Belum hadir"}
                      </div>
                    </div>
                    <button onClick={() => handleToggleAttend(u.id, u.hadir)}
                      style={{
                        padding: "4px 8px", fontSize: "10px", fontWeight: 700,
                        borderRadius: "6px", border: "none", cursor: "pointer",
                        background: u.hadir ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)",
                        color: u.hadir ? "var(--red)" : "var(--emerald)",
                      }}>
                      {u.hadir ? "Tolak" : "Set Hadir"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Users Section ──────────────────────────────────────────
  if (activeSection === "users") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Manajemen Akun Terdaftar (Database)</h3>

        <div className="animated-card" style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflowX: "auto",
        }}>
          {allUsers.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              Belum ada data di Realtime Database.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Pengguna", "Email", "Status", "Riwayat Absensi", "Role", "Aksi"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="tr-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{u.displayName || "Pengguna"}</div>
                      <div style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--text-muted)" }}>{u.uid}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{u.email || "-"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`badge ${u.hadir ? "badge-emerald" : "badge-red"}`}>
                        {u.hadir ? "✓ Hadir" : "Belum Absen"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "80px", overflowY: "auto" }}>
                        {!u.history || Object.keys(u.history).length === 0 ? (
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Tidak ada riwayat</span>
                        ) : (
                          Object.values(u.history).sort((a,b) => b.timestamp - a.timestamp).map((h, idx) => (
                            <div key={idx} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              📅 {h.date} - <span style={{ color: "var(--purple-light)", fontWeight: 600 }}>{h.time}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <select value={u.role || "murid"} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                        <option value="murid">Murid</option>
                        <option value="guru">Guru</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => handleToggleAttend(u.id, u.hadir)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: "11px" }}>
                        {u.hadir ? "Tolak Absen" : "Set Hadir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Teacher Attendance Section ──────────────────────────────
  if (activeSection === "teacher_attendance") {
    const teachers = allUsers.filter(u => u.role === "guru");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Daftar Kehadiran Guru (Penggajian)</h3>

        <div className="animated-card" style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflowX: "auto",
        }}>
          {usersLoading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Memuat data database...</div>
          ) : teachers.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              Belum ada guru yang terdaftar di database.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "550px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Nama Guru", "Email", "Status Hari Ini", "Waktu Absen Hari Ini", "Riwayat Kehadiran", "Aksi"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todayAttendance = t.history ? t.history[todayStr] : null;
                  return (
                    <tr key={t.id} className="tr-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontSize: "11px", color: "var(--text-muted)" }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{t.displayName || "Guru"}</td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{t.email || "-"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`badge ${t.hadir ? "badge-emerald" : "badge-red"}`}>
                          {t.hadir ? "✓ Hadir" : "Belum Absen"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-primary)" }}>
                        {todayAttendance ? todayAttendance.time : "-"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "100px", overflowY: "auto" }}>
                          {!t.history || Object.keys(t.history).length === 0 ? (
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Tidak ada riwayat</span>
                          ) : (
                            Object.values(t.history).sort((a,b) => b.timestamp - a.timestamp).map((h, idx) => (
                              <div key={idx} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                📅 {h.date} - <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{h.time}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => handleToggleAttend(t.id, t.hadir)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: "11px" }}>
                          {t.hadir ? "Tolak Absen" : "Set Hadir"}
                        </button>
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

  // ── Materials Section ──────────────────────────────────────
  if (activeSection === "materials") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Upload Materi & Konten</h3>
        <div className="animated-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          {matSuccess && (
            <div style={{ padding: "10px", marginBottom: "12px", background: "rgba(52,211,153,0.1)", borderRadius: "8px", color: "var(--emerald)", fontSize: "12px" }}>
              ✓ Materi berhasil ditambahkan ke Realtime Database!
            </div>
          )}
          <form onSubmit={handleSaveMaterial} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Judul Materi</label>
              <input type="text" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required placeholder="Judul materi..." className="input-field" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Tipe</label>
                <select value={matType} onChange={(e) => setMatType(e.target.value)} style={{ width: "100%", padding: "10px" }}>
                  <option>Materi</option>
                  <option>Tugas</option>
                  <option>Proyek</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Emoji</label>
                <input type="text" value={matEmoji} onChange={(e) => setMatEmoji(e.target.value)} className="input-field" style={{ textAlign: "center" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Isi Konten</label>
              <textarea value={matContent} onChange={(e) => setMatContent(e.target.value)} required rows={4} className="input-field" placeholder="Isi materi..." />
            </div>
            <button type="submit" disabled={matSaving} className="btn-primary" style={{ padding: "11px", fontSize: "13px" }}>
              {matSaving ? "Menyimpan..." : "Simpan Materi →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

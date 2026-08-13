import { rtdb } from "../firebase";
import { ref, update } from "firebase/database";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Local date key (YYYY-MM-DD). toISOString() would shift to the previous day
// before 07:00 in WIB.
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDayName(date) {
  return DAY_NAMES[date.getDay()];
}

export function toTimeString(date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function dayNameFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

// Attendance logs live outside the user node so they survive role changes and
// are never reset automatically.
export const ATTENDANCE_PATHS = { guru: "teacherAttendance", murid: "studentAttendance" };

const defaultName = (kind) => (kind === "guru" ? "Guru" : "Murid");

export async function recordAttendance(user, { kind = "guru", source = "qr" } = {}) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const timestamp = now.getTime();
  const entry = {
    uid: user.uid,
    displayName: user.displayName || defaultName(kind),
    email: user.email || "",
    date: dateKey,
    day: toDayName(now),
    time: toTimeString(now),
    timestamp,
    source,
  };

  await update(ref(rtdb), {
    [`users/${user.uid}/hadir`]: true,
    [`users/${user.uid}/lastAttendanceTime`]: timestamp,
    [`users/${user.uid}/history/${dateKey}`]: { date: dateKey, time: entry.time, timestamp },
    [`${ATTENDANCE_PATHS[kind]}/${user.uid}/${dateKey}`]: entry,
  });

  return entry;
}

export const recordTeacherAttendance = (user, options = {}) =>
  recordAttendance(user, { ...options, kind: "guru" });

export const recordStudentAttendance = (user, options = {}) =>
  recordAttendance(user, { ...options, kind: "murid" });

// Permanently removes the given rows from both the dedicated log and the legacy
// `users/{uid}/history` node, and clears today's `hadir` flag when relevant.
export async function deleteAttendanceRows(rows, { kind = "guru" } = {}) {
  if (!rows.length) return 0;
  const todayKey = toDateKey(new Date());
  const updates = {};
  rows.forEach(({ uid, date }) => {
    updates[`${ATTENDANCE_PATHS[kind]}/${uid}/${date}`] = null;
    updates[`users/${uid}/history/${date}`] = null;
    if (date === todayKey) updates[`users/${uid}/hadir`] = false;
  });
  await update(ref(rtdb), updates);
  return rows.length;
}

// Merges the dedicated log with legacy `users/{uid}/history` entries recorded
// before the dedicated log existed, so no past attendance is dropped.
export function buildAttendanceRows(attendanceLog, users, { kind = "guru" } = {}) {
  const usersByUid = new Map(users.map((u) => [u.id, u]));
  const rows = new Map();

  Object.entries(attendanceLog || {}).forEach(([uid, dates]) => {
    Object.entries(dates || {}).forEach(([dateKey, entry]) => {
      const profile = usersByUid.get(uid);
      rows.set(`${uid}|${dateKey}`, {
        uid,
        displayName: profile?.displayName || entry.displayName || defaultName(kind),
        email: profile?.email || entry.email || "-",
        date: entry.date || dateKey,
        day: entry.day || dayNameFromDateKey(dateKey),
        time: entry.time || "-",
        timestamp: entry.timestamp || 0,
        source: entry.source || "qr",
        currentRole: profile?.role || "-",
      });
    });
  });

  const known = new Set(Object.keys(attendanceLog || {}));
  const matchesKind = (u) => (kind === "guru" ? u.role === "guru" : (u.role || "murid") === "murid");
  users
    .filter((u) => u.history && (matchesKind(u) || known.has(u.id)))
    .forEach((u) => {
      Object.entries(u.history).forEach(([dateKey, h]) => {
        const key = `${u.id}|${dateKey}`;
        if (rows.has(key)) return;
        rows.set(key, {
          uid: u.id,
          displayName: u.displayName || defaultName(kind),
          email: u.email || "-",
          date: h.date || dateKey,
          day: dayNameFromDateKey(h.date || dateKey),
          time: h.time || "-",
          timestamp: h.timestamp || 0,
          source: "legacy",
          currentRole: u.role || "-",
        });
      });
    });

  return [...rows.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function sourceLabel(source) {
  if (source === "qr") return "Scan QR";
  if (source === "manual-admin") return "Manual Admin";
  return "Riwayat Lama";
}

// Total attendance days per teacher, for the payroll recap sheet.
export function buildRecap(rows) {
  const byTeacher = new Map();
  rows.forEach((r) => {
    const current = byTeacher.get(r.uid) || {
      uid: r.uid, displayName: r.displayName, email: r.email, currentRole: r.currentRole,
      total: 0, firstDate: r.date, lastDate: r.date,
    };
    current.total += 1;
    if (r.date < current.firstDate) current.firstDate = r.date;
    if (r.date > current.lastDate) current.lastDate = r.date;
    byTeacher.set(r.uid, current);
  });
  return [...byTeacher.values()].sort((a, b) => b.total - a.total);
}

const header = (text) => ({ value: text, fontWeight: "bold", backgroundColor: "#EEEEEE", align: "center" });

export function attendanceColumns(nameLabel = "Nama Guru") {
  return [
    { header: header("No"), cell: (_, i) => ({ value: i + 1, type: Number }), width: 6 },
    { header: header(nameLabel), cell: (r) => ({ value: r.displayName }), width: 26 },
    { header: header("Email"), cell: (r) => ({ value: r.email }), width: 30 },
    { header: header("Hari"), cell: (r) => ({ value: r.day }), width: 12 },
    { header: header("Tanggal"), cell: (r) => ({ value: r.date }), width: 14 },
    { header: header("Jam Masuk"), cell: (r) => ({ value: r.time }), width: 12 },
    { header: header("Bulan"), cell: (r) => ({ value: monthLabel(r.date.slice(0, 7)) }), width: 18 },
    { header: header("Sumber"), cell: (r) => ({ value: sourceLabel(r.source) }), width: 16 },
    { header: header("Role Saat Ini"), cell: (r) => ({ value: r.currentRole }), width: 14 },
  ];
}

export function recapColumns(nameLabel = "Nama Guru") {
  return [
    { header: header("No"), cell: (_, i) => ({ value: i + 1, type: Number }), width: 6 },
    { header: header(nameLabel), cell: (r) => ({ value: r.displayName }), width: 26 },
    { header: header("Email"), cell: (r) => ({ value: r.email }), width: 30 },
    { header: header("Total Hari Hadir"), cell: (r) => ({ value: r.total, type: Number }), width: 18 },
    { header: header("Kehadiran Pertama"), cell: (r) => ({ value: r.firstDate }), width: 20 },
    { header: header("Kehadiran Terakhir"), cell: (r) => ({ value: r.lastDate }), width: 20 },
    { header: header("Role Saat Ini"), cell: (r) => ({ value: r.currentRole }), width: 14 },
  ];
}

export async function exportAttendanceToExcel(rows, fileName, { kind = "guru" } = {}) {
  const { default: writeXlsxFile, getSheetData } = await import("write-excel-file/browser");

  const nameLabel = kind === "guru" ? "Nama Guru" : "Nama Murid";
  const recapSheet = kind === "guru" ? "Rekap Penggajian" : "Rekap Kehadiran";
  const recap = buildRecap(rows);
  const recapCols = recapColumns(nameLabel);
  const detailCols = attendanceColumns(nameLabel);

  await writeXlsxFile([
    { data: getSheetData(recap, recapCols), columns: recapCols, sheet: recapSheet, stickyRowsCount: 1 },
    { data: getSheetData(rows, detailCols), columns: detailCols, sheet: "Detail Kehadiran", stickyRowsCount: 1 },
  ]).toFile(fileName);
}

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

// Writes the attendance log to `teacherAttendance/{uid}/{date}`, a record kept
// outside the user node so payroll history survives role changes.
export async function recordTeacherAttendance(user, { source = "qr" } = {}) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const timestamp = now.getTime();
  const entry = {
    uid: user.uid,
    displayName: user.displayName || "Guru",
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
    [`teacherAttendance/${user.uid}/${dateKey}`]: entry,
  });

  return entry;
}

// Merges the dedicated log with legacy `users/{uid}/history` entries recorded
// before `teacherAttendance` existed, so no past attendance is dropped.
export function buildAttendanceRows(teacherAttendance, users) {
  const usersByUid = new Map(users.map((u) => [u.id, u]));
  const rows = new Map();

  Object.entries(teacherAttendance || {}).forEach(([uid, dates]) => {
    Object.entries(dates || {}).forEach(([dateKey, entry]) => {
      const profile = usersByUid.get(uid);
      rows.set(`${uid}|${dateKey}`, {
        uid,
        displayName: profile?.displayName || entry.displayName || "Guru",
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

  const knownTeachers = new Set(Object.keys(teacherAttendance || {}));
  users
    .filter((u) => u.history && (u.role === "guru" || knownTeachers.has(u.id)))
    .forEach((u) => {
      Object.entries(u.history).forEach(([dateKey, h]) => {
        const key = `${u.id}|${dateKey}`;
        if (rows.has(key)) return;
        rows.set(key, {
          uid: u.id,
          displayName: u.displayName || "Guru",
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

export function attendanceColumns() {
  return [
    { header: header("No"), cell: (_, i) => ({ value: i + 1, type: Number }), width: 6 },
    { header: header("Nama Guru"), cell: (r) => ({ value: r.displayName }), width: 26 },
    { header: header("Email"), cell: (r) => ({ value: r.email }), width: 30 },
    { header: header("Hari"), cell: (r) => ({ value: r.day }), width: 12 },
    { header: header("Tanggal"), cell: (r) => ({ value: r.date }), width: 14 },
    { header: header("Jam Masuk"), cell: (r) => ({ value: r.time }), width: 12 },
    { header: header("Bulan"), cell: (r) => ({ value: monthLabel(r.date.slice(0, 7)) }), width: 18 },
    { header: header("Sumber"), cell: (r) => ({ value: sourceLabel(r.source) }), width: 16 },
    { header: header("Role Saat Ini"), cell: (r) => ({ value: r.currentRole }), width: 14 },
  ];
}

export function recapColumns() {
  return [
    { header: header("No"), cell: (_, i) => ({ value: i + 1, type: Number }), width: 6 },
    { header: header("Nama Guru"), cell: (r) => ({ value: r.displayName }), width: 26 },
    { header: header("Email"), cell: (r) => ({ value: r.email }), width: 30 },
    { header: header("Total Hari Hadir"), cell: (r) => ({ value: r.total, type: Number }), width: 18 },
    { header: header("Kehadiran Pertama"), cell: (r) => ({ value: r.firstDate }), width: 20 },
    { header: header("Kehadiran Terakhir"), cell: (r) => ({ value: r.lastDate }), width: 20 },
    { header: header("Role Saat Ini"), cell: (r) => ({ value: r.currentRole }), width: 14 },
  ];
}

export async function exportAttendanceToExcel(rows, fileName) {
  const { default: writeXlsxFile, getSheetData } = await import("write-excel-file/browser");

  const recap = buildRecap(rows);
  const recapCols = recapColumns();
  const detailCols = attendanceColumns();

  await writeXlsxFile([
    { data: getSheetData(recap, recapCols), columns: recapCols, sheet: "Rekap Penggajian", stickyRowsCount: 1 },
    { data: getSheetData(rows, detailCols), columns: detailCols, sheet: "Detail Kehadiran", stickyRowsCount: 1 },
  ]).toFile(fileName);
}

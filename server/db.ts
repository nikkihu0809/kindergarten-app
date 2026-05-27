import { eq, and, gte, lte, lt, sql, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  students, InsertStudent,
  teachers, InsertTeacher,
  dailyCurriculum, InsertDailyCurriculum,
  studentAttendance, InsertStudentAttendance,
  teacherLeave, InsertTeacherLeave,
  parentCommunication, InsertParentCommunication,
  incidentReports, InsertIncidentReport,
  growthRecords, InsertGrowthRecord,
  allowedEmails, InsertAllowedEmail,
  loginLogs, InsertLoginLog,
} from "../drizzle/schema";
// ENV import removed - admin role must be set manually in database

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    // Admin role must be set manually in the database
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== Students ====================
export async function listStudents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).orderBy(asc(students.className), asc(students.birthday));
}

export async function addStudent(data: InsertStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(students).values(data);
}

export async function bulkUpsertStudents(rows: InsertStudent[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all and re-insert for simplicity on bulk upload
  await db.delete(students);
  if (rows.length > 0) {
    await db.insert(students).values(rows);
  }
}

export async function deleteStudent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(students).where(eq(students.id, id));
}

export async function updateStudent(id: number, data: Partial<Omit<InsertStudent, 'id'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(students).set(data).where(eq(students.id, id));
}

// ==================== Teachers ====================
export async function listTeachers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teachers).orderBy(asc(teachers.hireDate));
}

export async function addTeacher(data: InsertTeacher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teachers).values(data);
}

export async function bulkUpsertTeachers(rows: InsertTeacher[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teachers);
  if (rows.length > 0) {
    await db.insert(teachers).values(rows);
  }
}

export async function updateTeacher(id: number, data: Partial<InsertTeacher>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teachers).set({ ...data, updatedAt: new Date() }).where(eq(teachers.id, id));
}

export async function deleteTeacher(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teachers).where(eq(teachers.id, id));
}

// ==================== Daily Curriculum ====================
export async function getCurriculumByDate(date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyCurriculum).where(eq(dailyCurriculum.date, date)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertCurriculum(data: InsertDailyCurriculum) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCurriculumByDate(data.date);
  if (existing) {
    await db.update(dailyCurriculum).set({
      courseContent: data.courseContent,
      courseCategory: data.courseCategory,
      courseDescription: data.courseDescription,
      picturebook: data.picturebook,
      song: data.song,
    }).where(eq(dailyCurriculum.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(dailyCurriculum).values(data);
    return result[0].insertId;
  }
}

export async function listCurriculumByMonth(yearMonth: string) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return db.select().from(dailyCurriculum)
    .where(and(gte(dailyCurriculum.date, startDate), lte(dailyCurriculum.date, endDate)))
    .orderBy(asc(dailyCurriculum.date));
}

export async function deleteCurriculum(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dailyCurriculum).where(eq(dailyCurriculum.id, id));
}

export async function updateCurriculum(id: number, data: Partial<InsertDailyCurriculum>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dailyCurriculum).set(data).where(eq(dailyCurriculum.id, id));
}

// ==================== Student Attendance ====================
export async function getAttendanceByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentAttendance).where(eq(studentAttendance.date, date)).orderBy(studentAttendance.createdAt);
}

export async function addAttendance(data: InsertStudentAttendance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(studentAttendance).values(data);
}

export async function updateAttendance(id: number, data: Partial<InsertStudentAttendance>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(studentAttendance).set(data).where(eq(studentAttendance.id, id));
}

export async function deleteAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(studentAttendance).where(eq(studentAttendance.id, id));
}

// ==================== Teacher Leave ====================
export async function listTeacherLeaves(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  if (startDate && endDate) {
    return db.select().from(teacherLeave)
      .where(and(gte(teacherLeave.date, startDate), lte(teacherLeave.date, endDate)))
      .orderBy(teacherLeave.date);
  }
  return db.select().from(teacherLeave).orderBy(teacherLeave.date);
}

export async function getTodayTeacherLeavesByType(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teacherLeave).where(eq(teacherLeave.date, date));
}

export async function addTeacherLeave(data: InsertTeacherLeave) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teacherLeave).values(data);
}

export async function updateTeacherLeave(id: number, data: Partial<InsertTeacherLeave>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teacherLeave).set(data).where(eq(teacherLeave.id, id));
}

export async function deleteTeacherLeave(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teacherLeave).where(eq(teacherLeave.id, id));
}

// ==================== Parent Communication ====================
export async function listParentComm(weekNumber?: number) {
  const db = await getDb();
  if (!db) return [];
  if (weekNumber !== undefined) {
    return db.select().from(parentCommunication)
      .where(eq(parentCommunication.weekNumber, weekNumber))
      .orderBy(parentCommunication.date);
  }
  return db.select().from(parentCommunication).orderBy(parentCommunication.date);
}

export async function addParentComm(data: InsertParentCommunication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(parentCommunication).values(data);
}

export async function updateParentComm(id: number, data: Partial<InsertParentCommunication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(parentCommunication).set(data).where(eq(parentCommunication.id, id));
}

export async function deleteParentComm(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(parentCommunication).where(eq(parentCommunication.id, id));
}

export async function getWeeklyCommCheck(weekNumber: number) {
  const db = await getDb();
  if (!db) return { allStudents: [], studentsWithComm: [] };
  const allStudents = await db.select({ id: students.id, name: students.name, className: students.className, enrollmentDate: students.enrollmentDate, withdrawalDate: students.withdrawalDate }).from(students);
  const comms = await db.select({ studentId: parentCommunication.studentId })
    .from(parentCommunication)
    .where(eq(parentCommunication.weekNumber, weekNumber));
  const studentsWithComm = Array.from(new Set(comms.map(c => c.studentId)));
  return { allStudents, studentsWithComm };
}

// ==================== Monthly Reports ====================

/**
 * 取得某日的打卡記錄並關聯幼生資料（用於日報表）
 * @param date - 格式 YYYY-MM-DD
 */
export async function getDailyReportData(date: string) {
  const db = await getDb();
  if (!db) return { attendance: [], students: [] };
  const attendanceRecords = await db.select().from(studentAttendance)
    .where(eq(studentAttendance.date, date))
    .orderBy(asc(studentAttendance.time));
  const allStudents = await db.select().from(students)
    .orderBy(asc(students.className), asc(students.birthday));
  return { attendance: attendanceRecords, students: allStudents };
}

/**
 * 取得某月份的所有出席記錄（用於月報表）
 * @param yearMonth - 格式 YYYY-MM
 */
export async function getMonthlyAttendance(yearMonth: string) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`; // 用 31 即可，超過的日期不存在
  return db.select().from(studentAttendance)
    .where(and(gte(studentAttendance.date, startDate), lte(studentAttendance.date, endDate)))
    .orderBy(asc(studentAttendance.date), asc(studentAttendance.studentName));
}

/**
 * 取得某月份的所有家長溝通記錄（用於月報表）
 * @param yearMonth - 格式 YYYY-MM
 */
export async function getMonthlyParentComm(yearMonth: string) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  return db.select().from(parentCommunication)
    .where(and(gte(parentCommunication.date, startDate), lte(parentCommunication.date, endDate)))
    .orderBy(asc(parentCommunication.date), asc(parentCommunication.studentName));
}

// ==================== Incident Reports ====================
export async function listIncidentReports(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  if (startDate && endDate) {
    return db.select().from(incidentReports)
      .where(and(gte(incidentReports.date, startDate), lte(incidentReports.date, endDate)))
      .orderBy(asc(incidentReports.date), asc(incidentReports.time));
  }
  return db.select().from(incidentReports).orderBy(asc(incidentReports.date), asc(incidentReports.time));
}

export async function addIncidentReport(data: InsertIncidentReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incidentReports).values(data);
}

export async function updateIncidentReport(id: number, data: Partial<InsertIncidentReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(incidentReports).set(data).where(eq(incidentReports.id, id));
}

export async function deleteIncidentReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incidentReports).where(eq(incidentReports.id, id));
}

export async function getMonthlyIncidents(yearMonth: string) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  return db.select().from(incidentReports)
    .where(and(gte(incidentReports.date, startDate), lte(incidentReports.date, endDate)))
    .orderBy(asc(incidentReports.date), asc(incidentReports.time));
}

// ==================== Student Profile ====================
export async function getStudentProfile(studentId: number) {
  const db = await getDb();
  if (!db) return { student: null, attendance: [], incidents: [], communications: [] };
  const studentResult = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = studentResult.length > 0 ? studentResult[0] : null;
  const attendanceRecords = await db.select().from(studentAttendance)
    .where(eq(studentAttendance.studentId, studentId))
    .orderBy(asc(studentAttendance.date), asc(studentAttendance.time));
  const incidentRecords = await db.select().from(incidentReports)
    .where(eq(incidentReports.studentId, studentId))
    .orderBy(asc(incidentReports.date));
  const commRecords = await db.select().from(parentCommunication)
    .where(eq(parentCommunication.studentId, studentId))
    .orderBy(asc(parentCommunication.date));
  return { student, attendance: attendanceRecords, incidents: incidentRecords, communications: commRecords };
}

export async function getTodayIncidentCount(date: string) {
  const db = await getDb();
  if (!db) return 0;
  const records = await db.select().from(incidentReports).where(eq(incidentReports.date, date));
  return records.length;
}

// ==================== Monthly Attendance Detail ====================
/**
 * 取得某月份的所有打卡記錄並關聯幼生資料（用於打卡頁面月報表匯出）
 * @param yearMonth - 格式 YYYY-MM
 */
export async function getMonthlyAttendanceDetail(yearMonth: string) {
  const db = await getDb();
  if (!db) return { attendance: [], students: [] };
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  const attendanceRecords = await db.select().from(studentAttendance)
    .where(and(gte(studentAttendance.date, startDate), lte(studentAttendance.date, endDate)))
    .orderBy(asc(studentAttendance.date), asc(studentAttendance.time));
  const allStudents = await db.select().from(students)
    .orderBy(asc(students.className), asc(students.birthday));
  return { attendance: attendanceRecords, students: allStudents };
}

// ==================== Weekly Reports ====================
export async function getWeeklyParentComm(weekNumber: number) {
  const db = await getDb();
  if (!db) return { comms: [], students: [] };
  const comms = await db.select().from(parentCommunication)
    .where(eq(parentCommunication.weekNumber, weekNumber))
    .orderBy(asc(parentCommunication.date));
  const allStudents = await db.select().from(students)
    .orderBy(asc(students.className), asc(students.birthday));
  return { comms, students: allStudents };
}

// ==================== Stat Items ====================
import { statItems, InsertStatItem, statRecords, InsertStatRecord } from "../drizzle/schema";

export async function listStatItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(statItems).orderBy(asc(statItems.createdAt));
}

export async function addStatItem(data: InsertStatItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(statItems).values(data);
  return result[0].insertId;
}

export async function updateStatItem(id: number, data: Partial<InsertStatItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(statItems).set(data).where(eq(statItems.id, id));
}

export async function deleteStatItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all related records first
  await db.delete(statRecords).where(eq(statRecords.statItemId, id));
  await db.delete(statItems).where(eq(statItems.id, id));
}

export async function getStatRecordsByItem(statItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(statRecords)
    .where(eq(statRecords.statItemId, statItemId))
    .orderBy(asc(statRecords.className), asc(statRecords.studentName));
}

export async function upsertStatRecord(data: { statItemId: number; studentId: number; studentName: string; className: string; checked: number; notes: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if record exists
  const existing = await db.select().from(statRecords)
    .where(and(eq(statRecords.statItemId, data.statItemId), eq(statRecords.studentId, data.studentId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(statRecords).set({
      checked: data.checked,
      notes: data.notes,
      studentName: data.studentName,
      className: data.className,
    }).where(eq(statRecords.id, existing[0].id));
  } else {
    await db.insert(statRecords).values(data);
  }
}

export async function bulkUpsertStatRecords(statItemId: number, records: { studentId: number; studentName: string; className: string; checked: number; notes: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const record of records) {
    await upsertStatRecord({ statItemId, ...record });
  }
}

export async function getStatSummary() {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(statItems).orderBy(asc(statItems.createdAt));
  const allStudents = await db.select().from(students);
  const totalStudentCount = allStudents.length;
  const result = [];
  for (const item of items) {
    const records = await db.select().from(statRecords).where(eq(statRecords.statItemId, item.id));
    const checkedCount = records.filter(r => r.checked === 1).length;
    result.push({ ...item, checkedCount, totalCount: totalStudentCount });
  }
  return result;
}

// ==================== Growth Records (成長檔案) ====================

export async function getGrowthRecordsByMonth(month: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(growthRecords)
    .where(eq(growthRecords.month, month))
    .orderBy(asc(growthRecords.className), asc(growthRecords.studentName));
}

export async function getGrowthRecordsByRange(startMonth: string, endMonth: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(growthRecords)
    .where(and(gte(growthRecords.month, startMonth), lte(growthRecords.month, endMonth)))
    .orderBy(asc(growthRecords.month), asc(growthRecords.className), asc(growthRecords.studentName));
}

export async function getStudentGrowthRecords(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(growthRecords)
    .where(eq(growthRecords.studentId, studentId))
    .orderBy(desc(growthRecords.month));
}

export async function getStudentPreviousGrowth(studentId: number, currentMonth: string) {
  const db = await getDb();
  if (!db) return null;
  const records = await db.select().from(growthRecords)
    .where(and(eq(growthRecords.studentId, studentId), lt(growthRecords.month, currentMonth)))
    .orderBy(desc(growthRecords.month))
    .limit(1);
  return records.length > 0 ? records[0] : null;
}

export async function upsertGrowthRecord(data: {
  month: string;
  studentId: number;
  studentName: string;
  className: string;
  height?: string;
  weight?: string;
  headCircumference?: string;
  footLength?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(growthRecords)
    .where(and(eq(growthRecords.month, data.month), eq(growthRecords.studentId, data.studentId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(growthRecords).set({
      height: data.height ?? existing[0].height,
      weight: data.weight ?? existing[0].weight,
      headCircumference: data.headCircumference ?? existing[0].headCircumference,
      footLength: data.footLength ?? existing[0].footLength,
      studentName: data.studentName,
      className: data.className,
    }).where(eq(growthRecords.id, existing[0].id));
  } else {
    await db.insert(growthRecords).values({
      month: data.month,
      studentId: data.studentId,
      studentName: data.studentName,
      className: data.className,
      height: data.height ?? "",
      weight: data.weight ?? "",
      headCircumference: data.headCircumference ?? "",
      footLength: data.footLength ?? "",
    });
  }
}

export async function getGrowthProgress(month: string) {
  const db = await getDb();
  if (!db) return { totalStudents: 0, filledStudents: 0, unfilledStudents: [] as Array<{ id: number; name: string; className: string }> };
  const allStudents = await db.select().from(students).orderBy(asc(students.className), asc(students.name));
  const records = await db.select().from(growthRecords)
    .where(eq(growthRecords.month, month));
  // A student is considered "filled" if at least one of the 4 fields has data
  const filledStudentIds = new Set(
    records
      .filter(r => r.height !== "" || r.weight !== "" || r.headCircumference !== "" || r.footLength !== "")
      .map(r => r.studentId)
  );
  const unfilledStudents = allStudents
    .filter(s => !filledStudentIds.has(s.id))
    .map(s => ({ id: s.id, name: s.name, className: s.className }));
  return {
    totalStudents: allStudents.length,
    filledStudents: filledStudentIds.size,
    unfilledStudents,
  };
}

// ==================== Meeting ====================
import { meetings, InsertMeeting, meetingMotions, InsertMeetingMotion } from "../drizzle/schema";

export async function listMeetings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetings).orderBy(desc(meetings.meetingDate));
}

export async function getMeeting(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result[0];
}

export async function addMeeting(data: InsertMeeting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(meetings).values(data);
  return result[0].insertId;
}

export async function updateMeeting(id: number, data: Partial<InsertMeeting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(meetings).set(data).where(eq(meetings.id, id));
}

export async function deleteMeeting(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(meetingMotions).where(eq(meetingMotions.meetingId, id));
  await db.delete(meetings).where(eq(meetings.id, id));
}

// ==================== Meeting Motions ====================

export async function listMotionsByMeeting(meetingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetingMotions)
    .where(eq(meetingMotions.meetingId, meetingId))
    .orderBy(asc(meetingMotions.createdAt));
}

export async function addMotion(data: InsertMeetingMotion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(meetingMotions).values(data);
  return result[0].insertId;
}

export async function updateMotion(id: number, data: Partial<InsertMeetingMotion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(meetingMotions).set(data).where(eq(meetingMotions.id, id));
}

export async function deleteMotion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(meetingMotions).where(eq(meetingMotions.id, id));
}

// ==================== Meeting Report Data Aggregation ====================

export async function aggregateMeetingReportData(params: {
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
}) {
  const db = await getDb();
  if (!db) return null;

  // 1. 本週幼生出席情況
  const thisWeekAttendance = await db.select().from(studentAttendance)
    .where(and(
      gte(studentAttendance.date, params.thisWeekStart),
      lte(studentAttendance.date, params.thisWeekEnd)
    ));
  const allStudentsList = await db.select().from(students).orderBy(asc(students.className), asc(students.name));
  
  // Count attendance days per student (checkin records)
  const checkinsByStudent = new Map<number, number>();
  const leavesByStudent = new Map<number, Array<{ date: string; leaveType: string; reason: string }>>();
  for (const rec of thisWeekAttendance) {
    if (rec.type === "checkin") {
      checkinsByStudent.set(rec.studentId, (checkinsByStudent.get(rec.studentId) || 0) + 1);
    }
    if (rec.type === "leave") {
      const arr = leavesByStudent.get(rec.studentId) || [];
      arr.push({ date: rec.date, leaveType: rec.leaveType, reason: rec.leaveReason });
      leavesByStudent.set(rec.studentId, arr);
    }
  }
  
  const studentAttendanceSummary = allStudentsList.map(s => ({
    id: s.id,
    name: s.name,
    className: s.className,
    checkinDays: checkinsByStudent.get(s.id) || 0,
    leaves: leavesByStudent.get(s.id) || [],
  }));

  // 2. 本週老師請假情況
  const teacherLeaveRecords = await db.select().from(teacherLeave)
    .where(and(
      gte(teacherLeave.date, params.thisWeekStart),
      lte(teacherLeave.date, params.thisWeekEnd)
    ));

  // 3. 上週意外傷害情況
  const lastWeekIncidents = await db.select().from(incidentReports)
    .where(and(
      gte(incidentReports.date, params.lastWeekStart),
      lte(incidentReports.date, params.lastWeekEnd)
    ));

  // 4. 上週家長溝通情況
  const lastWeekComm = await db.select().from(parentCommunication)
    .where(and(
      gte(parentCommunication.date, params.lastWeekStart),
      lte(parentCommunication.date, params.lastWeekEnd)
    ));

  // 5. 成長檔案測量進度 (current month)
  const currentMonth = params.thisWeekStart.substring(0, 7); // YYYY-MM
  const growthProgress = await getGrowthProgress(currentMonth);

  // 6. 統計功能資料狀況
  const statSummary = await getStatSummary();

  return {
    studentAttendance: studentAttendanceSummary,
    teacherLeaves: teacherLeaveRecords,
    incidents: lastWeekIncidents,
    parentComm: lastWeekComm,
    growthProgress,
    statSummary,
  };
}

// ==================== Allowed Emails (白名單) ====================
export async function listAllowedEmails() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(allowedEmails).orderBy(allowedEmails.createdAt);
}

export async function addAllowedEmail(data: { email: string; name?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const emailLower = data.email.trim().toLowerCase();
  await db.insert(allowedEmails).values({
    email: emailLower,
    name: data.name?.trim() || "",
  });
}

export async function updateAllowedEmail(data: { id: number; email?: string; name?: string; isActive?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.email !== undefined) updateSet.email = data.email.trim().toLowerCase();
  if (data.name !== undefined) updateSet.name = data.name.trim();
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(allowedEmails).set(updateSet).where(eq(allowedEmails.id, data.id));
}

export async function deleteAllowedEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(allowedEmails).where(eq(allowedEmails.id, id));
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const emailLower = email.trim().toLowerCase();
  const rows = await db.select().from(allowedEmails)
    .where(and(eq(allowedEmails.email, emailLower), eq(allowedEmails.isActive, 1)));
  return rows.length > 0;
}

export async function bulkAddAllowedEmails(emails: Array<{ email: string; name?: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (emails.length === 0) return;
  const values = emails.map(e => ({
    email: e.email.trim().toLowerCase(),
    name: e.name?.trim() || "",
  }));
  // Use INSERT IGNORE to skip duplicates
  for (const v of values) {
    try {
      await db.insert(allowedEmails).values(v);
    } catch (e: any) {
      // Skip duplicate entry errors
      if (e?.code === 'ER_DUP_ENTRY' || e?.message?.includes('Duplicate')) continue;
      throw e;
    }
  }
}

// ==================== Login Logs ====================

export async function addLoginLog(data: {
  userId?: number | null;
  email: string;
  name?: string;
  loginMethod?: string;
  success: number;
  failReason?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginLogs).values({
    userId: data.userId ?? null,
    email: data.email,
    name: data.name || "",
    loginMethod: data.loginMethod || "",
    success: data.success,
    failReason: data.failReason || "",
    ipAddress: data.ipAddress || "",
  });
}

export async function listLoginLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit);
}


// Get allowed email record by email address
export async function getAllowedEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const emailLower = email.trim().toLowerCase();
  const rows = await db.select().from(allowedEmails)
    .where(and(eq(allowedEmails.email, emailLower), eq(allowedEmails.isActive, 1)));
  return rows.length > 0 ? rows[0] : null;
}

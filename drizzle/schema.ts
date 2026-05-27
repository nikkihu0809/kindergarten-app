import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "supervisor", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 幼生名單
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  className: varchar("className", { length: 64 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  birthday: varchar("birthday", { length: 10 }).notNull().default(""),
  fatherName: varchar("fatherName", { length: 64 }).notNull().default(""),
  fatherPhone: varchar("fatherPhone", { length: 32 }).notNull().default(""),
  motherName: varchar("motherName", { length: 64 }).notNull().default(""),
  motherPhone: varchar("motherPhone", { length: 32 }).notNull().default(""),
  enrollmentDate: varchar("enrollmentDate", { length: 10 }).notNull().default(""), // 入托日期 YYYY-MM-DD
  withdrawalDate: varchar("withdrawalDate", { length: 10 }).notNull().default(""), // 離托日期 YYYY-MM-DD
  notes: varchar("notes", { length: 1000 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * 老師名單
 */
export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  title: varchar("title", { length: 64 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }).notNull().default(""),
  idNumber: varchar("idNumber", { length: 20 }).notNull().default(""), // 身分證字號
  birthday: varchar("birthday", { length: 10 }).notNull().default(""), // 出生日期 YYYY-MM-DD
  hireDate: varchar("hireDate", { length: 10 }).notNull().default(""), // 到職日期 YYYY-MM-DD
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;

/**
 * 每日課程記錄
 */
export const dailyCurriculum = mysqlTable("daily_curriculum", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  courseContent: varchar("courseContent", { length: 2000 }).notNull().default(""), // 保留舊欄位相容
  courseCategory: varchar("courseCategory", { length: 100 }).notNull().default(""), // 課程項目（下拉選單）
  courseDescription: varchar("courseDescription", { length: 2000 }).notNull().default(""), // 課程說明
  picturebook: varchar("picturebook", { length: 500 }).notNull().default(""),
  song: varchar("song", { length: 500 }).notNull().default(""),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyCurriculum = typeof dailyCurriculum.$inferSelect;
export type InsertDailyCurriculum = typeof dailyCurriculum.$inferInsert;

/**
 * 幼生出席打卡記錄
 */
export const studentAttendance = mysqlTable("student_attendance", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["checkin", "checkout", "leave"]).notNull(),
  time: varchar("time", { length: 8 }).notNull().default(""), // HH:mm:ss
  temperature: varchar("temperature", { length: 10 }).notNull().default(""),
  leaveType: varchar("leaveType", { length: 32 }).notNull().default(""), // 假別：事假/病假/傳染性病假
  leaveReason: varchar("leaveReason", { length: 500 }).notNull().default(""),
  notes: varchar("notes", { length: 1000 }).notNull().default(""), // 備註
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudentAttendance = typeof studentAttendance.$inferSelect;
export type InsertStudentAttendance = typeof studentAttendance.$inferInsert;

/**
 * 老師請假記錄
 */
export const teacherLeave = mysqlTable("teacher_leave", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  teacherId: int("teacherId").notNull(),
  teacherName: varchar("teacherName", { length: 64 }).notNull(),
  leaveType: varchar("leaveType", { length: 32 }).notNull(),
  startTime: varchar("startTime", { length: 16 }).notNull().default(""), // 起始時間 HH:mm
  endTime: varchar("endTime", { length: 16 }).notNull().default(""), // 結束時間 HH:mm
  hours: varchar("hours", { length: 10 }).notNull().default(""), // 請假時數
  reason: varchar("reason", { length: 500 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherLeave = typeof teacherLeave.$inferSelect;
export type InsertTeacherLeave = typeof teacherLeave.$inferInsert;

/**
 * 家長溝通記錄
 */
export const parentCommunication = mysqlTable("parent_communication", {
  id: int("id").autoincrement().primaryKey(),
  weekNumber: int("weekNumber").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 64 }).notNull(),
  method: mysqlEnum("method", ["interview", "phone"]).notNull(),
  teacherShare: varchar("teacherShare", { length: 2000 }).notNull().default(""),
  parentFeedback: varchar("parentFeedback", { length: 2000 }).notNull().default(""),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParentCommunication = typeof parentCommunication.$inferSelect;
export type InsertParentCommunication = typeof parentCommunication.$inferInsert;

/**
 * 意外傷害記錄
 */
export const incidentReports = mysqlTable("incident_reports", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  className: varchar("className", { length: 64 }).notNull(),
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 64 }).notNull(),
  description: varchar("description", { length: 2000 }).notNull().default(""), // 發生情況
  woundType: varchar("woundType", { length: 64 }).notNull().default(""), // 傷口描述：咬傷/撞傷/擦傷/其他
  time: varchar("time", { length: 8 }).notNull().default(""), // HH:mm:ss
  location: varchar("location", { length: 500 }).notNull().default(""), // 發生地點
  parentResponse: varchar("parentResponse", { length: 2000 }).notNull().default(""), // 家長回覆
  handler: varchar("handler", { length: 64 }).notNull().default(""), // 處理人
  trackingStatus: varchar("trackingStatus", { length: 32 }).notNull().default("觀察中"), // 追蹤狀態：觀察中/已處理/已痊癒
  photoUrls: text("photoUrls"), // JSON array of photo URLs
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IncidentReport = typeof incidentReports.$inferSelect;
export type InsertIncidentReport = typeof incidentReports.$inferInsert;

/**
 * 統計項目
 */
export const statItems = mysqlTable("stat_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // 項目名稱，例如「3月午睡棉被費」
  statusLabel: varchar("statusLabel", { length: 64 }).notNull().default("已完成"), // 自訂勾選狀態名稱
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StatItem = typeof statItems.$inferSelect;
export type InsertStatItem = typeof statItems.$inferInsert;

/**
 * 統計項目 - 幼生勾選記錄
 */
export const statRecords = mysqlTable("stat_records", {
  id: int("id").autoincrement().primaryKey(),
  statItemId: int("statItemId").notNull(), // 關聯統計項目
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 64 }).notNull(),
  className: varchar("className", { length: 64 }).notNull(),
  checked: int("checked").notNull().default(0), // 0=未勾選, 1=已勾選
  notes: varchar("notes", { length: 1000 }).notNull().default(""), // 備註
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StatRecord = typeof statRecords.$inferSelect;
export type InsertStatRecord = typeof statRecords.$inferInsert;

/**
 * 成長檔案 - 每月幼生身體測量記錄
 */
export const growthRecords = mysqlTable("growth_records", {
  id: int("id").autoincrement().primaryKey(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  studentId: int("studentId").notNull(),
  studentName: varchar("studentName", { length: 64 }).notNull(),
  className: varchar("className", { length: 64 }).notNull(),
  height: varchar("height", { length: 10 }).notNull().default(""), // 身高 cm
  weight: varchar("weight", { length: 10 }).notNull().default(""), // 體重 kg
  headCircumference: varchar("headCircumference", { length: 10 }).notNull().default(""), // 頭圍 cm
  footLength: varchar("footLength", { length: 10 }).notNull().default(""), // 腳長 cm
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthRecord = typeof growthRecords.$inferSelect;
export type InsertGrowthRecord = typeof growthRecords.$inferInsert;

/**
 * 會議記錄
 */
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // 會議名稱
  meetingDate: varchar("meetingDate", { length: 10 }).notNull(), // 會議日期 YYYY-MM-DD
  meetingTime: varchar("meetingTime", { length: 20 }).notNull().default(""), // 會議時間
  location: varchar("location", { length: 200 }).notNull().default(""), // 會議地點
  attendeeIds: text("attendeeIds"), // JSON array of teacher IDs
  recorder: varchar("recorder", { length: 64 }).notNull().default(""), // 紀錄人
  chairperson: varchar("chairperson", { length: 64 }).notNull().default(""), // 主持人
  absentees: varchar("absentees", { length: 500 }).notNull().default(""), // 請假人員
  thisWeekStart: varchar("thisWeekStart", { length: 10 }).notNull().default(""), // 本週起始 YYYY-MM-DD
  thisWeekEnd: varchar("thisWeekEnd", { length: 10 }).notNull().default(""), // 本週結束 YYYY-MM-DD
  lastWeekStart: varchar("lastWeekStart", { length: 10 }).notNull().default(""), // 上週起始 YYYY-MM-DD
  lastWeekEnd: varchar("lastWeekEnd", { length: 10 }).notNull().default(""), // 上週結束 YYYY-MM-DD
  reportData: text("reportData"), // JSON: 自動彙整的六大區塊數據快照
  wordFileUrl: varchar("wordFileUrl", { length: 1000 }).notNull().default(""), // Word 檔案 S3 URL
  trackingStatus: varchar("trackingStatus", { length: 32 }).notNull().default("待追蹤"), // 待追蹤/追蹤中/已結案
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

/**
 * 會議臨時動議
 */
export const meetingMotions = mysqlTable("meeting_motions", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(), // 關聯會議記錄
  topic: varchar("topic", { length: 500 }).notNull(), // 議題
  resolution: varchar("resolution", { length: 2000 }).notNull().default(""), // 決議
  assigneeId: int("assigneeId"), // 負責人 teacher ID
  assigneeName: varchar("assigneeName", { length: 64 }).notNull().default(""), // 負責人姓名
  dueDate: varchar("dueDate", { length: 10 }).notNull().default(""), // 預計完成日期 YYYY-MM-DD
  status: varchar("status", { length: 32 }).notNull().default("待處理"), // 待處理/處理中/已完成
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingMotion = typeof meetingMotions.$inferSelect;
export type InsertMeetingMotion = typeof meetingMotions.$inferInsert;

/**
 * 允許登入的 Email 白名單
 */
export const allowedEmails = mysqlTable("allowed_emails", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull().default(""), // 備註名稱
  isActive: int("isActive").notNull().default(1), // 1=啟用, 0=停用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type InsertAllowedEmail = typeof allowedEmails.$inferInsert;

/**
 * 登入紀錄
 */
export const loginLogs = mysqlTable("login_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 100 }).notNull().default(""),
  loginMethod: varchar("loginMethod", { length: 64 }).notNull().default(""),
  success: int("success").notNull().default(1), // 1=成功, 0=失敗
  failReason: varchar("failReason", { length: 255 }).notNull().default(""), // 失敗原因
  ipAddress: varchar("ipAddress", { length: 64 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;

/**
 * 教案記錄
 */
export const lessonPlans = mysqlTable("lesson_plans", {
  id: int("id").autoincrement().primaryKey(),
  activityName: varchar("activityName", { length: 200 }).notNull(), // 教學名稱
  subject: varchar("subject", { length: 100 }).notNull(), // 科目
  dateRange: varchar("dateRange", { length: 50 }).notNull(), // 活動日期範圍
  eventTag: varchar("eventTag", { length: 100 }).notNull().default(""), // 活動標籤（如兒童節活動）
  ages: varchar("ages", { length: 200 }).notNull().default("0-6個月,7-12個月,13-24個月,25-36個月"), // 適合月齡
  designer: varchar("designer", { length: 64 }).notNull().default(""), // 設計者
  objectives: text("objectives"), // 教學目標
  resources: text("resources"), // 教學資源
  process: text("process"), // 活動過程
  extension: text("extension"), // 延伸活動
  reflection: text("reflection"), // 教學省思
  notes: varchar("notes", { length: 2000 }).notNull().default(""), // 其他說明
  wordFileUrl: varchar("wordFileUrl", { length: 1000 }).notNull().default(""), // Word 檔案 S3 URL
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type InsertLessonPlan = typeof lessonPlans.$inferInsert;
